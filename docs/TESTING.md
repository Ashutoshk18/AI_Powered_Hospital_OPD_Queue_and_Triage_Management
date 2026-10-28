# Testing Strategy, Test Suites & Verification

## 1. Testing Philosophy & Test Pyramid

Our testing framework follows a rigorous verification pyramid:
1. **Unit Tests:** Fast, isolated tests for validation schemas, dynamic priority calculation, aging formulas, and ML feature encoders.
2. **Integration Tests:** Supertest-driven API tests verifying controllers, Prisma database operations, transactions, and RBAC guards.
3. **Frontend Component Tests:** Vitest and Testing Library tests validating forms, status cards, and role-based views.
4. **Reliability & Fault-Tolerance Tests:** Simulating ML service failure/timeouts, race conditions in token issuance, and invalid state transitions.
5. **Python ML Tests:** Pytest validation of dataset generation, zero target leakage, model artifact loading, and prediction schema integrity.

---

## 2. Test Execution Commands

| Scope | Test Command | Target Framework |
| :--- | :--- | :--- |
| **Backend API & Unit Tests** | `npm --prefix apps/api test` | Vitest + Supertest |
| **Frontend Tests** | `npm --prefix apps/web test` | Vitest + React Testing Library |
| **Python ML Tests** | `pytest services/ml/tests` | Pytest |
| **End-to-End Workflow Verification** | `npm run test:e2e` | Custom automated pipeline |
| **Full Project Test Suite** | `npm test` | Root test runner across all packages |

---

## 3. Critical Verification Scenarios

### Scenario 1: Concurrency & Duplicate Token Prevention
- **Test:** Fire 10 simultaneous check-in requests for the same department on the same calendar day.
- **Assertion:** Exactly 10 unique, monotonically increasing sequential tokens are generated; zero duplicate tokens; zero unhandled transaction rollbacks.

### Scenario 2: Anti-Starvation Dynamic Aging
- **Test:** Enqueue a Tier 4 patient ($W=35$) followed 30 minutes later by a Tier 2 patient ($W=120$). Advance simulated queue clock by 90 minutes.
- **Assertion:** The Tier 4 patient's dynamic priority score ($35 + 90 = 125$) surpasses the newly arrived Tier 2 patient ($120$), selecting the long-waiting patient first.

### Scenario 3: ML Microservice Failure & Fallback
- **Test:** Simulate the Python ML service being offline (or exceeding 3000ms response timeout) during check-in.
- **Assertion:** The check-in API does NOT throw 500 error; it gracefully returns a deterministic rule-based wait time with `waitTimePredictionSource: "FALLBACK_RULE"`.

### Scenario 4: Role-Based Access Enforcements
- **Test:** Authenticate as a `PATIENT` and issue a `POST /api/v1/queue/consultation/call-next` request.
- **Assertion:** Server immediately responds with HTTP 403 Forbidden without altering database state.

### Scenario 5: Deterministic Tie-Breaking
- **Test:** Enqueue two patients with identical Tier and equal waiting times.
- **Assertion:** Queue order deterministically breaks ties using earliest `checkInTime ASC`, followed by lowest `tokenNumber ASC`.
