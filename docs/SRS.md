# Software Requirements Specification (SRS)
## AI-Powered Hospital OPD Queue and Triage Management System

---

## 1. Introduction

### 1.1 Purpose
This document specifies the software requirements for the AI-Powered Hospital Outpatient Department (OPD) Queue and Triage Management System. It establishes functional requirements (FRs), non-functional requirements (NFRs), system interface contracts, constraints, and verification criteria for academic evaluation and technical implementation.

### 1.2 Intended Audience
- Engineering evaluators, faculty advisors, and viva examiners.
- Software developers, ML engineers, and QA testers.

---

## 2. Overall Description

### 2.1 Product Perspective
The application is a multi-tier client-server system consisting of:
1. **Frontend Client:** Single Page Application (SPA) built using React, Vite, TypeScript, and Tailwind CSS.
2. **Main Backend API:** Node.js/Express REST API orchestrating business logic, relational persistence, authentication, and queue policies.
3. **Database:** PostgreSQL managed via Prisma ORM for relational integrity, indexes, and transactions.
4. **Machine Learning Microservice:** Python FastAPI service executing waiting-time inference using trained scikit-learn models.

### 2.2 Operational Workflow Summary
1. Patient registers and schedules an appointment for a specific department and doctor.
2. On the appointment day, the patient arrives and checks in via the Receptionist desk or patient self-check-in portal.
3. Intake assessment records vital indicators and urgency factors; the triage engine computes an initial Urgency Category and priority weight.
4. The system issues a unique daily queue token (e.g., `CARD-014`) and inserts the patient into the active department queue.
5. The queue engine invokes the ML microservice with current queue depth, active consultations, doctor load, and department history to compute an Estimated Waiting Time (EWT).
6. The Doctor views the ordered queue, calls the next patient, initiates consultation, and marks it completed.
7. Authorized staff may manually override a patient's triage priority with a required textual reason, captured in an immutable audit log.

---

## 3. Functional Requirements

### 3.1 Module A: Authentication & Role-Based Access Control (RBAC)
- **FR-001:** The system shall authenticate users using email/password credentials with bcrypt password hashing (minimum 10 salt rounds).
- **FR-002:** The system shall enforce role-based authorization for 4 roles: `ADMIN`, `RECEPTIONIST`, `DOCTOR`, and `PATIENT`.
- **FR-003:** The system shall issue signed JWT bearer tokens with configurable expiration (default 8 hours).
- **FR-004:** The system shall reject access to protected routes with HTTP 401 (Unauthorized) or HTTP 403 (Forbidden) when permissions are violated.
- **FR-005:** The system shall provide an administrative bootstrap mechanism to create the root administrator without hardcoded production credentials.

### 3.2 Module B: Patient & Doctor Management
- **FR-006:** The system shall maintain patient demographic profiles (name, date of birth, contact number, emergency contact, blood group).
- **FR-007:** The system shall restrict patient profile viewing so patients can only view their own records, while clinical/reception staff can query registered patients.
- **FR-008:** The system shall manage hospital departments (Cardiology, Orthopedics, Pediatrics, General Medicine, Dermatology, etc.) with configurable average consultation durations.
- **FR-009:** The system shall manage doctor profiles, departmental affiliations, room assignments, active/on-leave statuses, and daily shift schedules.

### 3.3 Module C: Appointment Scheduling & State Lifecycle
- **FR-010:** The system shall enable booking appointments with validation of doctor availability, working hours, and duplicate-booking prevention.
- **FR-011:** The system shall enforce deterministic state transitions: `SCHEDULED` $\rightarrow$ `CHECKED_IN` $\rightarrow$ `IN_CONSULTATION` $\rightarrow$ `COMPLETED` (or `CANCELLED` / `NO_SHOW`).
- **FR-012:** Invalid state transitions (e.g., attempting to complete a cancelled appointment) shall be rejected with HTTP 422 Unprocessable Entity.

### 3.4 Module D: OPD Queue & Token Management
- **FR-013:** Upon check-in, the system shall generate a sequential token scoped to the department and date (e.g., `GEN-001`, `PED-002`) within a database transaction.
- **FR-014:** The system shall prevent race conditions and token collisions under concurrent check-in requests using database unique constraints and transactional locking.
- **FR-015:** The system shall maintain a live queue state per department/doctor displaying current consulting patient, waiting patients, and completed counts.

