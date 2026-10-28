# Project Scope: AI-Powered Hospital OPD Queue and Triage Management System

## 1. Problem Statement
Outpatient Departments (OPDs) in public and private hospitals routinely suffer from severe congestion, unpredictable waiting times, lack of real-time visibility for patients, and inefficient scheduling. The conventional First-Come, First-Served (FCFS) queue discipline fails to distinguish between clinically urgent outpatient cases and routine checkups, while static time-slot booking systems fail when doctor consultation times naturally vary. Furthermore, patients experience anxiety due to opaque waiting estimates, and clinical staff face operational friction balancing emergency walk-ins against scheduled appointments.

This project addresses these challenges by developing an integrated, intelligent OPD queue and triage management system featuring:
1. Multi-role outpatient workflow management (Admin, Receptionist, Doctor, Patient).
2. Transparent, rule-based clinical urgency triage with explainable priority scores and staff override capabilities.
3. Machine-learning-driven waiting-time prediction utilizing queue dynamics, doctor availability, and department load.
4. An anti-starvation dynamic queue scheduling algorithm that balances clinical priority against waiting time fairness.
5. Operational analytics dashboards and reproducible research benchmarks.

---

## 2. Objectives
- **Operational Efficiency:** Streamline outpatient registration, token assignment, doctor consultation workflow, and queue movement.
- **Explainable Triage Prioritization:** Implement a configurable, rule-based urgency triage system that categorizes patients without claiming autonomous medical diagnosis.
- **Accurate Waiting Time Estimates:** Build, train, evaluate, and deploy an ML regression pipeline predicting wait times with lower Mean Absolute Error (MAE) than conventional static baselines.
- **Queue Fairness:** Prevent starvation of low-urgency patients using a parameterized aging mechanism and mathematically compare the policy against FCFS.
- **Defensible Academic Quality:** Deliver a clean, tested, reproducible codebase with empirical benchmark results suitable for a final-year B.Tech CSE thesis and conference paper.

---

## 3. Stakeholders & User Roles

| Role | Primary Responsibilities | Scope of Access |
| :--- | :--- | :--- |
| **Administrator** | System configuration, department/doctor management, policy threshold adjustments, aggregate analytics, audit log inspection. | System-wide administrative controls and operational telemetry. |
| **Receptionist** | In-person patient lookup/registration, appointment verification, check-in, token generation, triage intake assistance. | Departmental queue operations, check-in, token issuance. |
| **Doctor** | Consultation queue viewing, next patient call, consultation start/complete, clinical triage override with recorded justification. | Assigned department/doctor queue, consultation notes, assigned patient triage info. |
| **Patient** | Profile creation, appointment booking/cancellation, personal queue token status, real-time wait estimate tracking. | Self-profile, own appointment history, own active token status. |

---

## 4. Scope Boundaries

### In-Scope
- Modular monolithic Node.js/Express REST API backend with PostgreSQL and Prisma ORM.
- Modern responsive React/TypeScript frontend (Vite, Tailwind CSS, Lucide icons, Recharts).
- Standalone Python FastAPI microservice for waiting time prediction inference and model metadata.
- Configurable multi-tier triage classification (e.g., Level 1: Immediate/Resuscitation [redirect to Emergency], Level 2: Urgent, Level 3: Moderate, Level 4: Routine, Level 5: Administrative/Refill).
- Dynamic priority scoring with aging factor ($\text{PriorityScore} = W_{\text{triage}} \times \text{UrgencyWeight} + W_{\text{wait}} \times \text{WaitingTime}$).
- Deterministic tie-breaking rules and transactional state transition guards for appointments and queue entries.
- Machine learning pipeline comparing Linear Regression and Random Forest Regressor against a deterministic position-based baseline.
- Role-based Access Control (RBAC) enforced on backend routes and sanitized data responses.
- Synthetic OPD dataset generator modeling realistic arrival rates, burstiness, consultation time distributions, and department variations.
- Comparative simulation framework benchmarking wait times, 90th percentile delays, doctor utilization, and starvation rates under FCFS vs. Prioritized-Aging policies.

### Out-of-Scope (Explicitly Excluded)
- Autonomous medical diagnostic generation or automated clinical prescription writing (ethical and legal boundaries).
- Direct integration with proprietary Electronic Health Record (EHR) vendor protocols (e.g., Epic/Cerner HL7/FHIR production connectors).
- Hardware biometric kiosks, RFID physical badge scanners, or automated SMS/WhatsApp gateway charges (abstracted via web notifications and REST APIs).
- Payment gateway integration and billing settlement systems.
- Real production deployment across HIPAA/GDPR clinical environments without external institutional clinical trials.

---

## 5. Major Assumptions
1. **Synthetic Data Validity for Prototyping:** Due to privacy regulations (HIPAA/DISHA) preventing public dissemination of identifiable clinical wait data, the system evaluates ML models and queue mechanics on rigorously modeled synthetic datasets that simulate realistic Poisson arrival processes and log-normal consultation durations.
2. **Clinical Safety Boundary:** The software serves as an operational decision-support tool. Emergency cases requiring immediate resuscitation (Level 1) trigger automated administrative alerts to route the patient to the Emergency Department (ED/Casualty) rather than regular OPD queues.
3. **Environment Feasibility:** The system runs locally or containerized with Docker Compose, ensuring reproducible execution on standard development workstations.

---

## 6. Acceptance Criteria
- **AC-01 (RBAC Security):** Unauthorized access to administrative or clinical routes is rejected with HTTP 401/403; patients cannot access other patients' identifiers or medical records.
- **AC-02 (Queue Concurrency):** Token generation and consultation status updates are concurrency-safe; no duplicate token numbers exist within a department-date scope.
- **AC-03 (Triage Transparency):** Every triage score produces a recorded, human-readable rationale detailing the clinical indicators and age factors evaluated.
- **AC-04 (ML Wait Time Prediction):** The trained ML model demonstrates lower MAE on held-out test data than a naive position-based static baseline and handles ML service downtime gracefully with a fallback estimator.
- **AC-05 (Starvation Mitigation):** Simulation results demonstrate that the dynamic aging policy bounds maximum waiting times for routine patients while prioritizing urgent cases.
- **AC-06 (Academic Reproducibility):** Seed scripts, test suites, and ML training pipelines execute cleanly via documented terminal commands.
