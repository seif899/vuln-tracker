from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import MetricsSummaryResponse, MetricsTrendResponse
from app.services.metrics import get_metrics_summary, get_metrics_trends

router = APIRouter(prefix="/metrics", tags=["Metrics"])

@router.get("/summary", response_model=MetricsSummaryResponse)
def get_summary(db: Session = Depends(get_db)):
    return get_metrics_summary(db)

@router.get("/trends", response_model=MetricsTrendResponse)
def get_trends(days: int = 14, db: Session = Depends(get_db)):
    trends = get_metrics_trends(db, days=days)
    return {"trends": trends}
