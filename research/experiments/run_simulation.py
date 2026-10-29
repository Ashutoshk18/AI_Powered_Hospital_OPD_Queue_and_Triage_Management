"""
research/experiments/run_simulation.py
=======================================
Discrete-event simulation comparing three queue scheduling policies
for an OPD (Outpatient Department) over 50 independent simulation days.

Policies
--------
A  FCFS          – First-Come First-Served (arrival time only)
B  STATIC_PRIO   – Pure static priority (Tier weight only, no aging)
C  DYNAMIC_AGING – Dynamic aging priority (Tier weight + alpha * wait_min)
                   This is the implemented system policy (alpha=1.0).

Metrics collected per simulation day
-------------------------------------
- mean_wait_min          : Mean patient waiting time (minutes)
- median_wait_min        : Median waiting time
- p90_wait_min           : 90th-percentile waiting time
- max_wait_min           : Maximum waiting time
- starvation_count       : Patients waiting >120 minutes
- utilization_pct        : Doctor utilisation percentage
- throughput_per_hour    : Patients completed per hour

Results are saved to:
  research/results/simulation_results.json
  research/results/simulation_summary.csv
"""

import os
import sys
import json
import random
import heapq
import math
import csv
from dataclasses import dataclass, field
from typing import List, Dict, Optional
import numpy as np

# ─── Config ───────────────────────────────────────────────────────────────────

SEED_BASE          = 42
N_DAYS             = 50          # independent simulation days
SIM_HOURS          = 10          # OPD operating hours per day (08:00-18:00)
SIM_MINUTES        = SIM_HOURS * 60

# Arrival process: Non-Homogeneous Poisson, peak at midday
ARRIVAL_RATE_BASE  = 3.5         # patients per 30-min slot at peak
N_SLOTS            = SIM_HOURS * 2

# Service-time distribution: LogNormal (mu=3.0, sigma=0.5 → ~22 min mean)
SERVICE_LN_MU      = 3.0
SERVICE_LN_SIGMA   = 0.5

# Single doctor (one-server queue, realistic for one department)
N_DOCTORS          = 1

# Triage tier probabilities matching real OPD distribution
TIER_PROBS         = [0.01, 0.05, 0.15, 0.44, 0.35]
TIER_WEIGHTS       = {1: 500, 2: 120, 3: 80, 4: 35, 5: 10}

STARVATION_CUTOFF  = 120         # minutes; patients waiting longer are "starved"
ALPHA              = 1.0         # aging coefficient for Policy C

# ─── Data classes ─────────────────────────────────────────────────────────────

@dataclass
class Patient:
    patient_id:    int
    arrival_min:   float
    tier:          int
    service_time:  float          # minutes (sampled from LogNormal)

    # Set when the patient's service begins
    service_start: Optional[float] = field(default=None)
    service_end:   Optional[float] = field(default=None)

    @property
    def wait_min(self) -> float:
        if self.service_start is None:
            return 0.0
        return max(0.0, self.service_start - self.arrival_min)

    @property
    def completed(self) -> bool:
        return self.service_end is not None


# ─── Arrival rate function ─────────────────────────────────────────────────────

def slot_arrival_rate(slot: int) -> float:
    """
    Return expected arrivals per 30-min slot.
    Bell-curve peaking at slot 10 (13:00).
    """
    peak     = N_SLOTS * 0.5
    spread   = N_SLOTS * 0.35
    factor   = math.exp(-0.5 * ((slot - peak) / spread) ** 2)
    return max(0.3, ARRIVAL_RATE_BASE * factor)


# ─── Patient generator ────────────────────────────────────────────────────────

def generate_patients(rng: np.random.Generator) -> List[Patient]:
    patients: List[Patient] = []
    pid = 0
    for slot in range(N_SLOTS):
        lam  = slot_arrival_rate(slot)
        n    = rng.poisson(lam)
        for _ in range(n):
            arrival   = slot * 30.0 + rng.uniform(0, 30)
            if arrival >= SIM_MINUTES:
                continue
            tier      = int(rng.choice(range(1, 6), p=TIER_PROBS))
            svc_time  = float(rng.lognormal(SERVICE_LN_MU, SERVICE_LN_SIGMA))
            svc_time  = max(5.0, min(svc_time, 90.0))
            patients.append(Patient(pid, arrival, tier, svc_time))
            pid += 1
    return sorted(patients, key=lambda p: p.arrival_min)


