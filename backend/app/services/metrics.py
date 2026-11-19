from datetime import datetime, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Project, Scan, Finding, Vulnerability, TriageStatusEnum, SeverityEnum

def get_metrics_summary(db: Session) -> Dict[str, Any]:
    now = datetime.utcnow()
    
    total_projects = db.query(func.count(Project.id)).scalar() or 0
    total_scans = db.query(func.count(Scan.id)).scalar() or 0
    total_findings = db.query(func.count(Finding.id)).scalar() or 0
    
    open_findings = db.query(func.count(Finding.id)).filter(
        Finding.status.in_([TriageStatusEnum.OPEN.value, TriageStatusEnum.IN_PROGRESS.value])
    ).scalar() or 0

    remediated_findings = db.query(func.count(Finding.id)).filter(
        Finding.status == TriageStatusEnum.MITIGATED.value
    ).scalar() or 0

    # Count SLA breached findings
    sla_breached = db.query(func.count(Finding.id)).filter(
        Finding.status.in_([TriageStatusEnum.OPEN.value, TriageStatusEnum.IN_PROGRESS.value]),
        Finding.sla_due_date < now
    ).scalar() or 0

    # Counts by severity
    severity_counts = {
        SeverityEnum.CRITICAL.value: 0,
        SeverityEnum.HIGH.value: 0,
        SeverityEnum.MEDIUM.value: 0,
        SeverityEnum.LOW.value: 0,
        SeverityEnum.UNKNOWN.value: 0
    }
    
    sev_rows = (
        db.query(Vulnerability.severity, func.count(Finding.id))
        .join(Finding, Finding.vulnerability_id == Vulnerability.id)
        .group_by(Vulnerability.severity)
        .all()
    )
    for sev, count in sev_rows:
        if sev in severity_counts:
            severity_counts[sev] = count

    # Counts by status
    status_counts = {
        TriageStatusEnum.OPEN.value: 0,
        TriageStatusEnum.IN_PROGRESS.value: 0,
        TriageStatusEnum.MITIGATED.value: 0,
        TriageStatusEnum.FALSE_POSITIVE.value: 0,
        TriageStatusEnum.ACCEPTED_RISK.value: 0
    }
    status_rows = (
        db.query(Finding.status, func.count(Finding.id))
        .group_by(Finding.status)
        .all()
    )
    for stat, count in status_rows:
        if stat in status_counts:
            status_counts[stat] = count

    return {
        "total_projects": total_projects,
        "total_scans": total_scans,
        "total_findings": total_findings,
        "open_findings": open_findings,
        "remediated_findings": remediated_findings,
        "sla_breached_findings": sla_breached,
        "by_severity": severity_counts,
        "by_status": status_counts
    }

def get_metrics_trends(db: Session, days: int = 14) -> List[Dict[str, Any]]:
    """
    Generates time-series trend of scans and vulnerability levels.
    """
    scans = (
        db.query(Scan)
        .order_by(Scan.created_at.asc())
        .limit(30)
        .all()
    )
    
    if not scans:
        # Provide sample historical points if fresh database
        today = datetime.utcnow().date()
        return [
            {
                "date": (today - timedelta(days=i)).strftime("%b %d"),
                "critical": 0,
                "high": 0,
                "medium": 0,
                "low": 0
            }
            for i in reversed(range(7))
        ]

    trends = []
    for scan in scans:
        trends.append({
            "date": scan.created_at.strftime("%b %d, %H:%M"),
            "critical": scan.critical_count or 0,
            "high": scan.high_count or 0,
            "medium": scan.medium_count or 0,
            "low": scan.low_count or 0
        })
    return trends
