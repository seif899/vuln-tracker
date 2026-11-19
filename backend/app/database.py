import time
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

logger = logging.getLogger("uvicorn")

# Configure engine arguments based on database dialect
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db(max_retries: int = 15, delay_seconds: float = 2.0):
    """
    Initializes database tables with retry backoff to handle container startup latency.
    """
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"Checking database connectivity (attempt {attempt}/{max_retries})...")
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            Base.metadata.create_all(bind=engine)
            logger.info("Database connection verified and tables initialized successfully.")
            return
        except Exception as e:
            logger.warning(f"Database connection attempt {attempt} failed: {e}")
            if attempt == max_retries:
                logger.error("Could not connect to database after maximum retries.")
                raise e
            time.sleep(delay_seconds)

