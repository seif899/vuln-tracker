import pytest
import os
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models import Project, Finding, Vulnerability, TriageStatusEnum, PriorityEnum
from app.services.parser import parse_and_ingest_trivy_report
from app.services.triage import update_finding_triage, bulk_update_triage
from app.schemas import FindingTriageUpdate, BulkTriageRequest
from app.services.metrics import get_metrics_summary

# Test in-memory SQLite database
TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture
def db_session():
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def sample_project(db_session):
    p = Project(name="Test Service", description="Test project for unit tests")
    db_session.add(p)
    db_session.commit()
    db_session.refresh(p)
    return p

@pytest.fixture
def trivy_json_payload():
    return {
        "SchemaVersion": 2,
        "ArtifactName": "test-service:1.0",
        "ArtifactType": "container_image",
        "Results": [
            {
                "Target": "package.json",
                "Class": "lang-pkgs",
                "Type": "npm",
                "Vulnerabilities": [
                    {
                        "VulnerabilityID": "CVE-2023-99999",
                        "PkgName": "vuln-pkg",
                        "InstalledVersion": "1.0.0",
                        "FixedVersion": "1.0.1",
                        "Severity": "CRITICAL",
                        "Title": "Critical Arbitrary Code Execution",
                        "Description": "Test vulnerability description",
                        "PrimaryURL": "https://example.com/cve-2023-99999",
                        "CVSS": {
                            "nvd": {
                                "V3Vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
                                "V3Score": 9.8
                            }
                        }
                    },
                    {
                        "VulnerabilityID": "CVE-2023-88888",
                        "PkgName": "medium-pkg",
                        "InstalledVersion": "2.0.0",
                        "FixedVersion": "2.1.0",
                        "Severity": "MEDIUM",
                        "Title": "Medium Information Disclosure",
                        "PrimaryURL": "https://example.com/cve-2023-88888",
                        "CVSS": {
                            "ghsa": {
                                "V3Score": 5.5
                            }
                        }
                    }
                ]
            }
        ]
    }

def test_trivy_ingestion(db_session, sample_project, trivy_json_payload):
    result = parse_and_ingest_trivy_report(db_session, sample_project.id, trivy_json_payload)
    assert result["total_findings_ingested"] == 2
    assert result["new_vulnerabilities_registered"] == 2
    assert result["severity_breakdown"]["CRITICAL"] == 1
    assert result["severity_breakdown"]["MEDIUM"] == 1

    findings = db_session.query(Finding).filter(Finding.project_id == sample_project.id).all()
    assert len(findings) == 2

    crit_finding = next(f for f in findings if f.vulnerability.cve_id == "CVE-2023-99999")
    assert crit_finding.status == TriageStatusEnum.OPEN.value
    assert crit_finding.priority == PriorityEnum.P1_CRITICAL.value
    assert crit_finding.vulnerability.cvss_score == 9.8
    assert crit_finding.sla_due_date is not None

def test_triage_lifecycle(db_session, sample_project, trivy_json_payload):
    parse_and_ingest_trivy_report(db_session, sample_project.id, trivy_json_payload)
    finding = db_session.query(Finding).first()
    assert finding is not None

    # Update to IN_PROGRESS
    update = FindingTriageUpdate(
        status=TriageStatusEnum.IN_PROGRESS,
        assigned_to="devsecops-lead",
        triage_notes="Patch in testing pipeline",
        changed_by="analyst1"
    )
    updated = update_finding_triage(db_session, finding.id, update)
    assert updated.status == TriageStatusEnum.IN_PROGRESS.value
    assert updated.assigned_to == "devsecops-lead"
    assert len(updated.audit_logs) == 1
    assert updated.audit_logs[0].previous_status == "OPEN"
    assert updated.audit_logs[0].new_status == "IN_PROGRESS"

def test_bulk_triage(db_session, sample_project, trivy_json_payload):
    parse_and_ingest_trivy_report(db_session, sample_project.id, trivy_json_payload)
    finding_ids = [f.id for f in db_session.query(Finding).all()]

    bulk_req = BulkTriageRequest(
        finding_ids=finding_ids,
        status=TriageStatusEnum.ACCEPTED_RISK,
        triage_notes="Approved by risk committee",
        changed_by="ciso"
    )
    count = bulk_update_triage(db_session, bulk_req)
    assert count == 2

    for f in db_session.query(Finding).all():
        assert f.status == TriageStatusEnum.ACCEPTED_RISK.value

def test_metrics_calculation(db_session, sample_project, trivy_json_payload):
    parse_and_ingest_trivy_report(db_session, sample_project.id, trivy_json_payload)
    metrics = get_metrics_summary(db_session)
    assert metrics["total_projects"] == 1
    assert metrics["total_scans"] == 1
    assert metrics["total_findings"] == 2
    assert metrics["open_findings"] == 2
    assert metrics["by_severity"]["CRITICAL"] == 1
    assert metrics["by_severity"]["MEDIUM"] == 1
