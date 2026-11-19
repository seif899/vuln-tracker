from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database import get_db
from app.models import Project, Finding, Vulnerability
from app.schemas import ProjectCreate, ProjectResponse

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).all()
    results = []
    for p in projects:
        # compute findings stats
        total = db.query(func.count(Finding.id)).filter(Finding.project_id == p.id).scalar() or 0
        crit = (
            db.query(func.count(Finding.id))
            .join(Vulnerability, Finding.vulnerability_id == Vulnerability.id)
            .filter(Finding.project_id == p.id, Vulnerability.severity == "CRITICAL")
            .scalar() or 0
        )
        high = (
            db.query(func.count(Finding.id))
            .join(Vulnerability, Finding.vulnerability_id == Vulnerability.id)
            .filter(Finding.project_id == p.id, Vulnerability.severity == "HIGH")
            .scalar() or 0
        )
        results.append(
            ProjectResponse(
                id=p.id,
                name=p.name,
                description=p.description,
                repository_url=p.repository_url,
                created_at=p.created_at,
                total_findings=total,
                critical_findings=crit,
                high_findings=high
            )
        )
    return results

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(project_in: ProjectCreate, db: Session = Depends(get_db)):
    existing = db.query(Project).filter(Project.name == project_in.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project with name '{project_in.name}' already exists."
        )
    project = Project(
        name=project_in.name,
        description=project_in.description,
        repository_url=project_in.repository_url
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        repository_url=project.repository_url,
        created_at=project.created_at,
        total_findings=0,
        critical_findings=0,
        high_findings=0
    )

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    
    total = db.query(func.count(Finding.id)).filter(Finding.project_id == p.id).scalar() or 0
    crit = (
        db.query(func.count(Finding.id))
        .join(Vulnerability, Finding.vulnerability_id == Vulnerability.id)
        .filter(Finding.project_id == p.id, Vulnerability.severity == "CRITICAL")
        .scalar() or 0
    )
    high = (
        db.query(func.count(Finding.id))
        .join(Vulnerability, Finding.vulnerability_id == Vulnerability.id)
        .filter(Finding.project_id == p.id, Vulnerability.severity == "HIGH")
        .scalar() or 0
    )
    return ProjectResponse(
        id=p.id,
        name=p.name,
        description=p.description,
        repository_url=p.repository_url,
        created_at=p.created_at,
        total_findings=total,
        critical_findings=crit,
        high_findings=high
    )

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(p)
    db.commit()
    return None
