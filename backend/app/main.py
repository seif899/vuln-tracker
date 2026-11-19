from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import init_db
from app.api import projects, scans, findings, metrics, reports

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables upon application startup
    init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Automated Vulnerability Triage & Remediation Tracker API for Trivy scans",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(projects.router, prefix=settings.API_V1_STR)
app.include_router(scans.router, prefix=settings.API_V1_STR)
app.include_router(findings.router, prefix=settings.API_V1_STR)
app.include_router(metrics.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)

@app.get("/healthz", tags=["System"])
def health_check():
    return {"status": "ok", "app": settings.PROJECT_NAME, "version": "1.0.0"}

@app.get("/", tags=["System"])
def root():
    return {
        "message": "Welcome to the Automated Vulnerability Triage & Remediation Tracker API",
        "docs_url": "/docs",
        "health_check": "/healthz"
    }
