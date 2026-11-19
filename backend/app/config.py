import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Automated Vulnerability Triage & Remediation Tracker"
    API_V1_STR: str = "/api/v1"
    
    # Database URL: uses environment variable or defaults to SQLite for local development,
    # or PostgreSQL when running in Docker Compose.
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./vuln_tracker.db"
    )
    
    # CORS Origins for frontend connectivity
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    # Severity SLAs (in days)
    SLA_CRITICAL_DAYS: int = 7
    SLA_HIGH_DAYS: int = 14
    SLA_MEDIUM_DAYS: int = 30
    SLA_LOW_DAYS: int = 90

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
