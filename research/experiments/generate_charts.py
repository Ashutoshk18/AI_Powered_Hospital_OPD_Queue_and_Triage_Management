"""
research/experiments/generate_charts.py
=========================================
Generate comparison charts from simulation results.

Reads:  research/results/simulation_results.json
Writes: research/results/charts/*.png

Charts produced
---------------
1. bar_mean_wait.png        – Mean waiting time by policy
2. bar_starvation.png       – Mean starvation count (wait > 120 min) by policy
3. bar_p90_wait.png         – P90 waiting time by policy
4. bar_utilization.png      – Doctor utilisation % by policy
5. line_wait_over_days.png  – Mean waiting time trend across 50 simulation days

Note: matplotlib is used here as a lightweight dependency suitable for
offline chart generation. Charts are saved as PNG files for inclusion
in the research report.
"""

import os
import sys
import json
import numpy as np

# Attempt to import matplotlib; if not available, install it first.
try:
    import matplotlib
    matplotlib.use('Agg')   # non-interactive backend (no display required)
    import matplotlib.pyplot as plt
    import matplotlib.patches as mpatches
except ImportError:
    print("matplotlib not found. Install with: pip install matplotlib")
    sys.exit(1)

# ─── Paths ────────────────────────────────────────────────────────────────────

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
RESULTS_DIR  = os.path.join(SCRIPT_DIR, '..', 'results')
CHARTS_DIR   = os.path.join(RESULTS_DIR, 'charts')
DATA_PATH    = os.path.join(RESULTS_DIR, 'simulation_results.json')

os.makedirs(CHARTS_DIR, exist_ok=True)

# ─── Load results ─────────────────────────────────────────────────────────────

def load_results():
    if not os.path.exists(DATA_PATH):
        print("ERROR: simulation_results.json not found.")
        print("Run research/experiments/run_simulation.py first.")
        sys.exit(1)
    with open(DATA_PATH) as f:
        return json.load(f)


# ─── Colour palette ───────────────────────────────────────────────────────────

POLICY_COLORS = {
    'FCFS':          '#6b7280',   # gray
    'STATIC_PRIO':   '#3b82f6',   # blue
    'DYNAMIC_AGING': '#10b981',   # emerald
}

POLICY_LABELS = {
    'FCFS':          'Policy A: FCFS',
    'STATIC_PRIO':   'Policy B: Static Priority',
    'DYNAMIC_AGING': 'Policy C: Dynamic Aging (Ours)',
}

POLICIES = ['FCFS', 'STATIC_PRIO', 'DYNAMIC_AGING']


# ─── Helper: bar chart ────────────────────────────────────────────────────────

def save_bar_chart(
    values: list,
    errors: list,
    title: str,
    ylabel: str,
    filename: str,
    lower_is_better: bool = True,
):
    fig, ax = plt.subplots(figsize=(7, 4.5))
    x      = np.arange(len(POLICIES))
    colors = [POLICY_COLORS[p] for p in POLICIES]
    bars   = ax.bar(x, values, yerr=errors, width=0.5, color=colors,
                    capsize=5, edgecolor='white', linewidth=1.2)

    ax.set_xticks(x)
    ax.set_xticklabels([POLICY_LABELS[p] for p in POLICIES], fontsize=9)
    ax.set_ylabel(ylabel, fontsize=10)
    ax.set_title(title, fontsize=11, fontweight='bold', pad=12)
    ax.grid(axis='y', linestyle='--', alpha=0.4)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)

    # Annotate best bar
    best_idx = int(np.argmin(values)) if lower_is_better else int(np.argmax(values))
    best_bar = bars[best_idx]
    ax.annotate(
        'Best',
        xy=(best_bar.get_x() + best_bar.get_width() / 2, best_bar.get_height()),
        xytext=(0, 8),
        textcoords='offset points',
        ha='center',
        fontsize=9,
        color='#064e3b',
        fontweight='bold',
    )

    plt.tight_layout()
    out = os.path.join(CHARTS_DIR, filename)
    plt.savefig(out, dpi=150, bbox_inches='tight')
    plt.close()
    print("Saved:", out)


