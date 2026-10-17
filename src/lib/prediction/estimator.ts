import { PredictionResult } from '@/types/database';

export interface EstimationInput {
  patientsAhead: number;
  currentConsultationElapsedMinutes?: number;
  doctorAvgConsultationMinutes?: number; // fallback: 15 mins
  recentClinicDelayMinutes?: number;
  doctorBreakMinutes?: number;
  isDoctorAvailable?: boolean;
  isEmergencyOverride?: boolean;
  currentTime?: Date;
}

const DEFAULT_DOCTOR_DURATION_MINUTES = 15;
const PREDICTION_SERVICE_URL = process.env.AI_PREDICTION_SERVICE_URL || 'http://localhost:8000';

/**
 * Robust algorithmic waiting-time estimator.
 * Used directly as the core deterministic engine and as instant fallback
 * if the Python microservice is offline.
 */
export function calculateAlgorithmicWaitTime(input: EstimationInput): PredictionResult {
  const now = input.currentTime || new Date();
  const avgDuration = input.doctorAvgConsultationMinutes && input.doctorAvgConsultationMinutes > 0 
    ? input.doctorAvgConsultationMinutes 
    : DEFAULT_DOCTOR_DURATION_MINUTES;

  const elapsedCurrent = Math.max(0, input.currentConsultationElapsedMinutes || 0);
  const clinicDelay = Math.max(0, input.recentClinicDelayMinutes || 0);
  const breakMinutes = Math.max(0, input.doctorBreakMinutes || 0);

  // If doctor is unavailable, inform with high uncertainty
  if (input.isDoctorAvailable === false) {
    return {
      expected_wait_minutes: 60,
      lower_bound_minutes: 30,
      upper_bound_minutes: 120,
      confidence_level: 'LOW',
      prediction_source: 'ALGORITHMIC_BASELINE',
      model_version: 'rule-engine-v1',
      explanation: 'Doctor is currently on declared leave or unavailable. Estimates will update once doctor returns.',
      is_synthetic_dev_model: false,
      timestamp: now.toISOString(),
    };
  }

  // Next in line or emergency override
  if (input.patientsAhead === 0 || input.isEmergencyOverride) {
    const remainingTime = Math.max(0, avgDuration - elapsedCurrent);
    const expected = input.isEmergencyOverride ? 0 : Math.round(remainingTime);
    const lower = Math.max(0, expected - 3);
    const upper = expected + 5;

    return {
      expected_wait_minutes: expected,
      lower_bound_minutes: lower,
      upper_bound_minutes: upper,
      confidence_level: 'HIGH',
      prediction_source: 'ALGORITHMIC_BASELINE',
      model_version: 'rule-engine-v1',
      explanation: input.isEmergencyOverride
        ? 'Emergency priority flagged by clinical team. Proceed immediately.'
        : 'You are next in queue. Please wait near the consultation door.',
      is_synthetic_dev_model: false,
      timestamp: now.toISOString(),
    };
  }

  // FIFO computation:
  // Remaining time of current consultation + preceding patients * avgDuration + breaks + delay
  const remainingActivePatient = Math.max(0, avgDuration - elapsedCurrent);
  const intermediatePatients = Math.max(0, input.patientsAhead - 1);
  const queueTime = intermediatePatients * avgDuration;

  const rawMinutes = remainingActivePatient + queueTime + clinicDelay + breakMinutes;
  const expectedMinutes = Math.max(1, Math.round(rawMinutes));

  // Uncertainty bounds (+/- 20% to 30% or at least 5 minutes)
  const margin = Math.max(5, Math.round(expectedMinutes * 0.25));
  const lowerBound = Math.max(1, expectedMinutes - margin);
  const upperBound = expectedMinutes + margin;

  // Confidence determination
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
  if (input.patientsAhead <= 2 && clinicDelay < 10) {
    confidence = 'HIGH';
  } else if (input.patientsAhead > 6 || clinicDelay > 20) {
    confidence = 'LOW';
  }

  const explanation = `Estimated wait: ${lowerBound}–${upperBound} minutes (${input.patientsAhead} patients ahead, doctor pace ~${avgDuration}m/patient, delay ${clinicDelay}m). This estimate may change as consultations progress.`;

  return {
    expected_wait_minutes: expectedMinutes,
    lower_bound_minutes: lowerBound,
    upper_bound_minutes: upperBound,
    confidence_level: confidence,
    prediction_source: 'ALGORITHMIC_BASELINE',
    model_version: 'rule-engine-v1',
    explanation,
    is_synthetic_dev_model: false,
    timestamp: now.toISOString(),
  };
}

/**
 * Predicts wait time using the AI microservice if accessible,
 * with seamless automatic fallback to algorithmic estimation.
 */
export async function getPredictedWaitTime(input: EstimationInput): Promise<PredictionResult> {
  const fallback = calculateAlgorithmicWaitTime(input);

  // Skip external call if immediate or zero queue
  if (input.patientsAhead === 0 || input.isEmergencyOverride) {
    return fallback;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s timeout

    const res = await fetch(`${PREDICTION_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patients_ahead: input.patientsAhead,
        elapsed_consultation_minutes: input.currentConsultationElapsedMinutes || 0,
        avg_doctor_duration: input.doctorAvgConsultationMinutes || DEFAULT_DOCTOR_DURATION_MINUTES,
        recent_clinic_delay_minutes: input.recentClinicDelayMinutes || 0,
        doctor_break_minutes: input.doctorBreakMinutes || 0,
        is_urgent_override: Boolean(input.isEmergencyOverride),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        expected_wait_minutes: data.expected_wait_minutes,
        lower_bound_minutes: data.lower_bound_minutes,
        upper_bound_minutes: data.upper_bound_minutes,
        confidence_level: data.confidence_level,
        prediction_source: data.prediction_source,
        model_version: data.model_version,
        explanation: data.explanation,
        is_synthetic_dev_model: data.is_synthetic_dev_model,
        timestamp: data.timestamp,
      };
    }
  } catch {
    // Prediction microservice offline or timed out; smoothly return algorithmic fallback
  }

  return fallback;
}
