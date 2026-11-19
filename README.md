# Automated Vulnerability Triage & Remediation Tracker

A centralized vulnerability management and security findings tracking platform built with **FastAPI**, **React**, **PostgreSQL**, **Docker**, and **Trivy**.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_18-61DAFB?logo=react)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_16-336791?logo=postgresql)](https://www.postgresql.org)
[![Trivy](https://img.shields.io/badge/Scanner-Trivy-00599C?logo=aquasec)](https://trivy.dev)
[![Docker](https://img.shields.io/badge/Containerization-Docker_Compose-2496ED?logo=docker)](https://www.docker.com)

---

## 📌 Architecture & System Design

```
+-------------------------------------------------------------+
|                     TRIVY SCANNER ENGINE                    |
|  (Container Image / Filesystem / Git Dependency Scanner)    |
+------------------------------+------------------------------+
                               |  Generates Trivy JSON Output
                               v
+-------------------------------------------------------------+
|                  FASTAPI BACKEND SERVICE                    |
|  - Ingestion Engine (Schema Parser & Canonical CVE Mapper)  |
|  - Prioritization & SLA Engine (CVSS v3 + Severity)         |
|  - Triage State Machine & Audit Trail                       |
|  - Analytics & Audit Reporting API (CSV / JSON)             |
+-------------------+---------------------+-------------------+
                    |                     |
                    v                     v
+-----------------------------+ +-----------------------------+
|       POSTGRESQL DB         | |        REACT UI (SPA)       |
| - Projects & Workloads      | | - Security Posture KPIs     |
| - Scans & Findings          | | - Filterable Triage Table   |
| - Canonical CVE Data        | | - Triage Workflow Modal     |
| - Audit Logs & History      | | - Scan Ingestion & Reports  |
+-----------------------------+ +-----------------------------+
```

---

## 🚀 Key Features

1. **Automated Trivy Ingestion**:
   - Parses standard Trivy JSON vulnerability reports (container images, language lockfiles, and filesystem scans).
   - Normalizes and deduplicates findings across scans, mapping packages, fixed versions, and CVSS scores.

2. **Contextual Prioritization & SLA Tracking**:
   - Calculates remediation SLAs automatically (Critical: 7 days, High: 14 days, Medium: 30 days, Low: 90 days).
   - Highlights SLA breaches to prevent alert fatigue and enforce organizational security policies.

3. **Triage Lifecycle & Immutable Audit Trail**:
   - Supports 5 distinct finding statuses: `OPEN`, `IN_PROGRESS`, `MITIGATED`, `FALSE_POSITIVE`, `ACCEPTED_RISK`.
   - Records every triage status change, analyst attribution, and remediation note in an immutable audit log.
   - Bulk triage support for handling widespread dependency vulnerabilities.

4. **Interactive Security Dashboard**:
   - High-level KPIs: Total Findings, Critical, High, Open vs. Remediated, and Overdue SLAs.
   - Real-time search by CVE ID, package name, project, or severity.
   - One-click CSV audit report export.

---

## 🛠️ Tech Stack & Costs

| Component | Technology | Cost | Purpose |
|---|---|---|---|
| **Vulnerability Scanning** | [Trivy](https://github.com/aquasecurity/trivy) | Free, Open Source | Ingests CVEs, packages, and CVSS metadata |
| **Backend API** | FastAPI (Python 3.10+) | Free, Open Source | Async REST endpoints, parsing, SLA logic |
| **Frontend UI** | React 18, Vite, Tailwind CSS | Free, Open Source | Interactive triage dashboard & metrics |
| **Database** | PostgreSQL 16 (or SQLite fallback) | Free, Open Source | Relational finding, scan, and audit persistence |
| **Containerization** | Docker Engine & Docker Compose | Free | Multi-container reproducible deployment |

---

## ⚡ Quickstart with Docker Compose

To start the entire platform (PostgreSQL, FastAPI Backend, and React Frontend):

```bash
# 1. Clone or navigate to the project directory
cd vuln-tracker

# 2. Start all services via Docker Compose
docker compose up --build
```

- **Frontend Dashboard**: Open [http://localhost:3000](http://localhost:3000)
- **FastAPI Interactive Docs**: Open [http://localhost:8000/docs](http://localhost:8000/docs)
- **Database**: PostgreSQL listening on `localhost:5432`

---

## 🧪 Local Development Setup (Without Docker)

You can run both backend and frontend directly on your local machine using SQLite as an zero-configuration database fallback:

### 1. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run database table creation and dev server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173).

### 3. Seed Demo Data
To populate the tracker with realistic demo projects and Trivy scans:
```bash
python3 scripts/seed_data.py
```

### 4. Run Unit Tests
```bash
cd backend
pytest tests/ -v
```

---

## 📡 Running Scans with Trivy CLI & Ingesting Results

### Method 1: Using the UI
1. Click the **"Ingest Scan"** button in the dashboard header.
2. Select an existing project (or enter a new project name).
3. Drag and drop any Trivy `.json` scan file (or use sample scans in `samples/`).

### Method 2: Via Command Line / CI/CD Pipeline
Run a Trivy scan on any container image or directory and upload it via `curl`:

```bash
# Scan a container image to JSON
trivy image --format json -o scan.json node:18-alpine

# Ingest into Project #1 via the REST API
curl -X POST "http://localhost:8000/api/v1/scans/upload" \
  -F "project_id=1" \
  -F "file=@scan.json"
```

Or use the provided automated script:
```bash
./scripts/scan_and_upload.sh 1 python:3.10-alpine http://localhost:8000/api/v1
```

---

## 📂 Project Structure

```
vuln-tracker/
├── docker-compose.yml          # Multi-container orchestration (DB, API, Web)
├── .env.example                # Environment configuration template
├── README.md                   # Documentation & usage guide
├── backend/                    # FastAPI Application
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py             # FastAPI entrypoint, CORS, lifespan
│   │   ├── config.py           # SLA days, database and CORS settings
│   │   ├── database.py         # SQLAlchemy engine & session factory
│   │   ├── models.py           # Project, Scan, Vulnerability, Finding, AuditLog
│   │   ├── schemas.py          # Pydantic v2 validation models
│   │   ├── api/                # Modular REST routers
│   │   │   ├── findings.py     # Triage updates, listing, bulk actions
│   │   │   ├── projects.py     # Project CRUD
│   │   │   ├── scans.py        # Trivy upload & JSON ingestion
│   │   │   ├── metrics.py      # Severity distributions & trends
│   │   │   └── reports.py      # CSV / JSON export engine
│   │   └── services/           # Business logic & parsers
│   │       ├── parser.py       # Robust Trivy JSON schema parser
│   │       ├── triage.py       # State transitions & audit logger
│   │       └── metrics.py      # SLA breach checking & KPIs
│   └── tests/                  # Pytest unit tests
│       └── test_tracker.py
├── frontend/                   # Modern React SPA
│   ├── Dockerfile              # Multi-stage Vite build + Nginx production
│   ├── nginx.conf              # Reverse proxy routing /api to backend
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx             # Main dashboard layout
│       ├── api.js              # Fetch client for backend endpoints
│       └── components/         # Modular UI components
│           ├── Navbar.jsx
│           ├── MetricCard.jsx
│           ├── SeverityBadge.jsx
│           ├── StatusBadge.jsx
│           ├── FindingsTable.jsx
│           ├── TriageModal.jsx
│           ├── UploadScanModal.jsx
│           └── ProjectsView.jsx
├── samples/                    # Sample Trivy JSON scans for testing
│   ├── trivy_sample_node.json
│   └── trivy_sample_python.json
└── scripts/
    ├── seed_data.py            # Demo database population script
    └── scan_and_upload.sh      # CLI scanning & ingestion automation
```
