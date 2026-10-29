# Testing Strategy, Test Suites & Verification

## 1. Testing Philosophy & Test Pyramid

Our testing framework follows a rigorous verification pyramid:
1. **Unit Tests:** Fast, isolated tests for validation schemas, dynamic priority calculation, aging formulas, and ML feature encoders.
2. **Integration Tests:** Supertest-driven API tests verifying controllers, Prisma database operations, transactions, and RBAC guards.
3. **Frontend Component Tests:** Vitest and Testing Library tests validating forms, status cards, and role-based views.
4. **Reliability & Fault-Tolerance Tests:** Simulating ML service failure/timeouts, race conditions in token issuance, and invalid state transitions.
5. **Python ML Tests:** Pytest validation of dataset generation, zero target leakage, model artifact loading, and prediction schema integrity.

---

## 2. Test Execution Commands & Verified Results

| Scope | Test Command | Target Framework | Verified Results | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Backend API Tests** | `npm --prefix apps/api test` | Vitest + Supertest | 14 passed (3 test files) | ✅ PASSED |
| **Frontend Tests** | `npm --prefix apps/web test` | Vitest + Testing Library | 26 passed (1 test file) | ✅ PASSED |
| **Python ML Tests** | `pytest services/ml/tests` | Pytest | 4 passed (1 test file) | ✅ PASSED |
| **Web Production Build** | `npm --prefix apps/web run build` | Vite + TypeScript | `dist/` bundle generated (0 errors) | ✅ PASSED |
| **Discrete Simulation** | `python research/experiments/run_simulation.py` | Python / NumPy | 50 days $\times$ 3 policies executed | ✅ VERIFIED |
| **Research Charts** | `python research/experiments/generate_charts.py` | Matplotlib | 5 benchmark charts generated | ✅ VERIFIED |

---

## 3. Actual Test Suite Outputs

### Backend Tests (`apps/api`)
```
 RUN  v2.1.9 apps/api

 ✓ tests/health.test.ts (1 test)
 ✓ tests/queue_and_triage.test.ts (8 tests)
   - computes correct base priority scores for all 5 tiers
   - promotes long-waiting lower-urgency patient ahead of newly arrived higher-urgency patient
   - checks in patient, allocates daily token, and evaluates vitals (ML fallback verified)
   - returns department queue sorted by dynamic priority descending
   - allows doctor to override triage tier with reason and records audit log
   - doctor calls next highest-priority patient
   - doctor completes consultation, marks entry COMPLETED, and records notes
   - prevents unauthorized role from calling next patient (HTTP 403)
 ✓ tests/auth.test.ts (5 tests)
   - registers new user and patient profile
   - logs in with valid credentials and returns JWT
   - rejects login with invalid password (HTTP 401)
   - rejects access to protected endpoint without token
   - enforces role-based access control for administrative routes

 Test Files  3 passed (3)
      Tests  14 passed (14)
```

### Frontend Tests (`apps/web`)
```
 RUN  v2.1.9 apps/web

 ✓ tests/components.test.tsx (26 tests)
   - TriageBadge renders "Tier 1" to "Tier 5" token text
   - TriageBadge applies color-coded background styling
   - TriageBadge shows detailed clinical label when showDetails=true
   - TriageBadge falls back to Tier 4 style for unknown tier
   - StatusBadge renders WAITING, IN_CONSULTATION, COMPLETED, SCHEDULED, CANCELLED, CALLED
   - LoginPage renders email input and submit button
   - LoginPage renders demo account quick-fill buttons
   - LoginPage shows error message on invalid credentials
   - LoginPage calls api.login and disables button while authenticating

 Test Files  1 passed (1)
      Tests  26 passed (26)
```

### Python ML Tests (`services/ml`)
```
============================= test session starts =============================
platform win32 -- Python 3.13.3, pytest-9.2.0

services/ml/tests/test_ml_pipeline.py::test_model_artifact_exists_and_loads PASSED
services/ml/tests/test_ml_pipeline.py::test_health_check_function PASSED
services/ml/tests/test_ml_pipeline.py::test_predict_wait_time_function_valid PASSED
services/ml/tests/test_ml_pipeline.py::test_prediction_request_validation PASSED

============================== 4 passed in 2.71s ==============================
```

---

## 4. Critical Verification Scenarios

### Scenario 1: Concurrency & Duplicate Token Prevention
- **Test:** Fire simultaneous check-in requests for the same department on the same calendar day.
- **Assertion:** Monotonically increasing sequential tokens generated per department; enforced by composite unique constraint `(departmentId, queueDate, tokenNumber)`.

### Scenario 2: Anti-Starvation Dynamic Aging
- **Test:** Enqueue Tier 4 patient ($W=35$) followed by Tier 2 patient ($W=120$). Advance queue time by 90 minutes.
- **Assertion:** Tier 4 priority score ($35 + 90 = 125$) surpasses newly arrived Tier 2 ($120$), preventing starvation. Verified in `tests/queue_and_triage.test.ts`.

### Scenario 3: ML Microservice Failure & Fallback
- **Test:** Simulate the Python ML service being offline during check-in.
- **Assertion:** The check-in API does NOT throw 500 error; it gracefully returns a deterministic rule-based wait time with `waitTimePredictionSource: "FALLBACK_RULE"`. Verified in `tests/queue_and_triage.test.ts`.

### Scenario 4: Role-Based Access Enforcements
- **Test:** Authenticate as a `PATIENT` and issue a `POST /api/v1/queue/consultation/call-next` request.
- **Assertion:** Server immediately responds with HTTP 403 Forbidden without altering database state. Verified in `tests/queue_and_triage.test.ts`.

### Scenario 5: Deterministic Tie-Breaking
- **Test:** Enqueue two patients with identical Tier and equal waiting times.
- **Assertion:** Queue order deterministically breaks ties using earliest `checkInTime ASC`, followed by lowest `tokenNumber ASC`. Verified in `src/services/queue.service.ts`.
