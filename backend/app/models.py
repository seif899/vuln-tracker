from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum
from app.database import Base

class SeverityEnum(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    UNKNOWN = "UNKNOWN"

class TriageStatusEnum(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    MITIGATED = "MITIGATED"
    FALSE_POSITIVE = "FALSE_POSITIVE"
    ACCEPTED_RISK = "ACCEPTED_RISK"

class PriorityEnum(str, enum.Enum):
    P1_CRITICAL = "P1_CRITICAL"
    P2_HIGH = "P2_HIGH"
    P3_MEDIUM = "P3_MEDIUM"
    P4_LOW = "P4_LOW"

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    repository_url = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    scans = relationship("Scan", back_populates="project", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="project", cascade="all, delete-orphan")

class Scan(Base):
    __tablename__ = "scans"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    scanner = Column(String(50), default="trivy")
    artifact_name = Column(String(255), nullable=True)
    artifact_type = Column(String(100), nullable=True)
    scan_target = Column(String(255), nullable=True)
    status = Column(String(50), default="completed")
    
    total_vulnerabilities = Column(Integer, default=0)
    critical_count = Column(Integer, default=0)
    high_count = Column(Integer, default=0)
    medium_count = Column(Integer, default=0)
    low_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="scans")
    findings = relationship("Finding", back_populates="scan", cascade="all, delete-orphan")

class Vulnerability(Base):
    __tablename__ = "vulnerabilities"

    id = Column(Integer, primary_key=True, index=True)
    cve_id = Column(String(100), unique=True, index=True, nullable=False)
    title = Column(String(512), nullable=True)
    description = Column(Text, nullable=True)
    severity = Column(String(20), default=SeverityEnum.UNKNOWN.value, index=True)
    cvss_score = Column(Float, nullable=True)
    cvss_vector = Column(String(255), nullable=True)
    primary_url = Column(String(512), nullable=True)

    findings = relationship("Finding", back_populates="vulnerability")

class Finding(Base):
    __tablename__ = "findings"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    vulnerability_id = Column(Integer, ForeignKey("vulnerabilities.id"), nullable=False)
    
    package_name = Column(String(255), index=True, nullable=False)
    installed_version = Column(String(100), nullable=False)
    fixed_version = Column(String(255), nullable=True)
    target_path = Column(String(512), nullable=True)
    
    status = Column(String(30), default=TriageStatusEnum.OPEN.value, index=True)
    priority = Column(String(30), default=PriorityEnum.P2_HIGH.value)
    assigned_to = Column(String(100), nullable=True)
    triage_notes = Column(Text, nullable=True)
    
    sla_due_date = Column(DateTime, nullable=True)
    is_sla_breached = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="findings")
    scan = relationship("Scan", back_populates="findings")
    vulnerability = relationship("Vulnerability", back_populates="findings")
    audit_logs = relationship("TriageAuditLog", back_populates="finding", cascade="all, delete-orphan")

class TriageAuditLog(Base):
    __tablename__ = "triage_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    finding_id = Column(Integer, ForeignKey("findings.id"), nullable=False)
    previous_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=False)
    changed_by = Column(String(100), default="security-analyst")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    finding = relationship("Finding", back_populates="audit_logs")
