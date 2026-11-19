import csv
import io
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from app.database import get_db
from app.models import Finding, Vulnerability, Project

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/export")
def export_findings(
    format: str = Query("csv", enum=["csv", "json"]),
    project_id: Optional[int] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = (
        db.query(Finding)
        .join(Vulnerability, Finding.vulnerability_id == Vulnerability.id)
        .join(Project, Finding.project_id == Project.id)
        .options(joinedload(Finding.vulnerability), joinedload(Finding.project))
    )

    if project_id:
        query = query.filter(Finding.project_id == project_id)
    if status:
        query = query.filter(Finding.status == status.upper())
    if severity:
        query = query.filter(Vulnerability.severity == severity.upper())

    findings = query.all()

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Finding ID",
            "Project Name",
            "CVE ID",
            "Severity",
            "CVSS Score",
            "Package Name",
            "Installed Version",
            "Fixed Version",
            "Status",
            "Priority",
            "Assigned To",
            "SLA Due Date",
            "Triage Notes",
            "Primary URL"
        ])

        for f in findings:
            writer.writerow([
                f.id,
                f.project.name if f.project else "",
                f.vulnerability.cve_id if f.vulnerability else "",
                f.vulnerability.severity if f.vulnerability else "",
                f.vulnerability.cvss_score if f.vulnerability else "",
                f.package_name,
                f.installed_version,
                f.fixed_version or "None",
                f.status,
                f.priority,
                f.assigned_to or "Unassigned",
                f.sla_due_date.strftime("%Y-%m-%d") if f.sla_due_date else "",
                f.triage_notes or "",
                f.vulnerability.primary_url if f.vulnerability else ""
            ])

        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=vulnerability_report.csv"}
        )

    # JSON export
    data = [
        {
            "finding_id": f.id,
            "project": f.project.name if f.project else None,
            "cve_id": f.vulnerability.cve_id if f.vulnerability else None,
            "severity": f.vulnerability.severity if f.vulnerability else None,
            "cvss_score": f.vulnerability.cvss_score if f.vulnerability else None,
            "package": f.package_name,
            "installed_version": f.installed_version,
            "fixed_version": f.fixed_version,
            "status": f.status,
            "priority": f.priority,
            "assigned_to": f.assigned_to,
            "triage_notes": f.triage_notes,
            "created_at": f.created_at.isoformat() if f.created_at else None
        }
        for f in findings
    ]
    return data
