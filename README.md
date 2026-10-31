# InvoiceGuard AI

**Enterprise-grade Intelligent Invoice Processing, Business Validation & Fraud Detection Platform**

InvoiceGuard AI is a full-stack enterprise SaaS application that automates the entire accounts payable lifecycle — from raw document ingestion through OCR extraction, deterministic GST validation, AI-driven fraud risk scoring, role-based approval workflows, and cryptographically sealed audit trails.

Built for the **Hack4Hire 2026** hackathon challenge.

---

## Table of Contents

1. [Overview](#overview)
2. [Core Features](#core-features)
3. [Tech Stack](#tech-stack)
4. [System Architecture](#system-architecture)
5. [Invoice Processing Workflow](#invoice-processing-workflow)
6. [Fraud Detection Engine](#fraud-detection-engine)
7. [Role-Based Access Control](#role-based-access-control)
8. [n8n Automation Integration](#n8n-automation-integration)
9. [Database Schema](#database-schema)
10. [API Reference](#api-reference)
11. [Project Structure](#project-structure)
12. [Quick Start](#quick-start)
13. [Environment Variables](#environment-variables)
14. [Demo Credentials](#demo-credentials)
15. [Test Scenarios](#test-scenarios)

---

## Overview

InvoiceGuard AI solves a critical enterprise problem: **manual invoice processing is slow, error-prone, and vulnerable to fraud**. Finance teams dealing with hundreds of vendor invoices per month face risks from duplicate submissions, tax miscalculations, unauthorized payments, and fabricated purchase orders.

This platform replaces that manual process with an automated 5-stage pipeline:

```
Upload → OCR Extraction → GST Validation → Fraud Analysis → Manager Approval
```

Every stage is audited, every decision is logged with a SHA-256 hash, and every approval is enforced by backend RBAC — making the system both efficient and tamper-proof.

---

## Core Features

### 1. Document Ingestion & Multi-Format Parsing
- Accepts **PDF, PNG, JPG, JPEG** formats up to **25 MB**
- Real document parsing using **PyMuPDF** with adaptive contrast enhancement
- **OpenCV**-powered image preprocessing for low-quality scans
- Spatial token analysis to identify invoice layout patterns

### 2. AI Structured Extraction & Field Confidence Scoring
- Extracts: Supplier name, GSTIN, Invoice number, Invoice date, Due date, PO number, Line items, Financial totals
- Per-field confidence scores (Green ≥80%, Yellow 50–79%, Red <50%)
- Manual field correction with automatic re-validation on save
- Cryptographic JSON snapshots created on each version change

### 3. Independent Checker & Multi-Strategy Re-Extraction
- Separate verification pass after initial extraction
- Detects arithmetic discrepancies in extracted totals
- Up to **3 re-extraction attempts** using different strategies:
  - `heuristic_ai` — Pattern-based AI parser
  - `ocr_enhancement` — Adaptive OCR preprocessing
  - `alternative_patterns` — Alternate regex token patterns
- Escalates to `MANUAL_INVESTIGATION` if all 3 attempts fail

### 4. Deterministic 8-Rule Business Validation Engine
Zero-hallucination rule engine — every check is a deterministic pass/fail:

| # | Rule | Description |
|---|------|-------------|
| 1 | Required Fields | Validates all mandatory invoice fields are present |
| 2 | Vendor Master Lookup | Supplier must exist in the registered vendor database |
| 3 | GSTIN Syntax & Status | 15-digit format verification against GST portal |
| 4 | Invoice Number Format | Structural integrity check on invoice identifiers |
| 5 | PO Reconciliation | Three-way match against authorized purchase orders |
| 6 | Math Verification | Subtotal + Tax components must equal Grand Total |
| 7 | Tax Consistency | CGST + SGST symmetry for intra-state transactions |
| 8 | Duplicate Detection | SHA-256 hash comparison against historical submissions |

### 5. Multivariate Fraud Risk Scoring Engine
Statistical and behavioral risk analysis producing a score of **0–100**:
- **LOW (0–29):** Standard approval flow
- **MEDIUM (30–69):** Secondary review recommended
- **HIGH (70–100):** Escalation required, auto-approval blocked

Detects: duplicate invoices, high-value threshold breaches, suspicious round amounts, abnormal tax rates, unregistered vendors, PO overruns, and rapid submission velocity.

### 6. Role-Based Approval Workflow
- **Segregation of duties:** The invoice uploader cannot approve their own submission
- Mandatory written rejection reason for all rejections
- Three actions available: Approve, Reject, Escalate
- Manager approval ceiling enforced at the API level (not just UI)
- Escalated invoices routed to Admin for senior forensic review

### 7. Cryptographic Audit Trail
- Every state change generates an **append-only audit log entry**
- Each entry is sealed with a **SHA-256 hash** of: timestamp + actor ID + invoice ID + payload diff
- Cryptographic JSON snapshots downloadable per invoice version
- Complete immutable decision history from upload to disbursement

### 8. n8n Workflow Automation
- 8-node automated pipeline: Webhook → Validate → IF Valid → AI Scorer → Notify → Follow-up
- Built-in interactive pipeline simulator in System Settings
- Live follow-up queue API for scheduled automation triggers
- Importable workflow JSON included

### 9. Analytics & Executive Reporting
- Vendor spend distribution charts
- Approval decision breakdown (Approved/Pending/Rejected/Escalated)
- Filterable compliance ledger
- CSV and PDF export for executive reporting

### 10. Admin Governance Console
- User directory with inline role management
- Approval ceiling configuration per manager
- Live service health diagnostics
- Security audit stream

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.3 | UI framework |
| **TypeScript** | 7.0 | Type safety |
| **Vite** | 8.3 | Build tool & dev server |
| **Tailwind CSS** | v4.3 | Utility-first styling |
| **React Router** | v7.18 | Client-side routing |
| **Axios** | 1.21 | HTTP client & JWT interceptors |
| **Recharts** | 3.10 | Analytics charts |
| **Lucide React** | 1.65 | Icon library |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Python** | 3.11+ | Runtime |
| **FastAPI** | 0.115+ | REST API framework |
| **Pydantic v2** | 2.7+ | Request/response validation |
| **SQLAlchemy** | 2.0 | ORM & database abstraction |
| **Uvicorn** | 0.30+ | ASGI server |
| **PyMuPDF** | 1.24+ | PDF parsing & text extraction |
| **OpenCV Headless** | 4.10+ | Image preprocessing for OCR |
| **Pillow** | 10.0+ | Image handling |
| **PyJWT** | 2.8+ | JWT token generation & validation |
| **BCrypt** | 4.0+ | Password hashing |
| **python-dotenv** | 1.0+ | Environment variable management |
| **HTTPX** | 0.27+ | Async HTTP client for n8n webhooks |

### Infrastructure & Tooling

| Technology | Purpose |
|------------|---------|
| **SQLite** | Default database (PostgreSQL-compatible) |
| **n8n** | Workflow automation engine |
| **JWT (HS256)** | Stateless authentication |
| **SHA-256** | Cryptographic audit log integrity |

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    BROWSER (React SPA)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │Dashboard │ │Invoices  │ │Approval  │ │Verification &    │ │
│  │(by role) │ │Management│ │Center    │ │Fraud Analysis    │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘ │
│                  Axios + JWT Bearer Interceptor               │
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTPS / Vite Proxy
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                  FastAPI Backend (:8000)                      │
│                                                              │
│  /api/auth          /api/invoices       /api/extraction      │
│  /api/validation    /api/fraud          /api/approvals       │
│  /api/dashboard     /api/reports        /api/audit-logs      │
│  /api/suppliers     /api/purchase-orders /api/notifications  │
│  /api/users         /api/n8n            /api/snapshots       │
│                                                              │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────────┐  │
│  │OCR Service │  │Validation   │  │Fraud Detection       │  │
│  │(PyMuPDF +  │  │Engine       │  │Engine (Statistical + │  │
│  │ OpenCV)    │  │(8 rules)    │  │ Behavioral Scoring)  │  │
│  └────────────┘  └─────────────┘  └──────────────────────┘  │
│                                                              │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────────┐  │
│  │Audit       │  │Snapshot     │  │n8n Webhook           │  │
│  │Service     │  │Service      │  │Integration           │  │
│  │(SHA-256)   │  │(JSON+hash)  │  │                      │  │
│  └────────────┘  └─────────────┘  └──────────────────────┘  │
└──────────────────────────┬───────────────────────────────────┘
                           │ SQLAlchemy ORM
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                  SQLite Database                              │
│  users · suppliers · purchase_orders · invoices              │
│  invoice_items · extraction_results · validation_results     │
│  fraud_analysis · approvals · audit_logs · notifications     │
│  invoice_snapshots · automation_logs                         │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│              n8n Automation Engine (:5678)                   │
│  Webhook Trigger → Schema Validate → AI Scorer               │
│  → Approval Router → Gmail Notify → ERP Queue                │
└──────────────────────────────────────────────────────────────┘
```

---

## Invoice Processing Workflow

```
                     ┌─────────────────┐
                     │   PDF/Image     │
                     │   Upload        │
                     └────────┬────────┘
                              │
                     ┌────────▼────────┐
                     │  OCR Parsing    │
                     │  PyMuPDF +      │
                     │  OpenCV         │
                     └────────┬────────┘
                              │
                     ┌────────▼────────┐
                     │  Field          │
                     │  Extraction     │
                     │  + Confidence   │
                     │  Scoring        │
                     └────────┬────────┘
                              │
                   ┌──────────▼──────────┐
                   │  Independent        │
                   │  Checker            │
                   └──────┬──────┬───────┘
                          │      │
                     PASS │      │ FAIL
                          │      ▼
                          │   Re-extract
                          │   (up to 3x)
                          │      │
                          │   FAIL after 3x?
                          │      │
                          │      ▼
                          │   MANUAL_INVESTIGATION
                          │
                 ┌────────▼────────┐
                 │  8-Rule Business│
                 │  Validation     │
                 └────────┬────────┘
                          │
                 ┌────────▼────────┐
                 │  Fraud Risk     │
                 │  Scoring (0-100)│
                 └────────┬────────┘
                          │
              ┌───────────┼────────────┐
              │           │            │
           LOW (0-29) MEDIUM (30-69) HIGH (70-100)
              │           │            │
              ▼           ▼            ▼
           Normal      Secondary   Block Auto-
           Approval    Review      Approval +
           Flow        Required    Escalate
              │
     ┌────────▼────────┐
     │  Manager        │
     │  Approval       │
     │  (RBAC enforced)│
     └────────┬────────┘
              │
    ┌─────────┼──────────┐
    │         │          │
 APPROVE   REJECT    ESCALATE
    │         │          │
    ▼         ▼          ▼
 Payment  Log reason  Senior
 Auth.    + Notify    Audit
              │
     ┌────────▼────────┐
     │  SHA-256 Audit  │
     │  Log Entry      │
     │  (Immutable)    │
     └─────────────────┘
```

---

## Fraud Detection Engine

The fraud engine runs 7 independent checks and accumulates a weighted risk score:

| Check | Trigger Condition | Risk Added |
|-------|-------------------|-----------|
| Duplicate Invoice | Same invoice number found in DB | +45 pts |
| High Value Threshold | Amount > ₹5,00,000 | +25 pts |
| Suspicious Round Amount | Exact round number, zero tax breakdown | +15 pts |
| Line Item Price Outlier | Unit price > ₹1,50,000 | +15 pts |
| Abnormal Tax Rate | Tax > 40% of subtotal | +20 pts |
| Unregistered Supplier | Vendor not in master directory | +20 pts |
| PO Fabrication | PO number not in procurement DB | +15 pts |
| PO Supplier Mismatch | PO authorized for different vendor | +25 pts |
| PO Value Overrun | Invoice > 120% of approved PO budget | +25 pts |
| Rapid Velocity | 3+ invoices from same supplier in 24h | +15 pts |

Final score is capped at **100**. All detected issues include a human-readable explanation for the AP reviewer.

---

## Role-Based Access Control

Three roles with strictly enforced permissions at the API level (not just UI):

### Employee
- Upload invoices (PDF/PNG/JPG)
- View own submitted invoices
- Inspect OCR extraction results
- Manually correct extracted fields
- Trigger re-extraction
- View own reports

### Manager
- All Employee permissions on assigned department invoices
- View verification and fraud analysis results
- **Approve** invoices within their approval ceiling
- **Reject** invoices (mandatory written reason)
- **Escalate** invoices to Admin
- Cannot approve invoices they uploaded (segregation of duties)
- Cannot approve invoices that failed the Independent Checker

### Administrator
- All Manager permissions with unlimited approval ceiling
- Full user directory management
- Assign/modify roles and approval ceilings
- Activate/deactivate user accounts
- Access complete audit trail
- System settings and supplier/PO master data management
- Cannot demote or deactivate the last remaining administrator

**Security note:** Every permission check is enforced server-side. The UI restrictions are secondary.

---

## n8n Automation Integration

The platform integrates with an **8-node n8n workflow** for automated invoice event processing:

```
Node 1: Webhook Ingestion     → Receives invoice state change events from FastAPI
Node 2: Schema Validation     → Validates required payload fields are present
Node 3: Condition Router      → Branches: Valid / Invalid / High Risk
Node 4: AI Anomaly Scorer     → Enriches with additional fraud intelligence
Node 5: Approval Router       → Routes by risk category and manager assignment
Node 6: Gmail Notification    → Sends email alerts to assigned managers
Node 7: ERP Queue Entry       → Adds to enterprise payment queue
Node 8: Daily Follow-up       → Scheduled scan of pending invoices > 48h
```

### Setup
1. Install n8n: `npm install -g n8n`
2. Start n8n: `n8n start`
3. Import the workflow: `n8n/workflows/invoiceguard_workflow.json`
4. Set the webhook URL in `.env`: `N8N_WEBHOOK_URL=http://localhost:5678/webhook/new-invoice`

### Testing Without n8n
Use the built-in **Pipeline Simulator** in System Settings → n8n Pipeline Simulator to run the full 8-node trace without needing a live n8n instance.

---

## Database Schema

**13 relational tables:**

```
users                   — Authentication, roles, approval limits
suppliers               — Registered vendor master directory
purchase_orders         — Authorized procurement budgets per supplier
invoices                — Core invoice records with all status fields
invoice_items           — Line items per invoice
extraction_results      — OCR extraction output + confidence scores
validation_results      — 8-rule validation results (JSON per rule)
fraud_analysis          — Risk score, category, detected anomalies
approvals               — Manager decisions with mandatory reasons
audit_logs              — Append-only event log with SHA-256 hashes
notifications           — User-targeted event notifications
invoice_snapshots       — Versioned JSON snapshots with integrity hashes
automation_logs         — n8n webhook execution history
```

---

## API Reference

The full interactive API is available at `http://127.0.0.1:8000/docs` when the backend is running.

### Authentication
```
POST   /api/auth/login          — Login, returns JWT token
POST   /api/auth/register       — Register new user
GET    /api/auth/me             — Get current authenticated user
```

### Invoice Management
```
GET    /api/invoices            — List all invoices (role-filtered)
POST   /api/invoices/upload     — Upload invoice document (multipart)
GET    /api/invoices/{id}       — Get invoice details
DELETE /api/invoices/{id}       — Delete invoice record
GET    /api/invoices/{id}/download  — Download original file
```

### Extraction & Validation
```
GET    /api/invoices/{id}/extraction    — Get extraction results
POST   /api/invoices/{id}/extract       — Trigger fresh extraction
PUT    /api/invoices/{id}/extraction    — Save manual field corrections
POST   /api/invoices/{id}/re-extract    — Re-extract with specific strategy
GET    /api/invoices/{id}/checker       — Get independent checker results
POST   /api/invoices/{id}/validate      — Run 8-rule validation
GET    /api/invoices/{id}/validation    — Get validation results
```

### Fraud Analysis
```
GET    /api/invoices/{id}/fraud-analysis    — Get fraud risk results
POST   /api/invoices/{id}/fraud-check       — Run fraud analysis
```

### Approvals
```
GET    /api/approvals/pending               — Get manager's pending queue
POST   /api/invoices/{id}/approve           — Approve invoice
POST   /api/invoices/{id}/reject            — Reject with mandatory reason
POST   /api/invoices/{id}/escalate          — Escalate to Admin
```

### Dashboards & Reports
```
GET    /api/dashboard/admin         — Admin KPIs + user directory
GET    /api/dashboard/manager       — Manager KPIs + pending queue
GET    /api/dashboard/employee      — Employee workspace + recent invoices
GET    /api/dashboard/analytics     — Spend & approval distribution data
GET    /api/reports/invoices        — Filterable compliance ledger
GET    /api/reports/export/csv      — Export CSV report
GET    /api/reports/export/pdf      — Export PDF report
```

### Audit & Snapshots
```
GET    /api/audit-logs                      — Full audit trail (paginated)
GET    /api/invoices/{id}/audit             — Invoice-specific audit events
GET    /api/invoices/{id}/snapshot          — Latest cryptographic snapshot
GET    /api/invoices/{id}/snapshot/download — Download snapshot JSON
```

### Admin & Settings
```
GET    /api/users                   — List all users (Admin)
POST   /api/users                   — Create user (Admin)
PUT    /api/users/{id}/role         — Update user role (Admin)
PUT    /api/users/{id}/status       — Activate/deactivate user (Admin)
PUT    /api/users/{id}/limit        — Set approval ceiling (Admin)
GET    /api/suppliers               — List supplier master
POST   /api/suppliers               — Register new supplier
GET    /api/purchase-orders         — List purchase orders
POST   /api/purchase-orders         — Create purchase order
```

### Automation
```
POST   /api/n8n/simulate-pipeline/{id}  — Run 8-node simulation
GET    /api/n8n/follow-up-queue         — Get invoices pending >48h
POST   /api/n8n/invoice-event           — Inbound n8n webhook endpoint
```

---

## Project Structure

```
hack4hire_invoiceGuard/
│
├── backend/
│   ├── app/
│   │   ├── api/                    # FastAPI route handlers
│   │   │   ├── auth.py             # Login, register, JWT
│   │   │   ├── invoices.py         # Invoice CRUD + upload
│   │   │   ├── extraction.py       # OCR extraction endpoints
│   │   │   ├── validation.py       # Business validation
│   │   │   ├── fraud.py            # Fraud risk analysis
│   │   │   ├── approvals.py        # Approval workflow
│   │   │   ├── dashboard.py        # Role-specific dashboards
│   │   │   ├── reports.py          # Analytics & export
│   │   │   ├── audit.py            # Audit trail
│   │   │   ├── snapshots.py        # JSON snapshots
│   │   │   ├── suppliers.py        # Vendor master
│   │   │   ├── purchase_orders.py  # PO management
│   │   │   ├── users.py            # User management (Admin)
│   │   │   ├── notifications.py    # Real-time notifications
│   │   │   ├── n8n.py              # Automation endpoints
│   │   │   └── demo.py             # Demo seeding & reset
│   │   │
│   │   ├── core/
│   │   │   ├── config.py           # Settings & environment config
│   │   │   ├── security.py         # JWT + BCrypt utilities
│   │   │   └── permissions.py      # RBAC dependency functions
│   │   │
│   │   ├── database/
│   │   │   ├── session.py          # SQLAlchemy engine & session
│   │   │   └── init_db.py          # DB initializer + seeder
│   │   │
│   │   ├── models/
│   │   │   └── models.py           # 13 SQLAlchemy ORM models
│   │   │
│   │   ├── schemas/
│   │   │   └── schemas.py          # Pydantic request/response schemas
│   │   │
│   │   └── services/
│   │       ├── ocr_service.py          # PyMuPDF + OpenCV parsing
│   │       ├── extraction_service.py   # Field extraction + confidence
│   │       ├── reextraction_service.py # Multi-strategy re-extraction
│   │       ├── validation_service.py   # 8-rule deterministic engine
│   │       ├── fraud_service.py        # Risk scoring engine
│   │       ├── audit_service.py        # SHA-256 audit chain
│   │       ├── snapshot_service.py     # Versioned JSON snapshots
│   │       ├── n8n_service.py          # n8n webhook integration
│   │       └── gst/
│   │           ├── agent.py            # GST verification agent
│   │           ├── calculator.py       # Deterministic GST math
│   │           ├── config.py           # GST rules & rates config
│   │           └── schemas.py          # GST validation schemas
│   │
│   ├── storage/invoices/           # Uploaded document files
│   ├── main.py                     # FastAPI application entrypoint
│   ├── requirements.txt            # Python dependencies
│   └── Procfile                    # Render.com deployment config
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DataTable.tsx       # Generic typed data table
│   │   │   ├── StatusBadge.tsx     # Semantic status pill badges
│   │   │   ├── ConfidenceChip.tsx  # OCR confidence score display
│   │   │   ├── ConfirmDialog.tsx   # Approval/rejection modal
│   │   │   ├── EmptyState.tsx      # Empty data state component
│   │   │   ├── ErrorState.tsx      # Error display component
│   │   │   ├── Skeleton.tsx        # Loading skeleton
│   │   │   ├── Toast.tsx           # Toast notification system
│   │   │   ├── GlobalSearch.tsx    # Ctrl+K invoice search
│   │   │   ├── ServerStatusBanner.tsx  # Cold-start detection
│   │   │   ├── KpiStrip.tsx        # KPI metric strip
│   │   │   └── PipelineStepper.tsx # Pipeline stage visualization
│   │   │
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx     # Auth state + JWT management
│   │   │   └── ServerStatusContext.tsx  # Backend health polling
│   │   │
│   │   ├── layouts/
│   │   │   └── MainLayout.tsx      # Sidebar + topbar layout
│   │   │
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx               # Login + registration
│   │   │   ├── DashboardPage.tsx           # Role-router component
│   │   │   ├── dashboards/
│   │   │   │   ├── AdminDashboard.tsx      # Governance console
│   │   │   │   ├── ManagerDashboard.tsx    # Approval queue
│   │   │   │   └── EmployeeDashboard.tsx   # Submission workspace
│   │   │   ├── InvoicesPage.tsx            # Invoice master ledger
│   │   │   ├── UploadPage.tsx              # Document upload
│   │   │   ├── ExtractionPage.tsx          # OCR review split-pane
│   │   │   ├── FraudDetectionPage.tsx      # Verification & fraud
│   │   │   ├── ApprovalPage.tsx            # Approval center
│   │   │   ├── ReportsPage.tsx             # Analytics & reports
│   │   │   ├── AuditLogsPage.tsx           # Audit trail ledger
│   │   │   └── SettingsPage.tsx            # System configuration
│   │   │
│   │   ├── services/
│   │   │   └── api.ts              # Axios client + all API calls
│   │   │
│   │   ├── types/
│   │   │   └── index.ts            # TypeScript type definitions
│   │   │
│   │   ├── utils/
│   │   │   └── formatters.ts       # INR formatter, date utils
│   │   │
│   │   ├── App.tsx                 # React Router + protected routes
│   │   ├── index.css               # Design system tokens + utilities
│   │   └── main.tsx                # React application entry
│   │
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts              # Vite config + API proxy
│   └── tsconfig.json
│
├── n8n/
│   ├── workflows/
│   │   └── invoiceguard_workflow.json  # Importable 8-node workflow
│   └── README.md
│
├── docs/
│   ├── API_DOCUMENTATION.md
│   ├── DATABASE_SCHEMA.md
│   ├── N8N_SETUP.md
│   └── USER_GUIDE.md
│
├── scripts/
│   └── seed-demo.py            # Standalone demo data seeder
│
├── storage/invoices/           # Demo invoice PDFs
├── .env.example                # Environment variable template
├── render.yaml                 # Render.com deployment config
└── vercel.json                 # Vercel frontend deployment config
```

---

## Quick Start

### Prerequisites
- Python **3.11+**
- Node.js **18+**
- Git

### 1. Clone the repository
```bash
git clone https://github.com/your-org/hack4hire_invoiceGuard.git
cd hack4hire_invoiceGuard
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Edit .env if needed — defaults work out of the box for local dev
```

### 3. Backend setup
```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Start the backend server (auto-seeds demo data on first run)
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Backend is live at:
- API Root: `http://127.0.0.1:8000`
- Swagger UI: `http://127.0.0.1:8000/docs`
- Health Check: `http://127.0.0.1:8000/health`

### 4. Frontend setup
```bash
# Open a new terminal
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Frontend is live at: **http://localhost:5173**

### 5. (Optional) n8n setup
```bash
npm install -g n8n
n8n start
# Then import n8n/workflows/invoiceguard_workflow.json via the n8n UI
```

---

## Environment Variables

Copy `.env.example` to `.env` in the project root:

```env
# Application
PROJECT_NAME="InvoiceGuard AI"
API_V1_STR="/api"

# Database (SQLite default; PostgreSQL-compatible)
DATABASE_URL="sqlite:///./invoiceguard.db"

# Security
SECRET_KEY="your-secret-key-here"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Document Storage
STORAGE_DIR="./storage/invoices"
MAX_UPLOAD_SIZE_MB=25

# n8n Automation
N8N_WEBHOOK_URL="http://localhost:5678/webhook/new-invoice"
N8N_WEBHOOK_SECRET="your-n8n-secret"

# Optional: OpenAI (rule-based fallback active if not set)
OPENAI_API_KEY=""
AI_MODEL="gpt-4o-mini"

# GST Verification
GST_PORTAL_VERIFY_ENABLED=true
```

---

## Demo Credentials

| Role | Email | Password | Access Level |
|------|-------|----------|-------------|
| **Administrator** | `admin@invoiceguard.ai` | `Admin@123` | Full platform access, user management, system settings |
| **Manager** | `manager@invoiceguard.ai` | `Manager@123` | Approvals, rejections, escalations, team analytics |
| **Employee** | `employee@invoiceguard.ai` | `Employee@123` | Upload, extraction review, field corrections |

> The login page has **one-click demo buttons** for instant access without typing credentials.
> The user menu has a **Quick Role Switch** panel for evaluators to switch between all three roles instantly.

---

## Test Scenarios

The database is auto-seeded with realistic test cases covering all key scenarios:

| Invoice ID | Scenario | Validation | Fraud Score | Approval |
|------------|----------|-----------|------------|---------|
| `INV-1001` | Valid invoice — clean pass | PASSED | 8.0 (LOW) | PENDING |
| `INV-1002` | Duplicate of INV-1001 — same invoice number | FAILED | HIGH | ESCALATED |
| `INV-1003` | Legitimate invoice, pre-approved | PASSED | LOW | APPROVED |
| `INV-1004` | High-value suspicious invoice ₹8,50,000 | WARNING | HIGH | PENDING |
| `INV-1005` | Real-world PDF (Azure Form Recognizer sample) | PASSED | LOW | PENDING |
| `INV-1006` | GST tax invoice with full line items | PASSED | LOW | PENDING |

### Manual Test Scenarios

1. **Upload & Extract** — Go to Upload, drop any PDF invoice, observe auto-extraction and confidence scores
2. **Field Correction** — On the Extraction page, click Edit Fields, modify a value, save and watch re-validation trigger
3. **Re-extraction** — Trigger re-extraction with a different strategy from the checker alert box
4. **Fraud Analysis** — Visit Verification page, select INV-1004, observe HIGH risk score breakdown
5. **Approve Invoice** — Login as Manager, go to Approvals, select INV-1001, click Approve
6. **Reject with Reason** — Select an invoice, click Reject — observe the mandatory reason requirement
7. **Escalate** — Escalate an invoice and observe it move to Admin queue
8. **Audit Trail** — Visit Audit Logs, copy a SHA-256 hash to verify entry integrity
9. **Role Switch** — Use the Quick Role Switch in the top-right user menu to switch between all roles
10. **n8n Simulation** — Go to Settings → n8n Pipeline Simulator, run a simulation to see the 8-node trace

---

## License

Built for Hack4Hire 2026. All rights reserved.