### 3.5 Module E: Triage Prioritization & Fairness Engine
- **FR-016:** The system shall categorize intake urgency into 5 standardized levels:
  - Level 1: Resuscitation / Immediate (auto-routed to Emergency, excluded from routine OPD delay)
  - Level 2: Emergent / High Urgency (weight: 100)
  - Level 3: Urgent / Moderate (weight: 60)
  - Level 4: Routine / Standard (weight: 30)
  - Level 5: Minor / Administrative (weight: 10)
- **FR-017:** The system shall compute dynamic patient priority combining clinical weight and accumulated waiting time:
  $$\text{PriorityScore} = W_{\text{triage}} + (\alpha \times \text{ElapsedMinutesWaiting})$$
  where $\alpha$ is a configurable aging rate preventing low-urgency starvation.
- **FR-018:** The system shall provide deterministic tie-breaking for equal priority scores based on earliest check-in timestamp (`checkInTime ASC`, followed by `tokenId ASC`).
- **FR-019:** Authorized doctors or receptionists shall be permitted to override a patient's triage tier, mandating an audit record with `originalTier`, `newTier`, `reason`, and `overriddenByUserId`.

### 3.6 Module F: Machine Learning Waiting-Time Prediction
- **FR-020:** The system shall integrate an ML prediction endpoint accepting: `queue_position`, `patients_ahead`, `active_consultation_duration`, `department_code`, `hour_of_day`, `day_of_week`, `doctor_experience_years`, and `urgency_tier`.
- **FR-021:** The ML service shall return: `predicted_wait_minutes`, `confidence_interval_lower`, `confidence_interval_upper`, `model_version`, and `inference_latency_ms`.
- **FR-022:** If the ML service is unreachable or times out (after 3000ms), the backend shall smoothly fall back to a deterministic rule-based calculation ($EWT = \text{patients\_ahead} \times \text{avg\_dept\_duration}$) and flag the response with `source: "FALLBACK_RULE"`.

### 3.7 Module G: Dashboards, Visualizations & Reporting
- **FR-023:** The Admin dashboard shall display department load metrics, average waiting times, doctor utilization, and system health status.
- **FR-024:** The Doctor dashboard shall display the active consulting patient, call next patient, show patient clinical triage notes, and record consultation completion.
- **FR-025:** The Receptionist dashboard shall manage daily check-ins, queue token issuance, and emergency walk-in registration.
- **FR-026:** The Patient portal shall display real-time token queue status, number of patients ahead, and estimated wait time with periodic auto-polling.

### 3.8 Module H: Audit Logging
- **FR-027:** The system shall log security and operational events (login failures, triage overrides, appointment cancellations, consultation status changes) with user ID, IP, timestamp, action, and diff payload.

---

## 4. Non-Functional Requirements (NFR)

- **NFR-001 (Performance):** REST API endpoints shall respond within 250ms for 95% of queries under standard simulated single-clinic load.
- **NFR-002 (Concurrency & Integrity):** Database operations updating queue tokens and consultation states shall run in ACID transactions preventing double-assignment or ghost updates.
- **NFR-003 (Reliability & Fault Tolerance):** Failure or unresponsiveness of the ML microservice shall not interrupt or halt normal clinic check-in or consultation workflows.
- **NFR-004 (Security):** All passwords must be salted and hashed with bcrypt. Sensitive tokens must not be exposed in client bundles or public endpoints.
- **NFR-005 (Maintainability & Clean Architecture):** Codebase shall adhere to TypeScript strict mode, separation of concerns (controller-service-repository pattern), and modular structure.
- **NFR-006 (Academically Reproducible):** Seed generation and ML training pipelines shall be deterministic and reproducible using explicit random seeds.

---

## 5. Verification Matrix & Acceptance Criteria

| Requirement | Test Type | Verification Method |
| :--- | :--- | :--- |
| FR-001 - FR-005 | Unit & Integration | Automated tests validating login, token generation, 401/403 responses on unauthorized roles. |
| FR-010 - FR-012 | Integration | State machine tests verifying valid transitions and rejection of illegal states. |
| FR-013 - FR-015 | Concurrency Test | Parallel asynchronous requests asserting zero duplicate token issuance per department/day. |
| FR-016 - FR-019 | Unit | Mathematical verification of dynamic aging formula, anti-starvation thresholds, and audit trail logs. |
| FR-020 - FR-022 | Integration & Fault | Model prediction evaluation; synthetic network timeout test verifying fallback calculation flag. |
| FR-023 - FR-026 | Component/UI Test | React component testing for queue rendering, loading states, and error alerts. |
