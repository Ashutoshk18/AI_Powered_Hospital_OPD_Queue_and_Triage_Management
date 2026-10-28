# Research Plan & Experimental Methodology

## 1. Research Questions (RQs)

- **RQ1 (Predictive Accuracy):** Can a supervised machine learning model (e.g., Random Forest Regressor) predict patient outpatient waiting times with significantly lower error (MAE/RMSE) compared to traditional static queue-position heuristics?
- **RQ2 (Clinical Urgency vs. Delay):** Does a multi-tier dynamic urgency queue policy reduce the mean and 90th percentile waiting times for high-urgency (Tier 2/3) patients compared to standard First-Come, First-Served (FCFS)?
- **RQ3 (Anti-Starvation Trade-Offs):** What is the optimal aging rate ($\alpha$) that bounds maximum waiting times for routine (Tier 4/5) patients while preserving priority responsiveness for emergent walk-ins?
- **RQ4 (Doctor Utilization & Throughput):** Does dynamic triage scheduling introduce doctor idle gaps, or does it maintain equivalent overall clinic throughput compared to FCFS?

---

## 2. Experimental Hypotheses

- **Hypothesis 1 ($H_1$):** Random Forest regression will achieve at least a $25\%$ reduction in Mean Absolute Error (MAE) relative to the baseline position-multiplier heuristic ($p < 0.01$).
- **Hypothesis 2 ($H_2$):** Dynamic triage prioritization with linear aging will achieve a $>50\%$ reduction in waiting time for Tier 2 cases without increasing Tier 4/5 maximum wait times beyond the clinically acceptable threshold of 120 minutes.
- **Hypothesis 3 ($H_3$):** Overall departmental throughput (patients completed per hour) will remain within $\pm 2\%$ of FCFS, proving that clinical prioritization does not compromise clinical resource utilization.

---

## 3. Experimental Setup & Simulation Framework

### 3.1 Simulation Engine Architecture
A discrete-event simulation script (`research/experiments/run_simulation.py`) evaluates queue dynamics under reproducible synthetic scenarios:
- **Arrival Process:** Poisson arrivals with time-varying arrival rate $\lambda(t)$ modeling morning rushes (08:30 - 11:00) and afternoon surges.
- **Service Process:** Log-normal service durations calibrated by department specialty.
- **Triage Mix Distribution:**
  - Tier 2 (Emergent): 8%
  - Tier 3 (Urgent): 22%
  - Tier 4 (Routine): 55%
  - Tier 5 (Minor): 15%
- **Replication Count:** 50 independent simulated clinic days per policy configuration, initialized with different deterministic random seeds.

### 3.2 Evaluated Policies (Paired Comparisons)
1. **Policy A: First-Come, First-Served (FCFS Baseline):** Strictly orders consultations by check-in timestamp.
2. **Policy B: Pure Static Priority (PSP):** Orders strictly by Urgency Tier ($W_{\text{tier}}$) with no aging factor ($\alpha = 0$).
3. **Policy C: Proposed Dynamic Aging Priority (DAP):** Balances urgency weight and elapsed waiting time ($\alpha = 1.0$).

---

## 4. Evaluated Metrics

| Metric Dimension | Specific Formula / Measure | Purpose |
| :--- | :--- | :--- |
| **Urgent Response** | Mean & 90th-percentile wait for Tier 2 (mins) | Evaluates clinical safety and timeliness. |
| **Routine Fairness** | Max wait time & 95th-percentile for Tier 4/5 (mins) | Evaluates starvation avoidance. |
| **Starvation Count** | Patients waiting $>120$ minutes | Quantifies policy violations. |
| **Doctor Efficiency**| Doctor active consultation percentage (%) | Verifies no clinical resource waste. |
| **Prediction Quality**| MAE, RMSE, and $R^2$ on held-out test sets | Validates ML model performance. |

---

## 5. Academic Threats to Validity & Limitations
1. **Synthetic Data Realism:** While the synthetic generator uses calibrated Poisson and Log-normal distributions from medical operations literature, actual hospital behavior involves unmeasured clinical complexities (e.g., doctor interruptions, unannounced diagnostic delays).
2. **Patient Behavior Assumptions:** The simulation assumes zero reneging (patients walking out without consultation) unless wait times exceed extreme thresholds.
3. **Clinical Generalizability:** Triage rules in this prototype are illustrative and must not be interpreted as validated clinical protocols for direct patient care without hospital ethics board review.
