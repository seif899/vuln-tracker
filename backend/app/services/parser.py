from datetime import datetime, timedelta
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models import Project, Scan, Vulnerability, Finding, SeverityEnum, PriorityEnum, TriageStatusEnum
from app.config import settings

def extract_cvss_info(vuln_data: Dict[str, Any]) -> Tuple[float, str]:
    """
    Extracts CVSS v3 score and vector from Trivy's nested CVSS structure.
    Trivy often provides sources like 'nvd', 'redhat', 'ghsa'.
    """
    cvss_obj = vuln_data.get("CVSS", {})
    if not isinstance(cvss_obj, dict):
        return None, None

    # Priority order for CVSS sources: nvd -> ghsa -> redhat -> any
    for source in ["nvd", "ghsa", "redhat"]:
        if source in cvss_obj and isinstance(cvss_obj[source], dict):
            src_dict = cvss_obj[source]
            score = src_dict.get("V3Score")
            vector = src_dict.get("V3Vector")
            if score is not None:
                try:
                    return float(score), vector
                except (ValueError, TypeError):
                    pass

    # Fallback to first available source in CVSS dict
    for source, data in cvss_obj.items():
        if isinstance(data, dict):
            score = data.get("V3Score") or data.get("V2Score")
            vector = data.get("V3Vector") or data.get("V2Vector")
            if score is not None:
                try:
                    return float(score), vector
                except (ValueError, TypeError):
                    pass

    return None, None

def calculate_sla_due_date(severity: str) -> datetime:
    """Calculates SLA remediation due date based on severity."""
    now = datetime.utcnow()
    sev = severity.upper()
    if sev == SeverityEnum.CRITICAL.value:
        return now + timedelta(days=settings.SLA_CRITICAL_DAYS)
    elif sev == SeverityEnum.HIGH.value:
        return now + timedelta(days=settings.SLA_HIGH_DAYS)
    elif sev == SeverityEnum.MEDIUM.value:
        return now + timedelta(days=settings.SLA_MEDIUM_DAYS)
    else:
        return now + timedelta(days=settings.SLA_LOW_DAYS)

def severity_to_priority(severity: str) -> str:
    sev = severity.upper()
    if sev == "CRITICAL":
        return PriorityEnum.P1_CRITICAL.value
    elif sev == "HIGH":
        return PriorityEnum.P2_HIGH.value
    elif sev == "MEDIUM":
        return PriorityEnum.P3_MEDIUM.value
    else:
        return PriorityEnum.P4_LOW.value

def normalize_severity(severity: str) -> str:
    s = (severity or "UNKNOWN").upper()
    if s in [e.value for e in SeverityEnum]:
        return s
    return SeverityEnum.UNKNOWN.value

def parse_and_ingest_trivy_report(
    db: Session,
    project_id: int,
    trivy_json: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Parses a Trivy JSON report (SchemaVersion 2 or similar) and stores the Scan,
    Vulnerabilities, and Findings in the database.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError(f"Project with ID {project_id} does not exist.")

    artifact_name = trivy_json.get("ArtifactName", "unnamed-artifact")
    artifact_type = trivy_json.get("ArtifactType", "unknown")
    
    # Initialize counts
    counts = {
        "CRITICAL": 0,
        "HIGH": 0,
        "MEDIUM": 0,
        "LOW": 0,
        "UNKNOWN": 0
    }
    
    # Create the Scan record
    scan = Scan(
        project_id=project.id,
        scanner="trivy",
        artifact_name=artifact_name,
        artifact_type=artifact_type,
        status="completed"
    )
    db.add(scan)
    db.flush() # obtain scan.id

    results = trivy_json.get("Results", [])
    total_findings = 0
    new_vulns_count = 0

    for result in results:
        target_path = result.get("Target", "unknown-target")
        vulnerabilities = result.get("Vulnerabilities", [])
        
        for vuln_data in vulnerabilities:
            cve_id = vuln_data.get("VulnerabilityID")
            if not cve_id:
                continue

            raw_severity = vuln_data.get("Severity", "UNKNOWN")
            severity = normalize_severity(raw_severity)
            counts[severity] = counts.get(severity, 0) + 1
            total_findings += 1

            cvss_score, cvss_vector = extract_cvss_info(vuln_data)
            
            # Find or create canonical Vulnerability entry
            vulnerability = db.query(Vulnerability).filter(Vulnerability.cve_id == cve_id).first()
            if not vulnerability:
                vulnerability = Vulnerability(
                    cve_id=cve_id,
                    title=vuln_data.get("Title") or f"Vulnerability {cve_id}",
                    description=vuln_data.get("Description"),
                    severity=severity,
                    cvss_score=cvss_score,
                    cvss_vector=cvss_vector,
                    primary_url=vuln_data.get("PrimaryURL")
                )
                db.add(vulnerability)
                db.flush()
                new_vulns_count += 1
            else:
                # Update CVSS or URLs if previously missing
                if cvss_score is not None and vulnerability.cvss_score is None:
                    vulnerability.cvss_score = cvss_score
                    vulnerability.cvss_vector = cvss_vector
                if not vulnerability.primary_url and vuln_data.get("PrimaryURL"):
                    vulnerability.primary_url = vuln_data.get("PrimaryURL")

            # Check if this exact finding already exists for this project and package
            pkg_name = vuln_data.get("PkgName", "unknown-package")
            installed_version = vuln_data.get("InstalledVersion", "unknown")
            fixed_version = vuln_data.get("FixedVersion")

            existing_finding = (
                db.query(Finding)
                .filter(
                    Finding.project_id == project.id,
                    Finding.vulnerability_id == vulnerability.id,
                    Finding.package_name == pkg_name
                )
                .first()
            )

            if existing_finding:
                # Update existing finding with latest scan reference and versions
                existing_finding.scan_id = scan.id
                existing_finding.installed_version = installed_version
                existing_finding.fixed_version = fixed_version
                existing_finding.target_path = target_path
                existing_finding.updated_at = datetime.utcnow()
                # If was marked mitigated but detected again, reopen
                if existing_finding.status == TriageStatusEnum.MITIGATED.value:
                    existing_finding.status = TriageStatusEnum.OPEN.value
            else:
                # Create a new Finding
                sla_due = calculate_sla_due_date(severity)
                priority = severity_to_priority(severity)
                finding = Finding(
                    scan_id=scan.id,
                    project_id=project.id,
                    vulnerability_id=vulnerability.id,
                    package_name=pkg_name,
                    installed_version=installed_version,
                    fixed_version=fixed_version,
                    target_path=target_path,
                    status=TriageStatusEnum.OPEN.value,
                    priority=priority,
                    sla_due_date=sla_due,
                    is_sla_breached=False
                )
                db.add(finding)

    # Update scan metrics
    scan.total_vulnerabilities = total_findings
    scan.critical_count = counts["CRITICAL"]
    scan.high_count = counts["HIGH"]
    scan.medium_count = counts["MEDIUM"]
    scan.low_count = counts["LOW"]
    
    db.commit()

    return {
        "scan_id": scan.id,
        "project_id": project.id,
        "total_findings_ingested": total_findings,
        "new_vulnerabilities_registered": new_vulns_count,
        "severity_breakdown": counts,
        "message": f"Successfully ingested {total_findings} findings for '{project.name}'."
    }
