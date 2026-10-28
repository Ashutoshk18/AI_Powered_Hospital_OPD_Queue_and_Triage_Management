# Deployment Guide: Local, Docker & Service Orchestration

## 1. Prerequisites
- **Node.js:** v18.0.0 or higher (v22.x recommended)
- **npm:** v9.x or higher
- **Python:** v3.10 to v3.13
- **PostgreSQL:** v15+ (Local instance or Docker container)
- **Docker & Docker Compose:** (Optional, for containerized multi-service launch)

---

## 2. Local Environment Setup (Step-by-Step)

### Step 1: Clone and Configure Environment
```bash
cp .env.example .env
```
Ensure `.env` contains valid credentials:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opd_queue_db?schema=public
JWT_SECRET=super_secret_jwt_key_at_least_32_characters_long
ML_SERVICE_URL=http://localhost:8000
```

### Step 2: Install Node Dependencies
```bash
npm install
```

### Step 3: Database Migration & Synthetic Seed Data
```bash
npm run db:migrate
npm run db:seed
```
This provisions schema tables, enum types, relational foreign keys, and synthetic demonstration accounts.

### Step 4: Python ML Service Setup
```bash
cd services/ml
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
# source .venv/bin/activate
pip install -r requirements.txt
python scripts/train_model.py
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 5: Start Backend and Frontend
In the root directory:
```bash
# Start backend API (Port 5000)
npm run dev:api

# Start frontend application (Port 5173)
npm run dev:web
```
Access the application in your browser at `http://localhost:5173`.

---

## 3. Docker Compose Orchestration

For single-command container orchestration, a `docker-compose.yml` is provided at the root:

```bash
docker compose up --build -d
```

This starts:
1. `db`: PostgreSQL 16 on port 5432 with health check probe.
2. `ml-service`: Python FastAPI on port 8000.
3. `api`: Node.js Express server on port 5000.
4. `web`: Nginx-served React frontend on port 80 (or 5173).

---

## 4. Health Checks & Verification

| Service | Health Check URL | Expected Status |
| :--- | :--- | :--- |
| **Backend API** | `GET http://localhost:5000/api/v1/health` | `{"status": "ok", "db": "connected"}` |
| **Python ML Service** | `GET http://localhost:8000/health` | `{"status": "ready", "loaded_model_version": "v1.2.0-rf"}` |
| **PostgreSQL** | `pg_isready -h localhost -p 5432` | `accepting connections` |

---

## 5. Troubleshooting Common Issues
- **Prisma Connection Refused:** Verify PostgreSQL service is active and `DATABASE_URL` credentials in `.env` match your local PostgreSQL role.
- **ML Service Unreachable:** Check if FastAPI is running on port 8000. If offline, the Node.js backend smoothly degrades to rule-based fallback estimates.
- **Port Conflict (5000 or 5173 in use):** Update `PORT` in `.env` or pass `PORT=5001 npm run dev:api`.
