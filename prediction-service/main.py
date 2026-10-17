"""
QueueCare AI - Prediction Microservice
======================================
FastAPI microservice providing ML-powered wait-time predictions with strict
fallback mechanisms to algorithmic computation whenever ML model is unavailable.
"""

import os
import json
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import numpy as np

app = FastAPI(
    title="QueueCare AI Prediction Service",
    description="Hospital queue wait time estimation with ML regression and baseline algorithmic fallbacks",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DIR_PATH = os.path.dirname(os.path.abspath(__file__))
MODEL_FILE = os.path.join(DIR_PATH, "queue_model.joblib")
META_FILE = os.path.join(DIR_PATH, "model_meta.json")

# Lazy-loaded model & meta
model = None
metadata = {}

def load_model_if_available():
    global model, metadata
    if os.path.exists(MODEL_FILE) and os.path.exists(META_FILE):
        try:
            import joblib
            model = joblib.load(MODEL_FILE)
            with open(META_FILE, "r") as f:
                metadata = json.load(f)
        except Exception as e:
            print(f"Warning: Could not load ML model: {e}")
            model = None

@app.on_event("startup")
def startup_event():
    load_model_if_available()

class PredictionRequest(BaseModel):
    patients_ahead: int = Field(ge=0, description="Eligible patients ahead in the queue")
    elapsed_consultation_minutes: float = Field(default=0.0, ge=0.0, description="Time spent by current patient")
    avg_doctor_duration: float = Field(default=15.0, gt=0.0, description="Doctor's average consultation duration in minutes")
    hour_of_day: Optional[int] = Field(default=None, ge=0, le=23)
    day_of_week: Optional[int] = Field(default=None, ge=0, le=6)
    recent_clinic_delay_minutes: float = Field(default=0.0, ge=0.0)
    doctor_break_minutes: float = Field(default=0.0, ge=0.0)
    is_urgent_override: bool = Field(default=False)

class PredictionResponse(BaseModel):
    expected_wait_minutes: int
    lower_bound_minutes: int
    upper_bound_minutes: int
    confidence_level: str  # 'HIGH' | 'MEDIUM' | 'LOW'
    prediction_source: str # 'ML_MODEL_V1' | 'ALGORITHMIC_BASELINE'
    model_version: str
    explanation: str
    is_synthetic_dev_model: bool
    timestamp: str

def compute_algorithmic_fallback(req: PredictionRequest) -> PredictionResponse:
    """Deterministic fallback algorithm used when ML model is unavailable."""
    if req.patients_ahead == 0 and not req.is_urgent_override:
        return PredictionResponse(
            expected_wait_minutes=0,
            lower_bound_minutes=0,
            upper_bound_minutes=0,
            confidence_level="HIGH",
            prediction_source="ALGORITHMIC_BASELINE",
            model_version="rule-engine-v1",
            explanation="You are next in queue. Please stay ready at the consultation door.",
            is_synthetic_dev_model=False,
            timestamp=datetime.utcnow().isoformat()
        )

    # Remaining time for active patient
    remaining_current = max(0.0, req.avg_doctor_duration - req.elapsed_consultation_minutes)
    
    # Wait time for other preceding patients
    preceding_patients = max(0, req.patients_ahead - 1)
    queue_wait = preceding_patients * req.avg_doctor_duration

    raw_wait = remaining_current + queue_wait + req.recent_clinic_delay_minutes + req.doctor_break_minutes
    expected = int(round(raw_wait))

    # Calculate uncertainty bounds (+/- 25% + 3 min variance)
    variance = max(4, int(expected * 0.25))
    lower = max(0, expected - variance)
    upper = expected + variance

    confidence = "HIGH" if req.patients_ahead <= 2 else ("MEDIUM" if req.patients_ahead <= 6 else "LOW")

    return PredictionResponse(
        expected_wait_minutes=expected,
        lower_bound_minutes=lower,
        upper_bound_minutes=upper,
        confidence_level=confidence,
        prediction_source="ALGORITHMIC_BASELINE",
        model_version="rule-engine-v1",
        explanation=f"Calculated from {req.patients_ahead} patients ahead, doctor's {int(req.avg_doctor_duration)}m avg pace, and {int(req.recent_clinic_delay_minutes)}m clinic delay.",
        is_synthetic_dev_model=False,
        timestamp=datetime.utcnow().isoformat()
    )

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "QueueCare AI Prediction Engine",
        "model_loaded": model is not None,
        "model_version": metadata.get("model_version", "none")
    }

@app.get("/model-info")
def model_info():
    if not model or not metadata:
        return {
            "status": "baseline_only",
            "message": "No ML model loaded. Running on algorithmic rule engine fallback."
        }
    return {
        "status": "active",
        "metadata": metadata
    }

@app.post("/predict", response_model=PredictionResponse)
def predict(req: PredictionRequest):
    now = datetime.now()
    hour = req.hour_of_day if req.hour_of_day is not None else now.hour
    dow = req.day_of_week if req.day_of_week is not None else now.weekday()

    # Zero check
    if req.patients_ahead == 0 and not req.is_urgent_override:
        return PredictionResponse(
            expected_wait_minutes=0,
            lower_bound_minutes=0,
            upper_bound_minutes=0,
            confidence_level="HIGH",
            prediction_source="ALGORITHMIC_BASELINE",
            model_version="rule-engine-v1",
            explanation="You are next! Please proceed near the doctor's consultation room.",
            is_synthetic_dev_model=False,
            timestamp=datetime.utcnow().isoformat()
        )

    # Use ML model if available
    if model is not None:
        try:
            features = np.array([[
                req.patients_ahead,
                req.elapsed_consultation_minutes,
                req.avg_doctor_duration,
                hour,
                dow,
                req.recent_clinic_delay_minutes
            ]])
            predicted = float(model.predict(features)[0])
            predicted = max(0.0, predicted + req.doctor_break_minutes)
            expected = int(round(predicted))
            
            # Confidence interval based on holdout MAE
            mae = metadata.get("ml_mae", 4.0)
            lower = max(0, int(round(expected - (mae * 1.5))))
            upper = int(round(expected + (mae * 1.5)))

            confidence = "HIGH" if req.patients_ahead <= 3 else ("MEDIUM" if req.patients_ahead <= 8 else "LOW")

            return PredictionResponse(
                expected_wait_minutes=expected,
                lower_bound_minutes=lower,
                upper_bound_minutes=upper,
                confidence_level=confidence,
                prediction_source="ML_MODEL_V1",
                model_version=metadata.get("model_version", "v1.0.0"),
                explanation=f"Predicted by ML Regressor ({metadata.get('model_version')}) accounting for historical pace and live clinic variance.",
                is_synthetic_dev_model=metadata.get("is_synthetic_dev_data", True),
                timestamp=datetime.utcnow().isoformat()
            )
        except Exception as e:
            print(f"Error executing ML model: {e}. Falling back to baseline algorithm.")

    # Graceful Fallback
    return compute_algorithmic_fallback(req)
