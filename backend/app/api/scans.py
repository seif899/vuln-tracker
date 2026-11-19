import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.database import get_db
from app.models import Scan, Project
from app.schemas import ScanResponse, ScanUploadResponse
from app.services.parser import parse_and_ingest_trivy_report

router = APIRouter(prefix="/scans", tags=["Scans"])

@router.get("", response_model=List[ScanResponse])
def list_scans(
    project_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(Scan)
    if project_id:
        query = query.filter(Scan.project_id == project_id)
    return query.order_by(Scan.created_at.desc()).offset(offset).limit(limit).all()

@router.get("/{scan_id}", response_model=ScanResponse)
def get_scan(scan_id: int, db: Session = Depends(get_db)):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan

@router.post("/upload", response_model=ScanUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_trivy_scan(
    project_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Ingest a Trivy JSON vulnerability report file.
    """
    try:
        content = await file.read()
        trivy_json = json.loads(content.decode("utf-8"))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid JSON file format: {str(e)}"
        )

    try:
        result = parse_and_ingest_trivy_report(db, project_id=project_id, trivy_json=trivy_json)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse and store scan: {str(e)}"
        )

@router.post("/ingest-json", response_model=ScanUploadResponse, status_code=status.HTTP_201_CREATED)
def ingest_trivy_json(
    project_id: int,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """
    Ingest raw Trivy JSON sent directly via API body (e.g., from a CI/CD pipeline).
    """
    try:
        result = parse_and_ingest_trivy_report(db, project_id=project_id, trivy_json=payload)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest scan payload: {str(e)}"
        )
