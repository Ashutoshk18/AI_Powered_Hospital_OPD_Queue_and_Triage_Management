# REST API Specification & Endpoint Contracts

All API endpoints are prefixed with `/api/v1` and communicate using standard JSON payloads over HTTP/HTTPS.

---

## 1. Authentication & Authorization

### 1.1 `POST /api/v1/auth/login`
- **Purpose:** Authenticate user and issue JWT token.
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "doctor@hospital.org",
    "password": "SecurePassword123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOi...",
    "user": {
      "id": "c1f7b3a0-...",
      "email": "doctor@hospital.org",
      "fullName": "Dr. Sarah Adams",
      "role": "DOCTOR"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Validation failure on email/password format.
  - `401 Unauthorized`: Invalid credentials.

### 1.2 `GET /api/v1/auth/me`
- **Purpose:** Fetch authenticated user's profile and permissions.
- **Access:** Authenticated (Any role)
- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):** User object matching authenticated token.

---

## 2. Department & Doctor Management

### 2.1 `GET /api/v1/departments`
- **Purpose:** List all active hospital departments and their consultation duration profiles.
- **Access:** Authenticated (All roles)

### 2.2 `GET /api/v1/doctors`
- **Purpose:** Query doctors filtered by `departmentId` or availability.
- **Access:** Authenticated (All roles)
- **Query Params:** `?departmentId=<uuid>&available=true`

### 2.3 `PATCH /api/v1/doctors/:id/availability`
- **Purpose:** Toggle doctor availability status (e.g., active, on-break, on-emergency-call).
- **Access:** `ADMIN`, `DOCTOR` (own ID)

---

## 3. Patient Management

### 3.1 `POST /api/v1/patients`
- **Purpose:** Register a new patient.
- **Access:** `ADMIN`, `RECEPTIONIST`
- **Request Body:**
  ```json
  {
    "fullName": "Robert Chen",
    "gender": "MALE",
    "dateOfBirth": "1988-06-15",
    "phone": "+1-555-0199",
    "bloodGroup": "O_POSITIVE",
    "emergencyContact": "Jane Chen (+1-555-0188)"
  }
  ```
- **Response (201 Created):** Patient object with auto-generated `medicalRecordNumber`.

### 3.2 `GET /api/v1/patients/search`
- **Purpose:** Lookup patient by phone, MRN, or name.
- **Access:** `ADMIN`, `RECEPTIONIST`, `DOCTOR`

---

## 4. Appointment Lifecycle

### 4.1 `POST /api/v1/appointments`
- **Purpose:** Book an outpatient consultation slot.
- **Access:** `ADMIN`, `RECEPTIONIST`, `PATIENT`
- **Request Body:**
  ```json
  {
    "patientId": "e4b3c2a1-...",
    "doctorId": "d3a2b1c0-...",
    "departmentId": "a1b2c3d4-...",
    "scheduledAt": "2026-10-30T10:30:00Z",
    "reason": "Persistent migraine and blurred vision"
  }
  ```
- **Response (201 Created):** Created appointment record with `status: "SCHEDULED"`.
- **Validation:** Ensures doctor is on shift and time slot is not double-booked.

### 4.2 `PATCH /api/v1/appointments/:id/cancel`
- **Purpose:** Cancel an existing appointment with reason.
- **Access:** `ADMIN`, `RECEPTIONIST`, `PATIENT` (own appointment)

---

## 5. Queue Operations & Check-In

### 5.1 `POST /api/v1/queue/check-in`
- **Purpose:** Check in an appointment, perform vital triage assessment, allocate daily queue token, and calculate EWT.
- **Access:** `ADMIN`, `RECEPTIONIST`
- **Request Body:**
  ```json
  {
    "appointmentId": "7c9e6679-...",
    "vitals": {
      "systolicBP": 138,
      "diastolicBP": 88,
      "heartRate": 82,
      "oxygenSaturation": 98.0,
      "temperatureCelsius": 37.1,
      "painScore": 4,
      "respiratoryDistress": false,
      "alteredMentalState": false
    }
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "queueEntryId": "9b1deb4d-...",
    "tokenDisplay": "GEN-014",
    "tokenNumber": 14,
    "calculatedTier": 4,
    "triageExplanation": "Standard adult vitals, pain score <= 5, no respiratory distress.",
    "estimatedWaitMinutes": 32,
    "predictionSource": "ML_MODEL",
    "status": "WAITING"
  }
  ```

### 5.2 `GET /api/v1/queue/department/:departmentId`
- **Purpose:** Fetch the active waiting queue for a department, sorted by current `dynamicPriorityScore DESC`.
- **Access:** `ADMIN`, `RECEPTIONIST`, `DOCTOR`

### 5.3 `POST /api/v1/queue/consultation/call-next`
- **Purpose:** Doctor calls the next highest-priority patient in their queue.
- **Access:** `DOCTOR`
- **Request Body:** `{ "doctorId": "d3a2b1c0-..." }`
- **Response (200 OK):** Active consultation payload with patient triage details.

### 5.4 `POST /api/v1/queue/consultation/complete`
- **Purpose:** Conclude the active consultation and update queue state.
- **Access:** `DOCTOR`
- **Request Body:**
  ```json
  {
    "queueEntryId": "9b1deb4d-...",
    "clinicalNotes": "Patient examined; tension headache diagnosed. Prescribed rest and analgesics.",
    "diagnosis": "Tension Headache (G44.2)",
    "prescriptionSummary": "Ibuprofen 400mg PRN"
  }
  ```
- **Response (200 OK):** Updated queue entry status `COMPLETED`.

### 5.5 `POST /api/v1/queue/:id/triage-override`
- **Purpose:** Manually adjust urgency tier with clinical audit reasoning.
- **Access:** `DOCTOR`, `RECEPTIONIST`
- **Request Body:**
  ```json
  {
    "newTier": 2,
    "reason": "Patient exhibited sudden onset severe dizziness and pallor at reception."
  }
  ```
- **Response (200 OK):** Updated queue entry with recalculated dynamic priority score.

---

## 6. Machine Learning Prediction Service Contract (FastAPI)

### 6.1 `POST http://localhost:8000/predict`
- **Purpose:** Receive queue feature payload and return predicted waiting time in minutes.
- **Request Body:**
  ```json
  {
    "queue_position": 4,
    "patients_ahead": 3,
    "active_consultations_count": 2,
    "department_code": "CARD",
    "hour_of_day": 10,
    "day_of_week": 3,
    "doctor_experience_years": 8,
    "urgency_tier": 3
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "predicted_wait_minutes": 27.4,
    "confidence_interval": [23.1, 31.7],
    "model_version": "v1.2.0-rf",
    "model_name": "RandomForestRegressor",
    "latency_ms": 14.2
  }
  ```

### 6.2 `GET http://localhost:8000/health`
- **Purpose:** Service liveness and model readiness probe.
- **Response (200 OK):** `{"status": "ready", "loaded_model_version": "v1.2.0-rf"}`

---

## 7. Analytics & Reports

### 7.1 `GET /api/v1/analytics/summary`
- **Purpose:** Executive KPIs (total visits, avg wait time, doctor utilization, tier breakdown).
- **Access:** `ADMIN`

### 7.2 `GET /api/v1/analytics/queue-performance`
- **Purpose:** Hourly throughput, waiting time percentiles (50th, 90th, max), and starvation violation alerts.
- **Access:** `ADMIN`, `DOCTOR`
