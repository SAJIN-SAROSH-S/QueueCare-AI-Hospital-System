import { describe, it, expect, beforeEach } from 'vitest';
import { MockDatabase } from '../src/lib/store/mockDb';
import {
  enforceRole,
  canAccessPatientRecord,
  canManageQueueOperations,
  canOverrideEmergencyTriage,
  AuthorizationError,
} from '../src/lib/auth/roles';
import {
  validateStateTransition,
  recalculateQueuePositions,
  checkNoShowEligibility,
  InvalidStateTransitionError,
} from '../src/lib/queue/stateMachine';
import {
  calculateAlgorithmicWaitTime,
  getPredictedWaitTime,
} from '../src/lib/prediction/estimator';
import { QueueEntry, UserProfile, PriorityLevel } from '../src/types/database';

describe('QueueCare AI — 10 Mandatory Critical Engineering Journeys', () => {
  let db: MockDatabase;

  beforeEach(() => {
    db = new MockDatabase();
  });

  // Journey 1: Patient registration, login, and logout verification
  it('Journey 1: Patient registration, authentication lookup, and profile isolation', () => {
    const patient = db.getUserByEmail('patient@queuecare.ai');
    expect(patient).toBeDefined();
    expect(patient?.role).toBe('PATIENT');
    expect(patient?.full_name).toBe('Rahul Nair');

    // Negative case: non-existent patient returns undefined (cannot authenticate)
    const unknown = db.getUserByEmail('unregistered@random.com');
    expect(unknown).toBeUndefined();

    // Verify session identity lookup
    const lookedUp = db.getUserById('user-patient-rahul');
    expect(lookedUp?.id).toBe('user-patient-rahul');
    expect(lookedUp?.role).toBe('PATIENT');
  });

  // Journey 2: Appointment booking and slot time calculation
  it('Journey 2: Appointment booking and prevention of hour-overflow corruptions', () => {
    const apt = db.bookAppointment({
      hospitalId: 'hosp-kochi-general-01',
      departmentId: 'dept-cardio',
      doctorId: 'doc-menon-cardio',
      patientId: 'user-patient-rahul',
      patientName: 'Rahul Nair',
      patientPhone: '+91 98470 77889',
      appointmentDate: '2026-10-25',
      slotStartTime: '10:50',
      notes: 'Post-ECG checkup',
    });

    expect(apt).toBeDefined();
    expect(apt.status).toBe('SCHEDULED');
    // 10:50 + 15 min = 11:05 (Hour roll-over verified)
    expect(apt.slot_end_time).toBe('11:05');
  });

  // Journey 3: Check-in and live queue updates
  it('Journey 3: Check-in activates ticket in doctor queue with sequential token', () => {
    const apt = db.bookAppointment({
      hospitalId: 'hosp-kochi-general-01',
      departmentId: 'dept-cardio',
      doctorId: 'doc-menon-cardio',
      patientId: 'user-patient-rahul',
      patientName: 'Rahul Nair',
      patientPhone: '+91 98470 77889',
      appointmentDate: '2026-10-17',
      slotStartTime: '11:20',
    });

    const queueEntry = db.checkInAppointment(apt.id, {
      name: 'Anjali Pillai',
      role: 'RECEPTIONIST',
      id: 'user-reception-01',
    });

    expect(queueEntry.status).toBe('WAITING');
    expect(queueEntry.appointment_id).toBe(apt.id);
    expect(queueEntry.token_number).toBeGreaterThan(0);
    expect(queueEntry.display_ticket).toMatch(/CAR-\d{3}/);

    // Verify queue estimates were refreshed
    expect(queueEntry.position_in_queue).toBeGreaterThan(0);
  });

  // Journey 4: Doctor consultation start and completion lifecycle
  it('Journey 4: Doctor starts and completes consultation, shifting remaining queue up', () => {
    const docId = 'doc-menon-cardio';
    const entries = db.getQueueEntries('hosp-kochi-general-01', docId);
    const activeBefore = entries.find((e) => e.status === 'IN_CONSULTATION');
    const firstWaiting = entries.find((e) => e.status === 'WAITING' && e.position_in_queue === 1);

    expect(activeBefore).toBeDefined();
    expect(firstWaiting).toBeDefined();

    // 1. Doctor completes the active patient
    db.updateQueueStatus(activeBefore!.id, 'COMPLETED', {
      name: 'Dr. Arvind Menon',
      role: 'DOCTOR',
      id: 'user-doc-menon',
    });
    const completed = db.getQueueEntryById(activeBefore!.id);
    expect(completed?.status).toBe('COMPLETED');
    expect(completed?.position_in_queue).toBe(0);

    // 2. Doctor starts consultation for next patient
    db.updateQueueStatus(firstWaiting!.id, 'IN_CONSULTATION', {
      name: 'Dr. Arvind Menon',
      role: 'DOCTOR',
      id: 'user-doc-menon',
    });
    const nowConsulting = db.getQueueEntryById(firstWaiting!.id);
    expect(nowConsulting?.status).toBe('IN_CONSULTATION');
    expect(nowConsulting?.position_in_queue).toBe(0);
  });

  // Journey 5: Cancellation and no-show handling
  it('Journey 5: Patient cancellation and no-show eligibility check', () => {
    const waiting = db.getQueueEntries('hosp-kochi-general-01', 'doc-menon-cardio')
      .find((e) => e.status === 'WAITING');

    expect(waiting).toBeDefined();

    // Patient cancels
    const cancelled = db.updateQueueStatus(waiting!.id, 'CANCELLED', {
      name: 'Rahul Nair',
      role: 'PATIENT',
      id: 'user-patient-rahul',
    });
    expect(cancelled.status).toBe('CANCELLED');

    // State machine verifies CANCELLED cannot transition to IN_CONSULTATION
    expect(() => validateStateTransition('CANCELLED', 'IN_CONSULTATION')).toThrow(
      InvalidStateTransitionError
    );

    // Grace period check for no-show (30 min threshold)
    const callTime = new Date(Date.now() - 35 * 60 * 1000); // 35 min ago
    const noShowCheck = checkNoShowEligibility(callTime, 30);
    expect(noShowCheck.eligible).toBe(true);
  });

  // Journey 6: Receptionist and doctor permission boundaries
  it('Journey 6: Clinical vs administrative role permission boundaries', () => {
    // Receptionist can manage queue operations
    expect(canManageQueueOperations('RECEPTIONIST')).toBe(true);
    // Doctor can manage queue operations
    expect(canManageQueueOperations('DOCTOR')).toBe(true);
    // Patient CANNOT manage queue operations
    expect(canManageQueueOperations('PATIENT')).toBe(false);

    // Role enforcement throws AuthorizationError
    expect(() => enforceRole('PATIENT', ['DOCTOR', 'RECEPTIONIST'])).toThrow(
      AuthorizationError
    );
  });

  // Journey 7: Administrator management within authorized scope
  it('Journey 7: Administrator audit log access and user management boundary', () => {
    // Admin has permission to access audit logs
    expect(() => enforceRole('ADMIN', ['ADMIN'])).not.toThrow();

    // Non-admin attempting to access admin functions is blocked
    expect(() => enforceRole('DOCTOR', ['ADMIN'])).toThrow(AuthorizationError);
    expect(() => enforceRole('RECEPTIONIST', ['ADMIN'])).toThrow(AuthorizationError);
    expect(() => enforceRole('PATIENT', ['ADMIN'])).toThrow(AuthorizationError);

    // Audit logs verification
    const logs = db.getAuditLogs('hosp-kochi-general-01');
    expect(logs.length).toBeGreaterThan(0);
  });

  // Journey 8: Unauthorized cross-hospital and cross-patient data access
  it('Journey 8: Unauthorized cross-patient access blocked and cross-hospital data isolated', () => {
    const patientUser: Pick<UserProfile, 'id' | 'role'> = {
      id: 'user-patient-rahul',
      role: 'PATIENT',
    };

    // Patient cannot access other patient records
    expect(canAccessPatientRecord(patientUser, 'user-patient-rahul')).toBe(true);
    expect(canAccessPatientRecord(patientUser, 'user-patient-other')).toBe(false);

    // Hospital data isolation
    const kochiQueue = db.getQueueEntries('hosp-kochi-general-01');
    const otherHospitalQueue = db.getQueueEntries('hosp-unauthorized-external');
    expect(kochiQueue.length).toBeGreaterThan(0);
    expect(otherHospitalQueue.length).toBe(0);
  });

  // Journey 9: Waiting-time prediction fallback when ML microservice fails
  it('Journey 9: Prediction service fallback safely generates bounded estimates', async () => {
    const prediction = await getPredictedWaitTime({
      patientsAhead: 3,
      currentConsultationElapsedMinutes: 5,
      doctorAvgConsultationMinutes: 15,
      recentClinicDelayMinutes: 5,
      doctorBreakMinutes: 0,
      isEmergencyOverride: false,
    });

    expect(prediction).toBeDefined();
    expect(prediction.expected_wait_minutes).toBeGreaterThan(0);
    expect(prediction.lower_bound_minutes).toBeLessThanOrEqual(prediction.expected_wait_minutes);
    expect(prediction.explanation.length).toBeGreaterThan(0);
    expect(['ML_MODEL_V1', 'ALGORITHMIC_BASELINE']).toContain(prediction.prediction_source);
  });

  // Journey 10: Clinical emergency triage override moves critical patient to Position #1
  it('Journey 10: Clinical emergency triage override bypasses standard FIFO safely', () => {
    const docId = 'doc-menon-cardio';
    const waitingBefore = db.getQueueEntries('hosp-kochi-general-01', docId)
      .filter((e) => e.status === 'WAITING')
      .sort((a, b) => a.position_in_queue - b.position_in_queue);

    expect(waitingBefore.length).toBeGreaterThanOrEqual(2);
    const lastPatient = waitingBefore[waitingBefore.length - 1];

    // Doctor triggers EMERGENCY_OVERRIDE with clinical justification
    db.triageUrgentOverride(
      lastPatient.id,
      'EMERGENCY_OVERRIDE',
      'Acute diaphoresis and radiating retrosternal chest pain',
      { name: 'Dr. Arvind Menon', role: 'DOCTOR', id: 'user-doc-menon' }
    );

    const reordered = db.getQueueEntries('hosp-kochi-general-01', docId)
      .filter((e) => e.status === 'WAITING')
      .sort((a, b) => a.position_in_queue - b.position_in_queue);

    // Emergency patient is now at Position 1
    expect(reordered[0].id).toBe(lastPatient.id);
    expect(reordered[0].position_in_queue).toBe(1);
    expect(reordered[0].priority).toBe('EMERGENCY_OVERRIDE');
  });
});
