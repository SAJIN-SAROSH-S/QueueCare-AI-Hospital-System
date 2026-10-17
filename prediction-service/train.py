"""
QueueCare AI - Queue Wait-Time Model Training Script
===================================================
NOTE ON DATA INTEGRITY:
In compliance with project safety principles, this development script uses explicitly
synthesized operational records for local development validation ONLY. It is clearly labeled
as synthetic to ensure we NEVER pretend a real clinical model was trained on real patient data.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from sklearn.linear_model import Ridge
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, root_mean_squared_error

MODEL_VERSION = "v1.0.0-synthetic-dev"
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_FILE = os.path.join(MODEL_DIR, "queue_model.joblib")
META_FILE = os.path.join(MODEL_DIR, "model_meta.json")
MINIMUM_DATA_THRESHOLD = 50

def generate_synthetic_dev_dataset(n_samples: int = 1200) -> pd.DataFrame:
    """
    Generates synthetic training records reflecting realistic outpatient clinic flows in Kerala.
    Attributes include:
      - doctor_id (categorical)
      - department_id (categorical)
      - patients_ahead (integer count)
      - elapsed_consultation_minutes (minutes current patient has spent)
      - avg_doctor_duration (historical doctor speed)
      - hour_of_day (8 to 17)
      - day_of_week (0=Monday to 5=Saturday)
      - recent_clinic_delay_minutes (running clinic delay)
    """
    np.random.seed(42)
    start_date = datetime(2026, 1, 1, 8, 30)
    
    records = []
    doctors = [
        {"id": "doc-menon-cardio", "dept": "dept-cardiology", "base_time": 18.0},
        {"id": "doc-nair-pediatrics", "dept": "dept-pediatrics", "base_time": 12.0},
        {"id": "doc-kurian-ortho", "dept": "dept-orthopedics", "base_time": 15.0},
        {"id": "doc-thomas-genmed", "dept": "dept-general-med", "base_time": 14.0},
    ]

    for i in range(n_samples):
        timestamp = start_date + timedelta(hours=i * 0.25)
        doc = doctors[np.random.choice(len(doctors))]
        patients_ahead = int(np.random.poisson(lam=4))
        elapsed_cur = float(np.clip(np.random.exponential(scale=6), 0, 30))
        delay = float(np.random.choice([0, 5, 10, 15, 25], p=[0.45, 0.25, 0.15, 0.10, 0.05]))
        hour = timestamp.hour
        day_of_week = timestamp.weekday()
        
        # Real-world expected wait calculation with noise
        remaining_cur = max(0.0, doc["base_time"] - elapsed_cur) if patients_ahead > 0 else 0.0
        queue_portion = max(0, patients_ahead - 1) * doc["base_time"] if patients_ahead > 0 else 0.0
        true_wait = remaining_cur + queue_portion + delay + np.random.normal(0, 3.0)
        true_wait = max(0.0, true_wait)

        records.append({
            "timestamp": timestamp.isoformat(),
            "doctor_id": doc["id"],
            "department_id": doc["dept"],
            "patients_ahead": patients_ahead,
            "elapsed_consultation_minutes": elapsed_cur,
            "avg_doctor_duration": doc["base_time"],
            "hour_of_day": hour,
            "day_of_week": day_of_week,
            "recent_clinic_delay_minutes": delay,
            "actual_wait_minutes": round(true_wait, 2)
        })

    df = pd.DataFrame(records)
    return df

def train_and_evaluate():
    print(f"Generating synthetic training dataset for dev model {MODEL_VERSION}...")
    df = generate_synthetic_dev_dataset(1500)

    # 1. Validation of minimum data threshold
    if len(df) < MINIMUM_DATA_THRESHOLD:
        raise ValueError(f"Insufficient data: {len(df)} records found, minimum required is {MINIMUM_DATA_THRESHOLD}")

    # 2. Chronological Train-Test Split (prevent temporal data leakage)
    df["dt"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("dt").reset_index(drop=True)
    
    split_idx = int(len(df) * 0.8)
    train_df = df.iloc[:split_idx]
    test_df = df.iloc[split_idx:]

    print(f"Dataset split chronologically: {len(train_df)} training samples, {len(test_df)} test samples.")

    feature_cols = [
        "patients_ahead",
        "elapsed_consultation_minutes",
        "avg_doctor_duration",
        "hour_of_day",
        "day_of_week",
        "recent_clinic_delay_minutes"
    ]

    X_train = train_df[feature_cols]
    y_train = train_df["actual_wait_minutes"]
    X_test = test_df[feature_cols]
    y_test = test_df["actual_wait_minutes"]

    # 3. Simple Baseline Algorithm (Standard FIFO multiplication for comparison)
    baseline_preds = np.maximum(0, (test_df["patients_ahead"] * test_df["avg_doctor_duration"]) - test_df["elapsed_consultation_minutes"] + test_df["recent_clinic_delay_minutes"])
    baseline_mae = mean_absolute_error(y_test, baseline_preds)
    print(f"Baseline Algorithmic Model MAE: {baseline_mae:.2f} minutes")

    # 4. Train scikit-learn Gradient Boosting Regressor
    model = GradientBoostingRegressor(
        n_estimators=100,
        learning_rate=0.08,
        max_depth=4,
        random_state=42
    )
    model.fit(X_train, y_train)

    # 5. Evaluate on Chronological Holdout Set
    preds = model.predict(X_test)
    preds = np.maximum(0, preds)
    ml_mae = mean_absolute_error(y_test, preds)
    ml_rmse = root_mean_squared_error(y_test, preds)
    print(f"Trained ML Regressor MAE: {ml_mae:.2f} minutes | RMSE: {ml_rmse:.2f} minutes")

    # 6. Save Model Artifact and Metadata
    joblib.dump(model, MODEL_FILE)
    
    metadata = {
        "model_version": MODEL_VERSION,
        "trained_at": datetime.now().isoformat(),
        "is_synthetic_dev_data": True,
        "sample_count": len(df),
        "features": feature_cols,
        "baseline_mae": round(baseline_mae, 2),
        "ml_mae": round(ml_mae, 2),
        "ml_rmse": round(ml_rmse, 2),
        "confidence_threshold": 0.85
    }
    
    with open(META_FILE, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"Model saved successfully to {MODEL_FILE}")
    print(f"Metadata saved to {META_FILE}")
    return metadata

if __name__ == "__main__":
    train_and_evaluate()
