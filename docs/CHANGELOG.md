# Project Changelog

All notable changes to the AI-Powered Hospital OPD Queue and Triage Management System are documented in this file.

## [1.0.0] - 2026-10-29 - Complete Full-Stack & ML Delivery (Phases 1-8)

### Added
- **Full Monorepo Structure**: Node workspaces for `apps/api` and `apps/web`, dedicated `services/ml` Python service, and `research/` experimentation workspace.
- **Prisma Relational Database**: Models for `User`, `Department`, `Doctor`, `Patient`, `Appointment`, `QueueEntry`, `TriageAssessment`, `TriageOverride`, `ConsultationRecord`, and `AuditLog`. Dual-dialect support for SQLite (`dev.db`) and PostgreSQL (`schema.postgresql.prisma`).
- **Synthetic Seed Generator**: Comprehensive seed pipeline populating clinical departments, doctor accounts, patients, pre-booked appointments, and active queue tokens.
- **RESTful API Backend (`apps/api`)**:
  - Secure bcrypt password hashing and stateless JWT bearer authentication.
  - Role-based authorization matrix (`ADMIN`, `RECEPTIONIST`, `DOCTOR`, `PATIENT`).
  - Appointment scheduling, cancellation, and validation pipelines.
  - Queue engine managing check-ins, token assignment, doctor call-next actions, and consultation completion records.
  - Anti-starvation triage aging scoring engine and clinical override workflow with audit logs.
  - Resilient ML service client with automatic timeout handling and deterministic rule-based fallback.
- **Machine Learning Inference Service (`services/ml`)**:
  - Non-Homogeneous Poisson Process dataset generator modeling peak OPD arrivals and LogNormal service times (6,502 records).
  - Train/test evaluation pipeline comparing Baseline, Ridge Regression, and Random Forest Regressor.
  - Serialized model pipeline artifact (`artifacts/model_v1.joblib`) with metadata.
  - FastAPI web microservice exposing `/health` and `/predict` endpoints with confidence intervals.
- **Role-Aware Web Application (`apps/web`)**:
  - React 18, TypeScript, Tailwind CSS, Vite architecture.
  - Authentication context with token persistence and role-based view routing.
  - Admin Dashboard featuring operational KPI cards, department load distributions, and audit logging tables.
  - Receptionist Dashboard featuring walk-in registration, patient lookup, and intake check-in with live vital assessment.
  - Doctor Console featuring dynamic priority queue sequencing, call-next controls, consultation records, and priority overrides.
  - Patient Portal featuring real-time queue token tracker, patients ahead count, estimated wait time with source labeling, and auto-polling.
- **Research Experimentation & Benchmarking (`research/`)**:
  - Discrete-event simulation runner comparing FCFS, Pure Static Priority, and Dynamic Aging Priority across 50 simulation days.
  - Quantitative metrics output (`simulation_results.json` and `simulation_summary.csv`).
  - Comparative benchmark visualization charts saved in `research/results/charts/`.
- **Containerization & Deployment**:
  - Multi-container `docker-compose.yml` for unified execution.
  - Optimized production Dockerfiles for Node backend, Nginx frontend, and FastAPI ML service.
- **Full Test Suite**:
  - 14 backend API integration and unit tests passing.
  - 26 frontend UI and component tests passing.
  - 4 Python ML service unit tests passing.

---

## [0.1.0] - 2026-10-29 - Phase 0 Specifications & Planning
### Added
- Initialized Git repository with clean multi-language `.gitignore`.
- Created `.env.example` documenting all configuration keys.
- Established foundational software documentation suite in `docs/` (`PROJECT_SCOPE.md`, `SRS.md`, `ARCHITECTURE.md`, `DATABASE.md`, `API.md`, `QUEUE_POLICY.md`, `ML_METHODOLOGY.md`, `SECURITY.md`, `TESTING.md`, `DEPLOYMENT.md`, `RESEARCH_PLAN.md`, `FINAL_REPORT_OUTLINE.md`, `VIVA_PREPARATION.md`, `DECISIONS.md`, `PROGRESS.md`, `README.md`).
