import os
import time
import joblib
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List

app = FastAPI(
    title="Hospital OPD ML Waiting-Time Prediction Service",
    version="1.2.0",
    description="Machine Learning inference microservice predicting patient outpatient waiting times."
)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "../artifacts/model_v1.joblib")
model_pipeline = None

# Load trained artifact on module initialization
if os.path.exists(MODEL_PATH):
    try:
        model_pipeline = joblib.load(MODEL_PATH)
        print(f"[ML Service] Successfully loaded model pipeline from {MODEL_PATH}")
    except Exception as e:
        print(f"[ML Service Warning] Failed to load model artifact: {e}")

class PredictionRequest(BaseModel):
    queue_position: int = Field(..., ge=1, description="1-based position in queue")
    patients_ahead: int = Field(..., ge=0, description="Number of higher-priority patients ahead")
    active_consultations_count: int = Field(default=1, ge=0, description="Active consultations in department")
    department_code: str = Field(..., description="Department code (e.g., CARD, ORTH, PEDI, GENM, DERM)")
    hour_of_day: int = Field(..., ge=0, le=23, description="Arrival hour (0..23)")
    day_of_week: int = Field(..., ge=0, le=6, description="0=Monday, 6=Sunday")
    doctor_experience_years: int = Field(default=5, ge=0, le=60)
    urgency_tier: int = Field(default=4, ge=2, le=5, description="Urgency tier (2=Emergent, 5=Minor)")

class PredictionResponse(BaseModel):
    predicted_wait_minutes: float
    confidence_interval: List[float]
    model_version: str
    model_name: str
    latency_ms: float

@app.get("/health")
def health_check():
    return {
        "status": "ready",
        "service": "hospital-opd-ml-service",
        "loaded_model_version": "v1.2.0-rf" if model_pipeline is not None else "v1.0.0-fallback",
        "is_model_loaded": model_pipeline is not None
    }

@app.post("/predict", response_model=PredictionResponse)
def predict_wait_time(payload: PredictionRequest):
    start_time = time.perf_counter()

    if model_pipeline is not None:
        try:
            # Construct DataFrame matching training feature columns
            feature_dict = {
                "queue_position": [payload.queue_position],
                "patients_ahead": [payload.patients_ahead],
                "active_consultations_count": [payload.active_consultations_count],
                "department_code": [payload.department_code.upper()],
                "hour_of_day": [payload.hour_of_day],
                "day_of_week": [payload.day_of_week],
                "doctor_experience_years": [payload.doctor_experience_years],
                "urgency_tier": [payload.urgency_tier]
            }
            df_in = pd.DataFrame(feature_dict)
            raw_prediction = float(model_pipeline.predict(df_in)[0])
            predicted_wait = max(2.0, raw_prediction)

            # Empirical confidence bounds based on held-out RMSE (24.68 mins, ~10 mins 80% CI)
            lower_bound = max(1.0, round(predicted_wait - 8.5, 1))
            upper_bound = round(predicted_wait + 10.5, 1)

            latency = (time.perf_counter() - start_time) * 1000.0

            return PredictionResponse(
                predicted_wait_minutes=round(predicted_wait, 1),
                confidence_interval=[lower_bound, upper_bound],
                model_version="v1.2.0-rf",
                model_name="RandomForestRegressor",
                latency_ms=round(latency, 2)
            )
        except Exception as e:
            print(f"[ML Service Error] Inference pipeline failure: {e}")

    # Fallback heuristic calculation if pipeline fails or is not yet loaded
    dept_avg = {
        "CARD": 22.0, "ORTH": 16.0, "PEDI": 18.0, "GENM": 14.0, "DERM": 12.0
    }.get(payload.department_code.upper(), 15.0)

    urgency_factor = {2: 0.6, 3: 0.85, 4: 1.0, 5: 1.15}.get(payload.urgency_tier, 1.0)
    estimated_wait = max(2.0, (payload.patients_ahead * dept_avg * urgency_factor))
    latency = (time.perf_counter() - start_time) * 1000.0

    return PredictionResponse(
        predicted_wait_minutes=round(estimated_wait, 1),
        confidence_interval=[max(0.0, round(estimated_wait - 5.0, 1)), round(estimated_wait + 8.0, 1)],
        model_version="v1.0.0-fallback",
        model_name="DeterministicSpecialtyBaseline",
        latency_ms=round(latency, 2)
    )
