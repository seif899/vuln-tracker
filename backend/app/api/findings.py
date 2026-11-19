from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc, asc
from typing import List, Optional
from app.database import get_db
from app.models import Finding, Vulnerability, Project, TriageAuditLog
from app.schemas import (
    FindingResponse,
    FindingDetailResponse,
    FindingTriageUpdate,
    BulkTriageRequest,
    VulnerabilityResponse,
    AuditLogResponse
)
from app.services.triage import update_finding_triage, bulk_update_triage

router = APIRouter(prefix="/findings", tags=["Findings & Triage"])

def finding_to_response(f: Finding) -> FindingResponse:
    now = datetime.utcnow()
    is_breached = bool(
        f.sla_due_date and f.sla_due_date < now and f.status in ["OPEN", "IN_PROGRESS"]
    )
    return FindingResponse(
        id=f.id,
        scan_id=f.scan_id,
        project_id=f.project_id,
        project_name=f.project.name if f.project else None,
        vulnerability_id=f.vulnerability_id,
        cve_id=f.vulnerability.cve_id if f.vulnerability else "",
        title=f.vulnerability.title if f.vulnerability else None,
        severity=f.vulnerability.severity if f.vulnerability else "UNKNOWN",
        cvss_score=f.vulnerability.cvss_score if f.vulnerability else None,
        package_name=f.package_name,
        installed_version=f.installed_version,
        fixed_version=f.fixed_version,
        target_path=f.target_path,
        status=f.status,
        priority=f.priority,
        assigned_to=f.assigned_to,
        triage_notes=f.triage_notes,
        sla_due_date=f.sla_due_date,
        is_sla_breached=is_breached,
        created_at=f.created_at,
        updated_at=f.updated_at
    )

@router.get("", response_model=List[FindingResponse])
def list_findings(
    project_id: Optional[int] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    is_breached: Optional[bool] = None,
    sort_by: str = Query("created_at", enum=["created_at", "severity", "cvss_score", "status"]),
    order: str = Query("desc", enum=["asc", "desc"]),
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    now = datetime.utcnow()
    query = (
        db.query(Finding)
        .join(Vulnerability, Finding.vulnerability_id == Vulnerability.id)
        .join(Project, Finding.project_id == Project.id)
        .options(joinedload(Finding.vulnerability), joinedload(Finding.project))
    )

    if project_id:
        query = query.filter(Finding.project_id == project_id)
    if severity:
        query = query.filter(Vulnerability.severity == severity.upper())
    if status:
        query = query.filter(Finding.status == status.upper())
    if is_breached is True:
        query = query.filter(
            Finding.sla_due_date < now,
            Finding.status.in_(["OPEN", "IN_PROGRESS"])
        )
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Vulnerability.cve_id.ilike(search_pattern),
                Finding.package_name.ilike(search_pattern),
                Vulnerability.title.ilike(search_pattern),
                Project.name.ilike(search_pattern)
            )
        )

    # Sorting
    if sort_by == "cvss_score":
        sort_col = Vulnerability.cvss_score
    elif sort_by == "severity":
        sort_col = Vulnerability.severity
    elif sort_by == "status":
        sort_col = Finding.status
    else:
        sort_col = Finding.created_at

    if order == "asc":
        query = query.order_by(asc(sort_col))
    else:
        query = query.order_by(desc(sort_col))

    findings = query.offset(offset).limit(limit).all()
    return [finding_to_response(f) for f in findings]

@router.get("/{finding_id}", response_model=FindingDetailResponse)
def get_finding(finding_id: int, db: Session = Depends(get_db)):
    f = (
        db.query(Finding)
        .options(
            joinedload(Finding.vulnerability),
            joinedload(Finding.project),
            joinedload(Finding.audit_logs)
        )
        .filter(Finding.id == finding_id)
        .first()
    )
    if not f:
        raise HTTPException(status_code=404, detail="Finding not found")

    base_resp = finding_to_response(f)
    vuln_resp = VulnerabilityResponse(
        id=f.vulnerability.id,
        cve_id=f.vulnerability.cve_id,
        title=f.vulnerability.title,
        description=f.vulnerability.description,
        severity=f.vulnerability.severity,
        cvss_score=f.vulnerability.cvss_score,
        cvss_vector=f.vulnerability.cvss_vector,
        primary_url=f.vulnerability.primary_url
    )
    audit_resps = [
        AuditLogResponse(
            id=log.id,
            finding_id=log.finding_id,
            previous_status=log.previous_status,
            new_status=log.new_status,
            changed_by=log.changed_by,
            notes=log.notes,
            created_at=log.created_at
        )
        for log in sorted(f.audit_logs, key=lambda x: x.created_at, reverse=True)
    ]

    return FindingDetailResponse(
        **base_resp.model_dump(),
        vulnerability=vuln_resp,
        audit_logs=audit_resps
    )

@router.patch("/{finding_id}/triage", response_model=FindingResponse)
def triage_finding(
    finding_id: int,
    triage_data: FindingTriageUpdate,
    db: Session = Depends(get_db)
):
    finding = update_finding_triage(db, finding_id, triage_data)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    return finding_to_response(finding)

@router.post("/bulk-triage")
def bulk_triage(
    bulk_data: BulkTriageRequest,
    db: Session = Depends(get_db)
):
    updated_count = bulk_update_triage(db, bulk_data)
    return {
        "updated_count": updated_count,
        "new_status": bulk_data.status.value,
        "message": f"Successfully updated {updated_count} findings to {bulk_data.status.value}"
    }

@router.delete("/{finding_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_finding(finding_id: int, db: Session = Depends(get_db)):
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    db.delete(finding)
    db.commit()
    return None
