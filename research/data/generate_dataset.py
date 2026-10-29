"""
Synthetic OPD Queue Dataset Generator
Simulates realistic hospital outpatient queues using Non-Homogeneous Poisson Process (NHPP)
arrivals, Log-Normal specialty consultation times, and dynamic priority triage queuing.
Zero target leakage is strictly enforced.
"""

import numpy as np
import pandas as pd
import heapq
import os

def generate_opd_dataset(
    num_days: int = 30,
    seed: int = 42,
    output_path: str = "research/data/opd_waiting_times.csv"
):
    np.random.seed(seed)

    departments = {
        "CARD": {"mean_duration": 22.0, "sigma": 0.35, "num_doctors": 2},
        "ORTH": {"mean_duration": 16.0, "sigma": 0.30, "num_doctors": 2},
        "PEDI": {"mean_duration": 18.0, "sigma": 0.40, "num_doctors": 2},
        "GENM": {"mean_duration": 14.0, "sigma": 0.25, "num_doctors": 3},
        "DERM": {"mean_duration": 12.0, "sigma": 0.20, "num_doctors": 2},
    }

    tier_weights = {2: 120.0, 3: 70.0, 4: 35.0, 5: 10.0}
    tier_probs = [0.08, 0.22, 0.55, 0.15]  # Tiers 2, 3, 4, 5
    tiers = [2, 3, 4, 5]

    records = []

    # Simulation clock advances day by day
    for day in range(num_days):
        day_of_week = day % 7 # 0=Monday .. 6=Sunday
        if day_of_week == 6: # Sunday clinic closed
            continue

        for dept_code, dept_info in departments.items():
            num_doctors = dept_info["num_doctors"]
            doctor_experience = np.random.randint(2, 25, size=num_doctors)

            # Doctors free-at time array (in minutes from 08:00 start)
            doctors_free_at = [0.0] * num_doctors

            # Generate arrivals between 08:00 (0 mins) and 16:00 (480 mins)
            # Time-varying lambda (morning peak at 9:00-11:00, afternoon peak 13:30-15:00)
            t = 0.0
            day_patients = []

            while t < 480.0:
                # Arrival rate lambda per minute
                hour = 8 + (t / 60.0)
                if 8.5 <= hour <= 11.0:
                    rate = 0.18 # Morning rush
                elif 13.5 <= hour <= 15.0:
                    rate = 0.12 # Afternoon surge
                else:
                    rate = 0.06 # Steady baseline

                dt = np.random.exponential(1.0 / rate)
                t += dt
                if t >= 480.0:
                    break

                tier = int(np.random.choice(tiers, p=tier_probs))
                
                # Service duration from log-normal distribution
                mu = np.log(dept_info["mean_duration"])
                service_duration = np.random.lognormal(mu, dept_info["sigma"])
                service_duration = float(np.clip(service_duration, 4.0, 60.0))

                day_patients.append({
                    "arrival_time": t,
                    "tier": tier,
                    "base_weight": tier_weights[tier],
                    "service_duration": service_duration,
                })

            # Sort arrivals by arrival time
            day_patients.sort(key=lambda x: x["arrival_time"])

            # Simulate queue execution
            # Priority queue holds ( -priority_score, arrival_time, patient_idx )
            # We step through events
            waiting_queue = [] # List of patient dicts currently waiting
            active_consultations = 0

            for p_idx, patient in enumerate(day_patients):
                current_time = patient["arrival_time"]

                # 1. Update queue: who has been served before current_time?
                # Free up doctors whose consultations ended <= current_time
                for doc_id in range(num_doctors):
                    if doctors_free_at[doc_id] <= current_time:
                        # Doctor is free
                        pass

                # Calculate state at check-in (STRICTLY KNOWN FEATURES - ZERO LEAKAGE)
                hour_of_day = int(8 + (current_time / 60.0))
                assigned_doc_idx = p_idx % num_doctors
                doc_exp = int(doctor_experience[assigned_doc_idx])

                # Count active consultations at current_time
                active_count = sum(1 for free_time in doctors_free_at if free_time > current_time)

                # Prior patients in waiting queue
                patients_ahead = len([p for p in waiting_queue if p.get("start_time") is None])
                queue_position = patients_ahead + 1

                # Record feature vector for ML
                patient["queue_position"] = queue_position
                patient["patients_ahead"] = patients_ahead
                patient["active_consultations_count"] = active_count
                patient["department_code"] = dept_code
                patient["hour_of_day"] = hour_of_day
                patient["day_of_week"] = day_of_week
                patient["doctor_experience_years"] = doc_exp
                patient["urgency_tier"] = patient["tier"]
                patient["day_index"] = day

                waiting_queue.append(patient)

            # Now run the queue progression to determine actual consultation start times
            current_clock = 0.0
            completed_in_day = []

            while waiting_queue:
                # Find the earliest available doctor
                earliest_doc_id = int(np.argmin(doctors_free_at))
                doc_ready_time = doctors_free_at[earliest_doc_id]

                # Advance simulation clock to when doctor is ready, or when next patient arrived
                # Filter patients who have arrived by max(doc_ready_time, earliest_arrival)
                available_candidates = [p for p in waiting_queue if p["arrival_time"] <= max(doc_ready_time, waiting_queue[0]["arrival_time"])]

                if not available_candidates:
                    # Doctor waits for next patient arrival
                    current_clock = waiting_queue[0]["arrival_time"]
                    available_candidates = [waiting_queue[0]]
                else:
                    current_clock = max(doc_ready_time, min(p["arrival_time"] for p in available_candidates))

                # Compute dynamic priority scores for all arrived candidates at current_clock
                # PriorityScore = BaseWeight + alpha * (current_clock - arrival_time)
                alpha = 1.0
                best_patient = None
                best_score = -1e9
                best_idx = 0

                for idx, cand in enumerate(available_candidates):
                    waited = max(0.0, current_clock - cand["arrival_time"])
                    score = cand["base_weight"] + (alpha * waited)
                    if score > best_score:
                        best_score = score
                        best_patient = cand
                        best_idx = idx

                # Assign consultation to earliest doctor
                start_time = max(current_clock, best_patient["arrival_time"])
                actual_wait = max(1.0, start_time - best_patient["arrival_time"])
                end_time = start_time + best_patient["service_duration"]

                doctors_free_at[earliest_doc_id] = end_time
                best_patient["actual_wait_minutes"] = round(actual_wait, 2)
                best_patient["consultation_duration"] = round(best_patient["service_duration"], 2)

                completed_in_day.append(best_patient)
                waiting_queue.remove(best_patient)

            records.extend(completed_in_day)

    df = pd.DataFrame(records)

    # Clean feature columns for ML dataset
    final_cols = [
        "queue_position",
        "patients_ahead",
        "active_consultations_count",
        "department_code",
        "hour_of_day",
        "day_of_week",
        "doctor_experience_years",
        "urgency_tier",
        "day_index",
        "actual_wait_minutes"
    ]
    df_clean = df[final_cols].copy()

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df_clean.to_csv(output_path, index=False)
    print(f"[OK] Generated synthetic dataset with {len(df_clean)} records across {num_days} days.")
    print(f"[INFO] Dataset saved to: {output_path}")
    print(df_clean.describe())
    return df_clean

if __name__ == "__main__":
    generate_opd_dataset()
