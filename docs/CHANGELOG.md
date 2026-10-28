# Project Changelog

All notable changes to the AI-Powered Hospital OPD Queue and Triage Management System will be documented in this file.

## [0.1.0] - 2026-10-29
### Added
- Initialized Git repository with clean multi-language `.gitignore`.
- Created `.env.example` documenting all configuration keys (database, JWT, ML service URL).
- Established formal software documentation suite in `docs/`:
  - `docs/PROJECT_SCOPE.md`: Objectives, in-scope/out-of-scope, acceptance criteria.
  - `docs/SRS.md`: Functional and non-functional requirements (FR-001 to FR-027).
  - `docs/ARCHITECTURE.md`: Modular monolith and ML inference architecture with Mermaid diagrams.
  - `docs/DATABASE.md`: 3NF relational schema, ER diagram, foreign key rules, constraints.
  - `docs/API.md`: Versioned REST API endpoints and data transfer contracts.
  - `docs/QUEUE_POLICY.md`: Dynamic priority scoring, anti-starvation aging, deterministic tie-breaking.
  - `docs/ML_METHODOLOGY.md`: Target leakage prevention, feature engineering, synthetic dataset model, OLS & RF.
  - `docs/SECURITY.md`: Threat model (STRIDE), RBAC permissions matrix, bcrypt, JWT, and privacy principles.
  - `docs/TESTING.md`: Test pyramid, testing commands, critical test scenarios.
  - `docs/DEPLOYMENT.md`: Step-by-step local setup, Docker Compose, migrations.
  - `docs/RESEARCH_PLAN.md`: Research questions, paired experimental setup, simulation metrics.
  - `docs/FINAL_REPORT_OUTLINE.md`: Chapter-wise B.Tech CSE thesis outline.
  - `docs/VIVA_PREPARATION.md`: Comprehensive viva voce examiner Q&A defense.
  - `docs/DECISIONS.md`: Architectural Decision Records (ADR-001 to ADR-004).
  - `docs/PROGRESS.md`: Project status tracking and phase gates.
  - `README.md`: Central repository overview and quick start guide.
