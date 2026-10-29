import os
import sys

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import pytest
import pandas as pd
import numpy as np
import joblib
from pydantic import ValidationError

from services.ml.app.main import (
    app,
    health_check,
    predict_wait_time,
    PredictionRequest,
    MODEL_PATH,
    model_pipeline
)

def test_model_artifact_exists_and_loads():
    assert os.path.exists(MODEL_PATH), f"Model artifact missing at {MODEL_PATH}"
    pipeline = joblib.load(MODEL_PATH)
    assert pipeline is not None
    assert hasattr(pipeline, "predict")

def test_health_check_function():
    result = health_check()
    assert result["status"] == "ready"
    assert result["service"] == "hospital-opd-ml-service"
    assert result["loaded_model_version"] == "v1.2.0-rf"
    assert result["is_model_loaded"] is True

def test_predict_wait_time_function_valid():
    req = PredictionRequest(
        queue_position=4,
        patients_ahead=3,
        active_consultations_count=2,
        department_code="CARD",
        hour_of_day=10,
        day_of_week=2,
        doctor_experience_years=12,
        urgency_tier=3
    )
    res = predict_wait_time(req)
    assert res.predicted_wait_minutes > 0
    assert len(res.confidence_interval) == 2
    assert res.confidence_interval[0] <= res.confidence_interval[1]
    assert res.model_version == "v1.2.0-rf"
    assert res.model_name == "RandomForestRegressor"
    assert res.latency_ms < 500 # Fast inference (<500ms even on un-warmed local invocation)

def test_prediction_request_validation():
    # queue_position < 1 must raise ValidationError
    with pytest.raises(ValidationError):
        PredictionRequest(
            queue_position=0,
            patients_ahead=-1,
            department_code="CARD",
            hour_of_day=26, # Invalid hour
            day_of_week=0
        )