# ─── Chart 1: Mean waiting time ───────────────────────────────────────────────

def chart_mean_wait(summary: dict):
    values = [summary[p]['mean_wait_min']['mean']  for p in POLICIES]
    errors = [summary[p]['mean_wait_min']['std']   for p in POLICIES]
    save_bar_chart(
        values, errors,
        title   = 'Mean Patient Waiting Time by Scheduling Policy\n(50 simulation days, 1 doctor)',
        ylabel  = 'Mean Waiting Time (minutes)',
        filename= 'bar_mean_wait.png',
    )


# ─── Chart 2: Starvation count ────────────────────────────────────────────────

def chart_starvation(summary: dict):
    values = [summary[p]['starvation_count']['mean']  for p in POLICIES]
    errors = [summary[p]['starvation_count']['std']   for p in POLICIES]
    save_bar_chart(
        values, errors,
        title   = 'Mean Starvation Count (Wait > 120 min) by Policy\n(50 simulation days)',
        ylabel  = 'Patients Waiting > 120 min (mean per day)',
        filename= 'bar_starvation.png',
    )


# ─── Chart 3: P90 waiting time ────────────────────────────────────────────────

def chart_p90_wait(summary: dict):
    values = [summary[p]['p90_wait_min']['mean']  for p in POLICIES]
    errors = [summary[p]['p90_wait_min']['std']   for p in POLICIES]
    save_bar_chart(
        values, errors,
        title   = '90th-Percentile Waiting Time by Policy\n(50 simulation days)',
        ylabel  = 'P90 Waiting Time (minutes)',
        filename= 'bar_p90_wait.png',
    )


# ─── Chart 4: Doctor utilisation ─────────────────────────────────────────────

def chart_utilization(summary: dict):
    values = [summary[p]['utilization_pct']['mean']  for p in POLICIES]
    errors = [summary[p]['utilization_pct']['std']   for p in POLICIES]
    save_bar_chart(
        values, errors,
        title   = 'Doctor Utilisation (%) by Policy\n(50 simulation days)',
        ylabel  = 'Utilisation (%)',
        filename= 'bar_utilization.png',
        lower_is_better=False,   # higher utilisation is better
    )


# ─── Chart 5: Mean wait trend over 50 days ───────────────────────────────────

def chart_wait_trend(days: dict):
    fig, ax = plt.subplots(figsize=(9, 5))

    for policy in POLICIES:
        daily_means = [d['mean_wait_min'] for d in days[policy]]
        ax.plot(
            range(1, len(daily_means) + 1),
            daily_means,
            label     = POLICY_LABELS[policy],
            color     = POLICY_COLORS[policy],
            linewidth = 1.8,
            alpha     = 0.85,
        )

    ax.set_xlabel('Simulation Day', fontsize=10)
    ax.set_ylabel('Mean Waiting Time (minutes)', fontsize=10)
    ax.set_title(
        'Mean Waiting Time per Day by Scheduling Policy\n(50 independent simulation days)',
        fontsize=11, fontweight='bold', pad=12,
    )
    ax.legend(fontsize=9, framealpha=0.6)
    ax.grid(linestyle='--', alpha=0.35)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)

    plt.tight_layout()
    out = os.path.join(CHARTS_DIR, 'line_wait_over_days.png')
    plt.savefig(out, dpi=150, bbox_inches='tight')
    plt.close()
    print("Saved:", out)


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    data    = load_results()
    summary = data['summary']
    days    = data['days']

    print("Generating charts from simulation results...")
    chart_mean_wait(summary)
    chart_starvation(summary)
    chart_p90_wait(summary)
    chart_utilization(summary)
    chart_wait_trend(days)
    print("\nAll charts saved to:", CHARTS_DIR)


if __name__ == '__main__':
    main()