# ─── Priority key functions ────────────────────────────────────────────────────

def priority_fcfs(patient: Patient, current_time: float) -> float:
    """Lower value = higher priority. FCFS → sort by arrival_min ascending."""
    return patient.arrival_min


def priority_static(patient: Patient, current_time: float) -> float:
    """Higher tier weight = higher priority; ties broken by arrival."""
    return (-TIER_WEIGHTS[patient.tier], patient.arrival_min)


def priority_dynamic(patient: Patient, current_time: float) -> float:
    """Dynamic aging: score = tier_weight + alpha * wait_minutes (descending)."""
    wait = max(0.0, current_time - patient.arrival_min)
    score = TIER_WEIGHTS[patient.tier] + ALPHA * wait
    return -score     # negate for min-heap


# ─── One-server queue simulation ──────────────────────────────────────────────

def simulate_day(patients: List[Patient], policy: str) -> Dict:
    """
    Simulate one OPD day with the given scheduling policy.
    Returns a dict of per-day metrics.
    """
    queue: List[Patient] = []          # waiting room
    completed: List[Patient] = []
    doctor_free_at = 0.0               # when the doctor next becomes free
    total_busy_time = 0.0

    # Pending: patients not yet arrived, sorted by arrival_min
    pending = list(patients)
    pending.sort(key=lambda p: p.arrival_min)
    ptr = 0                            # index into pending

    current_time = 0.0

    # Event loop: advance time to next meaningful event
    while True:
        # Admit all patients who have arrived by current_time
        while ptr < len(pending) and pending[ptr].arrival_min <= current_time:
            queue.append(pending[ptr])
            ptr += 1

        if not queue and ptr >= len(pending):
            # No one waiting, no one incoming
            break

        if not queue:
            # Queue empty but more patients arriving later
            current_time = pending[ptr].arrival_min
            continue

        if doctor_free_at > current_time:
            # Doctor busy; advance time to when doctor is free or next arrival
            next_arrival = pending[ptr].arrival_min if ptr < len(pending) else math.inf
            current_time = min(doctor_free_at, next_arrival)
            continue

        # Doctor is free; select next patient based on policy
        if policy == 'FCFS':
            queue.sort(key=lambda p: priority_fcfs(p, current_time))
        elif policy == 'STATIC_PRIO':
            queue.sort(key=lambda p: priority_static(p, current_time))
        elif policy == 'DYNAMIC_AGING':
            queue.sort(key=lambda p: priority_dynamic(p, current_time))

        patient = queue.pop(0)
        patient.service_start = max(current_time, doctor_free_at)
        patient.service_end   = patient.service_start + patient.service_time

        total_busy_time += patient.service_time
        doctor_free_at   = patient.service_end
        current_time     = patient.service_end

        completed.append(patient)

    if not completed:
        return {
            'mean_wait_min':       0.0,
            'median_wait_min':     0.0,
            'p90_wait_min':        0.0,
            'max_wait_min':        0.0,
            'starvation_count':    0,
            'utilization_pct':     0.0,
            'throughput_per_hour': 0.0,
        }

    waits = [p.wait_min for p in completed]
    last_event = max(p.service_end for p in completed if p.service_end)
    active_duration = max(last_event, SIM_MINUTES)

    return {
        'mean_wait_min':       float(np.mean(waits)),
        'median_wait_min':     float(np.median(waits)),
        'p90_wait_min':        float(np.percentile(waits, 90)),
        'max_wait_min':        float(np.max(waits)),
        'starvation_count':    int(sum(1 for w in waits if w > STARVATION_CUTOFF)),
        'utilization_pct':     float(total_busy_time / active_duration * 100),
        'throughput_per_hour': float(len(completed) / (active_duration / 60)),
    }


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    policies = ['FCFS', 'STATIC_PRIO', 'DYNAMIC_AGING']
    all_results: Dict[str, List[Dict]] = {p: [] for p in policies}

    print("Running simulation: {} policies x {} days".format(len(policies), N_DAYS))

    for day in range(N_DAYS):
        rng      = np.random.default_rng(SEED_BASE + day)
        patients = generate_patients(rng)

        for policy in policies:
            # Fresh copy of patients for each policy (same arrivals, independent scheduling)
            import copy
            pts_copy = copy.deepcopy(patients)
            metrics  = simulate_day(pts_copy, policy)
            metrics['day'] = day
            all_results[policy].append(metrics)

    # ── Aggregate summary ─────────────────────────────────────────────────────
    summary = {}
    metric_keys = ['mean_wait_min', 'median_wait_min', 'p90_wait_min',
                   'max_wait_min', 'starvation_count', 'utilization_pct',
                   'throughput_per_hour']

    for policy in policies:
        days_data = all_results[policy]
        summary[policy] = {}
        for k in metric_keys:
            vals = [d[k] for d in days_data]
            summary[policy][k] = {
                'mean': float(np.mean(vals)),
                'std':  float(np.std(vals)),
                'min':  float(np.min(vals)),
                'max':  float(np.max(vals)),
            }

    # ── Print summary ─────────────────────────────────────────────────────────
    print("\n=== SIMULATION RESULTS SUMMARY ({} days each) ===\n".format(N_DAYS))
    header = "{:<18} {:>12} {:>12} {:>12} {:>12} {:>14} {:>14} {:>18}".format(
        "Policy", "Mean Wait", "Median Wait", "P90 Wait",
        "Max Wait", "Starvation", "Utilization", "Throughput/hr"
    )
    print(header)
    print("-" * len(header))
    for policy in policies:
        s = summary[policy]
        print("{:<18} {:>10.1f}m {:>10.1f}m {:>10.1f}m {:>10.1f}m {:>12.1f} {:>12.1f}% {:>16.2f}".format(
            policy,
            s['mean_wait_min']['mean'],
            s['median_wait_min']['mean'],
            s['p90_wait_min']['mean'],
            s['max_wait_min']['mean'],
            s['starvation_count']['mean'],
            s['utilization_pct']['mean'],
            s['throughput_per_hour']['mean'],
        ))

    # ── Compute improvement of DYNAMIC_AGING vs FCFS ──────────────────────────
    dynamic = summary['DYNAMIC_AGING']
    fcfs    = summary['FCFS']
    pct_reduction = lambda a, b: (b - a) / b * 100 if b > 0 else 0.0

    print("\n--- Improvement of DYNAMIC_AGING over FCFS ---")
    print("Mean wait reduction:       {:.1f}%".format(
        pct_reduction(dynamic['mean_wait_min']['mean'], fcfs['mean_wait_min']['mean'])))
    print("Starvation count reduction:{:.1f}%".format(
        pct_reduction(dynamic['starvation_count']['mean'], fcfs['starvation_count']['mean'])))
    print("P90 wait reduction:        {:.1f}%".format(
        pct_reduction(dynamic['p90_wait_min']['mean'], fcfs['p90_wait_min']['mean'])))

    # ── Save results ──────────────────────────────────────────────────────────
    out_dir = os.path.join(os.path.dirname(__file__), '..', 'results')
    os.makedirs(out_dir, exist_ok=True)

    # Raw day-by-day results JSON
    json_path = os.path.join(out_dir, 'simulation_results.json')
    with open(json_path, 'w') as f:
        json.dump({'summary': summary, 'days': all_results}, f, indent=2)
    print("\nRaw results saved to:", json_path)

    # Summary CSV
    csv_path = os.path.join(out_dir, 'simulation_summary.csv')
    with open(csv_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['policy', 'metric', 'mean', 'std', 'min', 'max'])
        for policy in policies:
            for k in metric_keys:
                row = summary[policy][k]
                writer.writerow([policy, k, row['mean'], row['std'], row['min'], row['max']])
    print("Summary CSV saved to:", csv_path)

    return summary


if __name__ == '__main__':
    main()
