from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models import Finding, TriageAuditLog
from app.schemas import FindingTriageUpdate, BulkTriageRequest

def update_finding_triage(
    db: Session,
    finding_id: int,
    triage_data: FindingTriageUpdate
) -> Optional[Finding]:
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        return None

    prev_status = finding.status
    has_status_change = triage_data.status and triage_data.status.value != prev_status

    if triage_data.status:
        finding.status = triage_data.status.value
    if triage_data.priority:
        finding.priority = triage_data.priority.value
    if triage_data.assigned_to is not None:
        finding.assigned_to = triage_data.assigned_to
    if triage_data.triage_notes is not None:
        finding.triage_notes = triage_data.triage_notes

    finding.updated_at = datetime.utcnow()

    # Log audit entry if status changed or notes added
    if has_status_change or triage_data.triage_notes:
        audit = TriageAuditLog(
            finding_id=finding.id,
            previous_status=prev_status,
            new_status=finding.status,
            changed_by=triage_data.changed_by or "security-analyst",
            notes=triage_data.triage_notes or f"Status changed from {prev_status} to {finding.status}"
        )
        db.add(audit)

    db.commit()
    db.refresh(finding)
    return finding

def bulk_update_triage(
    db: Session,
    bulk_data: BulkTriageRequest
) -> int:
    findings = db.query(Finding).filter(Finding.id.in_(bulk_data.finding_ids)).all()
    count = 0
    now = datetime.utcnow()

    for finding in findings:
        prev_status = finding.status
        finding.status = bulk_data.status.value
        if bulk_data.triage_notes:
            finding.triage_notes = bulk_data.triage_notes
        finding.updated_at = now

        audit = TriageAuditLog(
            finding_id=finding.id,
            previous_status=prev_status,
            new_status=bulk_data.status.value,
            changed_by=bulk_data.changed_by or "security-analyst",
            notes=bulk_data.triage_notes or f"Bulk transition to {bulk_data.status.value}"
        )
        db.add(audit)
        count += 1

    db.commit()
    return count
