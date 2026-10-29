"""
Training and Evaluation Pipeline for OPD Waiting-Time Prediction
Trains Baseline, OLS Linear Regression, and Random Forest Regressor.
Enforces zero target leakage, held-out temporal evaluation, and saves deployment artifacts.
"""

import os
import sys
import json

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

WORKSPACE_ROOT = os.path.abspath(os.path.join(PROJECT_ROOT, ".."))
if WORKSPACE_ROOT not in sys.path:
    sys.path.insert(0, WORKSPACE_ROOT)

import numpy as np
import pandas as pd
import joblib

from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from research.data.generate_dataset import generate_opd_dataset

DATA_PATH = "research/data/opd_waiting_times.csv"
ARTIFACT_DIR = "services/ml/artifacts"
MODEL_PATH = os.path.join(ARTIFACT_DIR, "model_v1.joblib")
METRICS_PATH = os.path.join(ARTIFACT_DIR, "evaluation_metrics.json")

def train_and_evaluate():
    # 1. Ensure dataset exists
    if not os.path.exists(DATA_PATH):
        print(f"Dataset not found at {DATA_PATH}. Generating synthetic dataset...")
        generate_opd_dataset(num_days=30, output_path=DATA_PATH)

    df = pd.read_csv(DATA_PATH)
    print(f"Loaded dataset with {len(df)} records.")

    # 2. Time-aware train/test split: Days 0..23 (80%) train, Days 24..29 (20%) test
    train_mask = df["day_index"] < 24
    test_mask = df["day_index"] >= 24

    train_df = df[train_mask].copy()
    test_df = df[test_mask].copy()

    feature_cols = [
        "queue_position",
        "patients_ahead",
        "active_consultations_count",
        "department_code",
        "hour_of_day",
        "day_of_week",
        "doctor_experience_years",
        "urgency_tier"
    ]
    target_col = "actual_wait_minutes"

    X_train = train_df[feature_cols]
    y_train = train_df[target_col].values

    X_test = test_df[feature_cols]
    y_test = test_df[target_col].values

    print(f"Training samples: {len(X_train)} | Testing samples: {len(X_test)}")

    # 3. Model Baseline: Deterministic Position Multiplier Heuristic
    dept_defaults = {"CARD": 22.0, "ORTH": 16.0, "PEDI": 18.0, "GENM": 14.0, "DERM": 12.0}
    tier_mult = {2: 0.6, 3: 0.85, 4: 1.0, 5: 1.15}

    y_pred_baseline = []
    for _, row in X_test.iterrows():
        base_dur = dept_defaults.get(row["department_code"], 15.0)
        t_mult = tier_mult.get(row["urgency_tier"], 1.0)
        pred = max(2.0, row["patients_ahead"] * base_dur * t_mult)
        y_pred_baseline.append(pred)

    baseline_mae = float(mean_absolute_error(y_test, y_pred_baseline))
    baseline_rmse = float(np.sqrt(mean_squared_error(y_test, y_pred_baseline)))
    baseline_r2 = float(r2_score(y_test, y_pred_baseline))

    # 4. Pipeline Setup: OneHotEncoding for department_code, scaling for numerics
    categorical_features = ["department_code"]
    numeric_features = [
        "queue_position",
        "patients_ahead",
        "active_consultations_count",
        "hour_of_day",
        "day_of_week",
        "doctor_experience_years",
        "urgency_tier"
    ]

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_features),
            ("num", StandardScaler(), numeric_features),
        ]
    )

    # 5. Candidate 1: Linear Regression (Ridge)
    linear_pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("regressor", Ridge(alpha=1.0))
    ])
    linear_pipeline.fit(X_train, y_train)
    y_pred_linear = linear_pipeline.predict(X_test)

    linear_mae = float(mean_absolute_error(y_test, y_pred_linear))
    linear_rmse = float(np.sqrt(mean_squared_error(y_test, y_pred_linear)))
    linear_r2 = float(r2_score(y_test, y_pred_linear))

    # 6. Candidate 2: Random Forest Regressor
    rf_pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("regressor", RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1))
    ])
    rf_pipeline.fit(X_train, y_train)
    y_pred_rf = rf_pipeline.predict(X_test)

    rf_mae = float(mean_absolute_error(y_test, y_pred_rf))
    rf_rmse = float(np.sqrt(mean_squared_error(y_test, y_pred_rf)))
    rf_r2 = float(r2_score(y_test, y_pred_rf))

    # Calculate Improvement
    mae_improvement_pct = round(((baseline_mae - rf_mae) / baseline_mae) * 100.0, 2)

    results = {
        "model_version": "v1.2.0-rf",
        "dataset_size": len(df),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "metrics": {
            "baseline": {
                "name": "Deterministic Queue Heuristic",
                "mae": round(baseline_mae, 2),
                "rmse": round(baseline_rmse, 2),
                "r2": round(baseline_r2, 4)
            },
            "ridge_regression": {
                "name": "Ridge Linear Regression",
                "mae": round(linear_mae, 2),
                "rmse": round(linear_rmse, 2),
                "r2": round(linear_r2, 4)
            },
            "random_forest": {
                "name": "Random Forest Regressor",
                "mae": round(rf_mae, 2),
                "rmse": round(rf_rmse, 2),
                "r2": round(rf_r2, 4),
                "mae_improvement_pct": mae_improvement_pct
            }
        }
    }

    # 7. Save Artifacts
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    joblib.dump(rf_pipeline, MODEL_PATH)
    with open(METRICS_PATH, "w") as f:
        json.dump(results, f, indent=2)

    print("\n" + "=" * 60)
    print("       MODEL EVALUATION & BENCHMARK RESULTS")
    print("=" * 60)
    print(f"Baseline Heuristic : MAE = {baseline_mae:.2f} mins | RMSE = {baseline_rmse:.2f} mins | R^2 = {baseline_r2:.4f}")
    print(f"Ridge Regression   : MAE = {linear_mae:.2f} mins | RMSE = {linear_rmse:.2f} mins | R^2 = {linear_r2:.4f}")
    print(f"Random Forest      : MAE = {rf_mae:.2f} mins | RMSE = {rf_rmse:.2f} mins | R^2 = {rf_r2:.4f}")
    print(f"[WINNER] Random Forest achieved {mae_improvement_pct}% reduction in MAE over baseline!")
    print("=" * 60)
    print(f"Saved model pipeline artifact to: {MODEL_PATH}")
    print(f"Saved evaluation metrics to: {METRICS_PATH}\n")

    return results

if __name__ == "__main__":
    train_and_evaluate()
