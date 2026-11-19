from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models import SeverityEnum, TriageStatusEnum, PriorityEnum

# --- Project Schemas ---
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    repository_url: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime
    total_findings: Optional[int] = 0
    critical_findings: Optional[int] = 0
    high_findings: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

# --- Vulnerability Schemas ---
class VulnerabilityBase(BaseModel):
    cve_id: str
    title: Optional[str] = None
    description: Optional[str] = None
    severity: str
    cvss_score: Optional[float] = None
    cvss_vector: Optional[str] = None
    primary_url: Optional[str] = None

class VulnerabilityResponse(VulnerabilityBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

# --- Audit Log Schemas ---
class AuditLogResponse(BaseModel):
    id: int
    finding_id: int
    previous_status: Optional[str] = None
    new_status: str
    changed_by: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Finding Schemas ---
class FindingResponse(BaseModel):
    id: int
    scan_id: int
    project_id: int
    project_name: Optional[str] = None
    vulnerability_id: int
    cve_id: str
    title: Optional[str] = None
    severity: str
    cvss_score: Optional[float] = None
    package_name: str
    installed_version: str
    fixed_version: Optional[str] = None
    target_path: Optional[str] = None
    status: str
    priority: str
    assigned_to: Optional[str] = None
    triage_notes: Optional[str] = None
    sla_due_date: Optional[datetime] = None
    is_sla_breached: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class FindingDetailResponse(FindingResponse):
    vulnerability: VulnerabilityResponse
    audit_logs: List[AuditLogResponse] = []

class FindingTriageUpdate(BaseModel):
    status: Optional[TriageStatusEnum] = None
    priority: Optional[PriorityEnum] = None
    assigned_to: Optional[str] = None
    triage_notes: Optional[str] = None
    changed_by: Optional[str] = "security-analyst"

class BulkTriageRequest(BaseModel):
    finding_ids: List[int]
    status: TriageStatusEnum
    triage_notes: Optional[str] = None
    changed_by: Optional[str] = "security-analyst"

# --- Scan Schemas ---
class ScanResponse(BaseModel):
    id: int
    project_id: int
    scanner: str
    artifact_name: Optional[str] = None
    artifact_type: Optional[str] = None
    scan_target: Optional[str] = None
    status: str
    total_vulnerabilities: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ScanUploadResponse(BaseModel):
    scan_id: int
    project_id: int
    total_findings_ingested: int
    new_vulnerabilities_registered: int
    severity_breakdown: Dict[str, int]
    message: str

# --- Metrics Schemas ---
class MetricsSummaryResponse(BaseModel):
    total_projects: int
    total_scans: int
    total_findings: int
    open_findings: int
    remediated_findings: int
    sla_breached_findings: int
    by_severity: Dict[str, int]
    by_status: Dict[str, int]

class SeverityTrendPoint(BaseModel):
    date: str
    critical: int
    high: int
    medium: int
    low: int

class MetricsTrendResponse(BaseModel):
    trends: List[SeverityTrendPoint]
