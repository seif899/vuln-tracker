import os
import sys
import json
from datetime import datetime

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.database import init_db, SessionLocal
from app.models import Project, Finding, TriageStatusEnum, PriorityEnum, TriageAuditLog
from app.services.parser import parse_and_ingest_trivy_report

def seed():
    print("Initializing database...")
    init_db()
    db = SessionLocal()

    try:
        # Check if already seeded
        existing_proj = db.query(Project).filter(Project.name == "Frontend Web App").first()
        if existing_proj:
            print("Database already contains demo projects. Skipping seeding.")
            return

        print("Creating demo projects...")
        proj_frontend = Project(
            name="Frontend Web App",
            description="Customer-facing React application and frontend build assets.",
            repository_url="https://github.com/organization/frontend-web-app"
        )
        proj_backend = Project(
            name="API Gateway Service",
            description="Core routing and authentication service built with Python.",
            repository_url="https://github.com/organization/api-gateway"
        )
        db.add_all([proj_frontend, proj_backend])
        db.commit()
        db.refresh(proj_frontend)
        db.refresh(proj_backend)

        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        node_sample = os.path.join(base_dir, "samples", "trivy_sample_node.json")
        python_sample = os.path.join(base_dir, "samples", "trivy_sample_python.json")

        print("Ingesting Node.js Trivy scan...")
        with open(node_sample, "r") as f:
            node_data = json.load(f)
            parse_and_ingest_trivy_report(db, proj_frontend.id, node_data)

        print("Ingesting Python Trivy scan...")
        with open(python_sample, "r") as f:
            python_data = json.load(f)
            parse_and_ingest_trivy_report(db, proj_backend.id, python_data)

        # Simulate triage activity on some findings
        findings = db.query(Finding).all()
        for f in findings:
            if f.vulnerability and "CVE-2023-45133" in f.vulnerability.cve_id:
                # Babel critical
                f.status = TriageStatusEnum.IN_PROGRESS.value
                f.priority = PriorityEnum.P1_CRITICAL.value
                f.assigned_to = "alice.devsecops"
                f.triage_notes = "Assigned to Alice to bump babel-traverse to 7.23.2 in frontend release branch."
                audit = TriageAuditLog(
                    finding_id=f.id,
                    previous_status="OPEN",
                    new_status="IN_PROGRESS",
                    changed_by="sec-engineer",
                    notes="Investigated exploitability: build pipeline exposed to PR builds."
                )
                db.add(audit)
            elif f.vulnerability and "CVE-2022-25883" in f.vulnerability.cve_id:
                # Semver ReDoS
                f.status = TriageStatusEnum.FALSE_POSITIVE.value
                f.assigned_to = "bob.appsec"
                f.triage_notes = "Only internal static version bounds are evaluated; regex input is not user-controlled."
                audit = TriageAuditLog(
                    finding_id=f.id,
                    previous_status="OPEN",
                    new_status="FALSE_POSITIVE",
                    changed_by="bob.appsec",
                    notes="Marked as False Positive after threat modeling review."
                )
                db.add(audit)
            elif f.vulnerability and "CVE-2023-26159" in f.vulnerability.cve_id:
                # follow-redirects
                f.status = TriageStatusEnum.MITIGATED.value
                f.assigned_to = "carol.frontend"
                f.triage_notes = "Dependency upgraded to 1.15.4 in PR #342 and verified in staging."
                audit = TriageAuditLog(
                    finding_id=f.id,
                    previous_status="OPEN",
                    new_status="MITIGATED",
                    changed_by="carol.frontend",
                    notes="Remediation verified in build artifact."
                )
                db.add(audit)

        db.commit()
        print("Demo data seeded successfully with projects, scans, findings, and triage logs!")

    finally:
        db.close()

if __name__ == "__main__":
    seed()
