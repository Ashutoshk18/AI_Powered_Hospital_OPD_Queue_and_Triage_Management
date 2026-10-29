# Research Data Directory
This directory contains the synthetic queuing dataset generation scripts and generated benchmark datasets.
- `generate_dataset.py`: Python script simulating Non-Homogeneous Poisson Process patient arrivals and LogNormal consultation service times under dynamic aging priority queue discipline.
- `opd_waiting_times.csv`: 6,502 simulated OPD patient records.

To generate a new dataset:
  python research/data/generate_dataset.py
