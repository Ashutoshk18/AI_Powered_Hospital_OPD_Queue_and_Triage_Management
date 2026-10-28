# Relational Database Design & Schema Specification

## 1. Overview & Principles
The database is designed in third normal form (3NF) to guarantee data integrity, eliminate redundancy, and maintain explicit referential constraints. It is managed using **Prisma ORM** targeting **PostgreSQL**.

Key design choices:
- **UUID Primary Keys:** Prevent predictable sequence enumeration attacks and support distributed entity creation.
- **Strict Timezone Policy:** All timestamps are persisted in `TIMESTAMPTZ` (UTC). Conversions to hospital-local time (e.g., Asia/Kolkata or America/New_York) occur strictly at the presentation layer.
- **Concurrency Isolation:** Departmental token counters utilize unique composite keys `(departmentId, date, tokenNumber)` to prevent duplicate token assignment.
- **Audit Trails:** Immutable event logs record critical state modifications with before/after payloads.

---

## 2. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    User ||--o{ Patient : "owns (if role=PATIENT)"
    User ||--o{ Doctor : "owns (if role=DOCTOR)"
    User ||--o{ AuditLog : "initiates"

    Department ||--o{ Doctor : "employs"
    Department ||--o{ Appointment : "hosts"
    Department ||--o{ QueueEntry : "queues"

    Doctor ||--o{ DoctorShift : "has"
    Doctor ||--o{ Appointment : "conducts"
    Doctor ||--o{ QueueEntry : "consults"

    Patient ||--o{ Appointment : "books"
    Patient ||--o{ QueueEntry : "undergoes"

    Appointment ||--o| QueueEntry : "progresses to"
    
    QueueEntry ||--o| TriageAssessment : "evaluated by"
    QueueEntry ||--o| ConsultationRecord : "results in"
    QueueEntry ||--o{ TriageOverride : "may receive"

    User {
        uuid id PK
        string email UK
        string passwordHash
        string fullName
        enum role
        boolean isActive
        timestamp createdAt
        timestamp updatedAt
    }

    Department {
        uuid id PK
        string code UK
        string name
        int avgConsultationMinutes
        boolean isActive
    }

    Doctor {
        uuid id PK
        uuid userId FK
        uuid departmentId FK
        string specialization
        int experienceYears
        string roomNumber
        boolean isAvailable
    }

    Patient {
        uuid id PK
        uuid userId FK
        string medicalRecordNumber UK
        string gender
        date dateOfBirth
        string phone
        string bloodGroup
        string emergencyContact
    }

    Appointment {
        uuid id PK
        uuid patientId FK
        uuid doctorId FK
        uuid departmentId FK
        timestamp scheduledAt
        enum status
        string reason
        timestamp createdAt
    }

    QueueEntry {
        uuid id PK
        uuid appointmentId FK UK
        uuid departmentId FK
        uuid doctorId FK
        date queueDate
        int tokenNumber
        string tokenDisplay UK
        enum status
        int initialTriageTier
        float dynamicPriorityScore
        timestamp checkInTime
        timestamp consultationStartTime
        timestamp consultationEndTime
        int estimatedWaitMinutes
        string waitTimePredictionSource
    }

    TriageAssessment {
        uuid id PK
        uuid queueEntryId FK UK
        float systolicBP
        float diastolicBP
        float heartRate
        float oxygenSaturation
        float temperatureCelsius
        float painScore
        boolean respiratoryDistress
        boolean alteredMentalState
        int calculatedTier
        string explanation
        timestamp assessedAt
    }

    TriageOverride {
        uuid id PK
        uuid queueEntryId FK
        uuid overriddenByUserId FK
        int previousTier
        int newTier
        string reason
        timestamp overriddenAt
    }

    ConsultationRecord {
        uuid id PK
        uuid queueEntryId FK UK
        string chiefComplaint
        string clinicalNotes
        string diagnosis
        string prescriptionSummary
        int actualDurationMinutes
        timestamp completedAt
    }

    AuditLog {
        uuid id PK
        uuid userId FK
        string action
        string entityType
        string entityId
        jsonb metadata
        string ipAddress
        timestamp timestamp
    }
```

---

## 3. Detailed Table Definitions & Constraints

### 3.1 Users (`users`)
- `id`: UUID (Primary Key, default: `gen_random_uuid()`)
- `email`: VARCHAR(255) UNIQUE NOT NULL (Indexed)
- `passwordHash`: VARCHAR(255) NOT NULL
- `fullName`: VARCHAR(150) NOT NULL
- `role`: ENUM (`ADMIN`, `RECEPTIONIST`, `DOCTOR`, `PATIENT`) NOT NULL
- `isActive`: BOOLEAN NOT NULL DEFAULT true
- `createdAt`, `updatedAt`: TIMESTAMPTZ NOT NULL

### 3.2 Departments (`departments`)
- `id`: UUID (Primary Key)
- `code`: VARCHAR(10) UNIQUE NOT NULL (e.g., `CARD`, `ORTH`, `PEDI`, `GENM`)
- `name`: VARCHAR(100) NOT NULL
- `avgConsultationMinutes`: INTEGER NOT NULL DEFAULT 15
- `isActive`: BOOLEAN NOT NULL DEFAULT true

### 3.3 Doctors (`doctors`)
- `id`: UUID (Primary Key)
- `userId`: UUID UNIQUE NOT NULL (FK $\rightarrow$ `users.id` ON DELETE CASCADE)
- `departmentId`: UUID NOT NULL (FK $\rightarrow$ `departments.id` ON DELETE RESTRICT)
- `specialization`: VARCHAR(100) NOT NULL
- `experienceYears`: INTEGER NOT NULL DEFAULT 1
- `roomNumber`: VARCHAR(20) NOT NULL
- `isAvailable`: BOOLEAN NOT NULL DEFAULT true

### 3.4 Patients (`patients`)
- `id`: UUID (Primary Key)
- `userId`: UUID UNIQUE (FK $\rightarrow$ `users.id` ON DELETE SET NULL, optional if registered by receptionist)
- `medicalRecordNumber`: VARCHAR(30) UNIQUE NOT NULL (e.g., `MRN-2026-0001`)
- `gender`: VARCHAR(10) NOT NULL
- `dateOfBirth`: DATE NOT NULL
- `phone`: VARCHAR(20) NOT NULL (Indexed)
- `bloodGroup`: VARCHAR(5)
- `emergencyContact`: VARCHAR(50)

### 3.5 Appointments (`appointments`)
- `id`: UUID (Primary Key)
- `patientId`: UUID NOT NULL (FK $\rightarrow$ `patients.id` ON DELETE RESTRICT)
- `doctorId`: UUID NOT NULL (FK $\rightarrow$ `doctors.id` ON DELETE RESTRICT)
- `departmentId`: UUID NOT NULL (FK $\rightarrow$ `departments.id` ON DELETE RESTRICT)
- `scheduledAt`: TIMESTAMPTZ NOT NULL
- `status`: ENUM (`SCHEDULED`, `CHECKED_IN`, `IN_CONSULTATION`, `COMPLETED`, `CANCELLED`, `NO_SHOW`) NOT NULL DEFAULT `SCHEDULED`
- `reason`: TEXT
- `createdAt`: TIMESTAMPTZ NOT NULL DEFAULT now()
- **Indexes:** `(doctorId, scheduledAt)`, `(patientId, scheduledAt)`, `(status)`

### 3.6 Queue Entries (`queue_entries`)
- `id`: UUID (Primary Key)
- `appointmentId`: UUID UNIQUE NOT NULL (FK $\rightarrow$ `appointments.id` ON DELETE RESTRICT)
- `departmentId`: UUID NOT NULL (FK $\rightarrow$ `departments.id` ON DELETE RESTRICT)
- `doctorId`: UUID NOT NULL (FK $\rightarrow$ `doctors.id` ON DELETE RESTRICT)
- `queueDate`: DATE NOT NULL
- `tokenNumber`: INTEGER NOT NULL
- `tokenDisplay`: VARCHAR(20) NOT NULL (e.g., `CARD-007`)
- `status`: ENUM (`WAITING`, `CALLED`, `IN_CONSULTATION`, `COMPLETED`, `CANCELLED`, `NO_SHOW`) NOT NULL DEFAULT `WAITING`
- `initialTriageTier`: INTEGER NOT NULL (Range: 1 to 5)
- `dynamicPriorityScore`: DOUBLE PRECISION NOT NULL
- `checkInTime`: TIMESTAMPTZ NOT NULL DEFAULT now()
- `consultationStartTime`: TIMESTAMPTZ
- `consultationEndTime`: TIMESTAMPTZ
- `estimatedWaitMinutes`: INTEGER NOT NULL
- `waitTimePredictionSource`: VARCHAR(20) NOT NULL DEFAULT `ML_MODEL` (Values: `ML_MODEL`, `FALLBACK_RULE`)
- **Unique Constraint:** `(departmentId, queueDate, tokenNumber)`
- **Indexes:** `(departmentId, status, queueDate)`, `(doctorId, status)`

### 3.7 Triage Assessments (`triage_assessments`)
- `id`: UUID (Primary Key)
- `queueEntryId`: UUID UNIQUE NOT NULL (FK $\rightarrow$ `queue_entries.id` ON DELETE CASCADE)
- `systolicBP`: DOUBLE PRECISION
- `diastolicBP`: DOUBLE PRECISION
- `heartRate`: DOUBLE PRECISION
- `oxygenSaturation`: DOUBLE PRECISION (SpO2 percentage)
- `temperatureCelsius`: DOUBLE PRECISION
- `painScore`: INTEGER (0 to 10 scale)
- `respiratoryDistress`: BOOLEAN NOT NULL DEFAULT false
- `alteredMentalState`: BOOLEAN NOT NULL DEFAULT false
- `calculatedTier`: INTEGER NOT NULL (1 to 5)
- `explanation`: TEXT NOT NULL
- `assessedAt`: TIMESTAMPTZ NOT NULL DEFAULT now()

### 3.8 Triage Overrides (`triage_overrides`)
- `id`: UUID (Primary Key)
- `queueEntryId`: UUID NOT NULL (FK $\rightarrow$ `queue_entries.id` ON DELETE CASCADE)
- `overriddenByUserId`: UUID NOT NULL (FK $\rightarrow$ `users.id` ON DELETE RESTRICT)
- `previousTier`: INTEGER NOT NULL
- `newTier`: INTEGER NOT NULL
- `reason`: TEXT NOT NULL
- `overriddenAt`: TIMESTAMPTZ NOT NULL DEFAULT now()

### 3.9 Consultation Records (`consultation_records`)
- `id`: UUID (Primary Key)
- `queueEntryId`: UUID UNIQUE NOT NULL (FK $\rightarrow$ `queue_entries.id` ON DELETE RESTRICT)
- `chiefComplaint`: TEXT
- `clinicalNotes`: TEXT NOT NULL
- `diagnosis`: TEXT
- `prescriptionSummary`: TEXT
- `actualDurationMinutes`: INTEGER NOT NULL
- `completedAt`: TIMESTAMPTZ NOT NULL DEFAULT now()

### 3.10 Audit Logs (`audit_logs`)
- `id`: UUID (Primary Key)
- `userId`: UUID (FK $\rightarrow$ `users.id` ON DELETE SET NULL)
- `action`: VARCHAR(100) NOT NULL
- `entityType`: VARCHAR(50) NOT NULL
- `entityId`: VARCHAR(100) NOT NULL
- `metadata`: JSONB
- `ipAddress`: VARCHAR(45)
- `timestamp`: TIMESTAMPTZ NOT NULL DEFAULT now()
- **Index:** `(entityType, entityId)`, `(timestamp)`

---

## 4. Migration & Seed Strategy
1. **Prisma Migrations:** Changes to the relational schema are tracked via versioned SQL migration files generated by `npx prisma migrate dev`.
2. **Synthetic Seed Pipeline:** Running `npm run seed` populates the database with:
   - 4 default role accounts (`admin@opd.org`, `reception@opd.org`, `dr.sharma@opd.org`, `patient.john@opd.org`).
   - 5 clinical departments (Cardiology, Orthopedics, Pediatrics, General Medicine, Dermatology).
   - 10 synthetic doctors with shifts and varying consultation duration profiles.
   - 50 synthetic patient profiles with realistic appointment and triage history.
