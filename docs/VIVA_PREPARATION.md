# Viva Voce Defense Guide & Technical Justification

This document equips students to defend every design decision, algorithm, and architectural trade-off during the final-year B.Tech project examination.

---

## 1. Architectural & Technology Selection Questions

### Q1: Why did you build a Modular Monolith with a single ML microservice rather than full microservices?
**Defensible Answer:**
"Full microservices introduce distributed transaction coordination (Saga pattern or two-phase commit), network latency between services, distributed tracing overhead, and complex infrastructure (Kafka/Kubernetes). For hospital outpatient operations, patient check-in, token generation, and doctor consultation require strict ACID consistency within a single department. A modular monolith using Node.js, Express, and PostgreSQL guarantees transactional atomicity without distributed transaction failures. 
However, Python is the standard ecosystem for machine learning (scikit-learn, NumPy). Running ML in a separate lightweight FastAPI service creates a clean service boundary, prevents Python ML computations from blocking the Node event loop, and allows graceful fallback if the ML service becomes unreachable."

### Q2: Why PostgreSQL and Prisma ORM over MongoDB / NoSQL?
**Defensible Answer:**
"Queue management is inherently relational: a patient has appointments, an appointment generates a queue entry, and a queue entry belongs to a department and doctor. Crucially, issuing sequential daily tokens (e.g., `CARD-014`) requires uniqueness across `(departmentId, queueDate, tokenNumber)`. PostgreSQL provides robust ACID transactions, table-level and row-level locks, and foreign key constraints that prevent orphaned records. Prisma provides compile-time TypeScript type safety directly synchronized with database schemas."

---

## 2. Queue Mechanics & Triage Policy Questions

### Q3: How do you prevent low-urgency patients from starving if urgent patients keep arriving?
**Defensible Answer:**
"We implemented a Dynamic Priority Queue with an Aging Coefficient ($\alpha$):
$$\text{PriorityScore} = W_{\text{tier}} + \alpha \cdot \text{ElapsedMinutesWaiting}$$
A newly arrived Tier 2 patient has a base urgency weight of 120. A routine Tier 4 patient has a base weight of 35. With $\alpha = 1.0$, after 85 minutes of waiting, the Tier 4 patient's score reaches 120. At minute 86, the routine patient's score reaches 121, mathematically prioritizing them ahead of any newly arriving Tier 2 patient. This bounds the maximum waiting time and eliminates indefinite starvation."

### Q4: What happens if two patients have the exact same priority score? How are ties broken?
**Defensible Answer:**
"We enforce a deterministic, multi-level tie-breaking policy in our SQL query:
1. Primary sort: `dynamic_priority_score DESC`
2. Secondary sort: `check_in_time ASC` (First-Come First-Served within identical priority)
3. Tertiary sort: `token_number ASC` (guarantees absolute determinism and zero ambiguity)."

### Q5: Is your system diagnosing patients or replacing doctors?
**Defensible Answer:**
"No. The triage engine is strictly an administrative operational prioritization tool, not a medical diagnostic system. It computes urgency scores based on vital thresholds (e.g., SpO2, heart rate, pain score) to sequence consultations. Furthermore:
1. Immediate life-threatening cases (Tier 1) bypass the OPD queue entirely and redirect immediately to the Emergency Room.
2. Clinical staff can manually override any system-assigned tier at any time by entering a mandatory clinical justification, which is recorded in an immutable audit log."

---

## 3. Machine Learning & Estimation Questions

### Q6: How do you prevent data leakage (target leakage) in waiting time prediction?
**Defensible Answer:**
"Target leakage occurs when features contain information only available after the event occurs. We strictly restrict feature inputs to data available at the exact instant of check-in: queue position, number of waiting patients ahead, count of currently active doctor consultations, hour of day, and department code. We explicitly exclude downstream information like actual doctor consultation durations for future patients, unannounced doctor breaks, or future walk-ins."

### Q7: What happens if the Python ML prediction service crashes or network fails?
**Defensible Answer:**
"The Node.js backend wraps all calls to the ML service in an HTTP client with a 3000ms timeout and a fallback catch block. If the ML service times out or errors, the backend immediately executes a deterministic rule-based calculation ($\text{patients\_ahead} \times \text{avg\_department\_duration}$), sets `predictionSource = 'FALLBACK_RULE'`, and completes the check-in without failing the user's request. Hospital operations never halt due to an ML downtime."

### Q8: Why did you compare Random Forest against a baseline and Linear Regression?
**Defensible Answer:**
"In academic research, a complex model is only justified if it measurably outperforms a simple baseline. We established two baselines:
1. The standard hospital heuristic (patients ahead $\times$ average duration).
2. An Ordinary Least Squares (OLS) linear model.
Random Forest regression proved superior because queue dynamics exhibit non-linear interactions—such as non-linear queuing delays during morning peak arrival bursts and specialty-dependent duration variance."
