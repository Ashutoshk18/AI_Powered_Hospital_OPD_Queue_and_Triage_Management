# OPD Queue Discipline, Triage Policy & Anti-Starvation Mechanism

## 1. Problem Context: The Trilemma of Hospital OPD Queues
Hospital outpatient scheduling faces three conflicting goals:
1. **Clinical Responsiveness:** High-urgency patients should be examined with minimal delay.
2. **Fairness / Anti-Starvation:** Low-urgency patients who arrived hours earlier must not be perpetually leapfrogged by later-arriving higher-priority walk-ins.
3. **Resource Efficiency:** Doctors must maintain high utilization without idle gaps between consultations.

Conventional First-Come, First-Served (FCFS) queues optimize for arrival fairness but compromise clinical safety. Pure static priority queues optimize for urgency but result in severe starvation of routine cases during peak arrival hours.

---

## 2. Standardized Urgency Triage Tiers

The system implements a 5-tier urgency classification adapted for outpatient ambulatory care (derived from principles of the Emergency Severity Index (ESI) and Manchester Triage System (MTS), adapted specifically for outpatient clinics):

| Urgency Tier | Clinical Category | Target Max Wait Time | Base Urgency Weight ($W_{\text{tier}}$) | Illustrative Criteria | Routing Action |
| :---: | :--- | :---: | :---: | :--- | :--- |
| **Tier 1** | Resuscitation / Immediate | 0 mins | N/A | Cardiac arrest, anaphylaxis, severe respiratory arrest | Auto-redirect to Emergency Department (ED/Casualty) |
| **Tier 2** | Emergent / High Urgency | $\le 15$ mins | 120 | Severe chest pain, SpO2 < 90%, acute trauma, pain 9-10 | Top priority in departmental OPD |
| **Tier 3** | Urgent / Moderate | $\le 45$ mins | 70 | High fever (>39°C), severe asthma flare, pain 6-8 | Priority queue entry |
| **Tier 4** | Standard / Routine | $\le 90$ mins | 35 | Chronic disease follow-up, mild cough, pain 1-5 | Standard queue progression |
| **Tier 5** | Minor / Administrative | $\le 120$ mins | 10 | Prescription refills, medical certificates, suture removal | Standard queue with anti-starvation boost |

> **Ethical & Safety Notice:** The software triage scoring operates as a decision-support heuristic. It does not provide medical diagnoses or replace physician judgment. Tier 1 cases immediately alert staff and bypass OPD queues.

---

## 3. Dynamic Priority Scoring with Time Aging

To prevent starvation of Tier 4 and Tier 5 patients, the system computes a time-dependent **Dynamic Priority Score** recalculated periodically and upon queue events:

$$\text{PriorityScore}(i, t) = W_{\text{tier}}(i) + \alpha \cdot \left( \frac{t - t_{\text{check-in}}(i)}{\Delta t_{\text{unit}}} \right)$$

Where:
- $W_{\text{tier}}(i)$ is the static base urgency weight from the table above.
- $t$ is the current evaluation timestamp (UTC).
- $t_{\text{check-in}}(i)$ is the patient's verified check-in timestamp.
- $\alpha$ is the configurable **Aging Rate Coefficient** (default: $\alpha = 1.0$ points per minute).
- $\Delta t_{\text{unit}} = 1$ minute.

### Starvation Prevention Dynamics
Consider an arriving Tier 2 patient ($W = 120$) versus a Tier 4 patient ($W = 35$) who has been waiting for 85 minutes:
$$\text{PriorityScore}_{\text{Tier 4}}(85) = 35 + (1.0 \times 85) = 120$$
At $t = 86$ minutes, the Tier 4 patient's score reaches $121$, correctly surpassing a newly arrived Tier 2 patient. This mathematically guarantees that no patient can be starved indefinitely, bounding the maximum waiting time.

---

## 4. Deterministic Queue Ordering & Tie-Breaking

When the doctor requests the next patient via `POST /api/v1/queue/consultation/call-next`, the selection query executes:

```sql
SELECT * FROM queue_entries
WHERE department_id = $1
  AND status = 'WAITING'
  AND queue_date = CURRENT_DATE
ORDER BY
  dynamic_priority_score DESC,
  check_in_time ASC,
  token_number ASC
LIMIT 1;
```

### Tie-Breaking Rules:
1. **Primary Sort:** Highest `dynamic_priority_score`.
2. **Secondary Sort (Tie-Breaker 1):** Earliest `check_in_time` (First-Come First-Served within identical priority).
3. **Tertiary Sort (Tie-Breaker 2):** Lowest numerical `token_number` (ensures absolute determinism).

---

## 5. Triage Overrides & Audit Governance

1. **Authorized Roles:** Only authenticated users with `DOCTOR` or `RECEPTIONIST` privileges may override a patient's tier.
2. **Mandatory Clinical Justification:** Overrides require a non-empty string explaining the reason (minimum 10 characters).
3. **Immutability:** The original calculated tier is preserved; an audit log entry records the modifier, timestamp, previous tier, new tier, and rationale.

---

## 6. Concurrency & Integrity Controls

Token allocation and queue state transitions are protected by database transactions:
- When a receptionist checks in a patient, the system acquires a row lock or leverages PostgreSQL's transactional sequence increment for the daily token counter.
- A composite unique constraint on `(department_id, queue_date, token_number)` enforces that two concurrent requests can never generate duplicate tokens.
- Transitioning a patient from `WAITING` to `IN_CONSULTATION` uses conditional row-level updates (`WHERE status = 'WAITING'`) to guarantee idempotency and avoid double-calling.
