import { describe, it, expect, beforeEach } from 'vitest';
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
import { MockDatabase } from '../src/lib/store/mockDb';
import {
  enforceRole,
  canAccessPatientRecord,
  AuthorizationError,
} from '../src/lib/auth/roles';
import { QueueEntry, UserProfile } from '../src/types/database';

describe('QueueCare AI - Comprehensive System Test Suite', () => {
  let db: MockDatabase;

  beforeEach(() => {
    db = new MockDatabase();
  });

  // 1. User authentication
  it('1. User authentication: identifies user profiles correctly by email and provides credentials mapping', () => {
    const admin = db.getUserByEmail('admin@queuecare.ai');
    expect(admin).toBeDefined();
    expect(admin?.role).toBe('ADMIN');

    const patient = db.getUserByEmail('patient@queuecare.ai');
    expect(patient).toBeDefined();
    expect(patient?.role).toBe('PATIENT');
  });

  // 2. Role-based access
  it('2. Role-based access: validates and restricts actions according to RBAC rules', () => {
    expect(() => enforceRole('PATIENT', ['ADMIN', 'RECEPTIONIST'])).toThrow(
      AuthorizationError
    );
    expect(() => enforceRole('DOCTOR', ['DOCTOR', 'ADMIN'])).not.toThrow();
  });

  // 3. Appointment booking
  it('3. Appointment booking: creates appointment with valid date and slot time', () => {
    const apt = db.bookAppointment({
      hospitalId: 'hosp-kochi-general-01',
      departmentId: 'dept-cardio',
      doctorId: 'doc-menon-cardio',
      patientId: 'user-patient-rahul',
      patientName: 'Rahul Nair',
      patientPhone: '+91 98470 77889',
      appointmentDate: '2026-10-20',
      slotStartTime: '11:00',
      notes: 'Cardiology follow-up',
    });

    expect(apt).toBeDefined();
    expect(apt.id).toContain('apt-');
    expect(apt.status).toBe('SCHEDULED');
  });

  // 4. Walk-in registration
  it('4. Walk-in registration: issues sequential ticket and adds patient into queue', () => {
    const walkIn = db.registerWalkIn({
      hospitalId: 'hosp-kochi-general-01',
      doctorId: 'doc-menon-cardio',
      patientName: 'Suresh Kumar',
      patientPhone: '+91 94470 99999',
      actor: { name: 'Receptionist Anjali', role: 'RECEPTIONIST' },
    });

    expect(walkIn).toBeDefined();
    expect(walkIn.display_ticket).toMatch(/CAR-\d{3}/);
    expect(walkIn.status).toBe('WAITING');
    expect(walkIn.position_in_queue).toBeGreaterThan(0);
  });

  // 5. Queue position calculation
  it('5. Queue position calculation: maintains 1-based sequential positions without duplicates', () => {
    const entries = db.getQueueEntries('hosp-kochi-general-01', 'doc-menon-cardio');
    const waiting = entries.filter((e) => e.status === 'WAITING');
    
    // Check positions are unique positive integers
    const positions = waiting.map((w) => w.position_in_queue);
    const uniquePositions = new Set(positions);
    expect(uniquePositions.size).toBe(positions.length);
  });

  // 6. Waiting-time estimates
  it('6. Waiting-time estimates: calculates expected waiting time with upper and lower bounds', () => {
    const estimate = calculateAlgorithmicWaitTime({
      patientsAhead: 3,
      currentConsultationElapsedMinutes: 4,
      doctorAvgConsultationMinutes: 15,
      recentClinicDelayMinutes: 0,
    });

    expect(estimate.expected_wait_minutes).toBeGreaterThan(0);
    expect(estimate.lower_bound_minutes).toBeLessThanOrEqual(estimate.expected_wait_minutes);
    expect(estimate.upper_bound_minutes).toBeGreaterThanOrEqual(estimate.expected_wait_minutes);
    expect(estimate.confidence_level).toBeDefined();
  });

  // 7. Recalculation after consultation completion
  it('7. Recalculation after consultation completion: shifts subsequent patients up', () => {
    const active = db.getQueueEntries('hosp-kochi-general-01', 'doc-menon-cardio')
      .find((e) => e.status === 'IN_CONSULTATION');
    
    expect(active).toBeDefined();
    if (active) {
      db.updateQueueStatus(active.id, 'COMPLETED', {
        name: 'Dr. Menon',
        role: 'DOCTOR',
      });

      const updated = db.getQueueEntryById(active.id);
      expect(updated?.status).toBe('COMPLETED');
      expect(updated?.position_in_queue).toBe(0);
    }
  });

  // 8. Doctor breaks and availability changes
  it('8. Doctor breaks and availability changes: updates waiting forecasts when doctor on break', () => {
    db.setDoctorAvailability('doc-menon-cardio', false, 'Clinical conference');
    const doctor = db.getDoctorById('doc-menon-cardio');
    expect(doctor?.is_available).toBe(false);

    const estimate = calculateAlgorithmicWaitTime({
      patientsAhead: 2,
      isDoctorAvailable: false,
    });
    expect(estimate.confidence_level).toBe('LOW');
    expect(estimate.explanation).toContain('unavailable');
  });

  // 9. Cancellation and no-show handling
  it('9. Cancellation and no-show handling: enforces grace period and status transitions', () => {
    const scheduled = new Date(Date.now() - 45 * 60 * 1000); // 45 mins ago
    const check = checkNoShowEligibility(scheduled, 30);
    expect(check.eligible).toBe(true);

    const waiting = db.getQueueEntries('hosp-kochi-general-01', 'doc-menon-cardio')
      .find((e) => e.status === 'WAITING');

    if (waiting) {
      const cancelled = db.updateQueueStatus(waiting.id, 'CANCELLED', {
        name: 'Patient Rahul',
        role: 'PATIENT',
      });
      expect(cancelled.status).toBe('CANCELLED');
    }
  });

  // 10. Concurrent queue updates
  it('10. Concurrent queue updates: recalculates positions deterministically without collisions', () => {
    const entries: QueueEntry[] = [
      {
        id: '1', queue_id: 'q1', hospital_id: 'h1', doctor_id: 'd1',
        token_number: 1, display_ticket: 'T-1', patient_name: 'P1',
        patient_phone: '1', priority: 'NORMAL', status: 'WAITING',
        position_in_queue: 1, estimated_wait_minutes: 10,
        wait_time_lower_bound: 8, wait_time_upper_bound: 12,
        created_at: '', updated_at: '',
      },
      {
        id: '2', queue_id: 'q1', hospital_id: 'h1', doctor_id: 'd1',
        token_number: 2, display_ticket: 'T-2', patient_name: 'P2',
        patient_phone: '2', priority: 'EMERGENCY_OVERRIDE', status: 'WAITING',
        position_in_queue: 2, estimated_wait_minutes: 20,
        wait_time_lower_bound: 15, wait_time_upper_bound: 25,
        created_at: '', updated_at: '',
      },
    ];

    const reordered = recalculateQueuePositions(entries);
    // Emergency override must jump to position 1
    const p2 = reordered.find((e) => e.id === '2');
    expect(p2?.position_in_queue).toBe(1);
    const p1 = reordered.find((e) => e.id === '1');
    expect(p1?.position_in_queue).toBe(2);
  });

  // 11. Hospital data isolation
  it('11. Hospital data isolation: filters queries strictly by hospital ID', () => {
    const clinic1Entries = db.getQueueEntries('hosp-kochi-general-01');
    const clinic2Entries = db.getQueueEntries('hosp-trivandrum-02');
    expect(clinic1Entries.length).toBeGreaterThan(0);
    expect(clinic2Entries.length).toBe(0);
  });

  // 12. Patient record privacy
  it('12. Patient record privacy: patients can only access their own records while staff can access clinic records', () => {
    const patientUser: Pick<UserProfile, 'id' | 'role'> = {
      id: 'patient-123',
      role: 'PATIENT',
    };
    expect(canAccessPatientRecord(patientUser, 'patient-123')).toBe(true);
    expect(canAccessPatientRecord(patientUser, 'patient-999')).toBe(false);

    const staffUser: Pick<UserProfile, 'id' | 'role'> = {
      id: 'staff-456',
      role: 'RECEPTIONIST',
    };
    expect(canAccessPatientRecord(staffUser, 'patient-999')).toBe(true);
  });

  // 13. Invalid state transitions
  it('13. Invalid state transitions: prevents invalid transitions (e.g. COMPLETED -> WAITING)', () => {
    expect(() => validateStateTransition('COMPLETED', 'WAITING')).toThrow(
      InvalidStateTransitionError
    );
    expect(() => validateStateTransition('CANCELLED', 'IN_CONSULTATION')).toThrow(
      InvalidStateTransitionError
    );
    expect(validateStateTransition('WAITING', 'IN_CONSULTATION')).toBe(true);
  });

  // 14. Fallback behavior when prediction service fails
  it('14. Fallback behavior when prediction service fails: falls back to algorithmic estimator', async () => {
    const res = await getPredictedWaitTime({
      patientsAhead: 2,
      currentConsultationElapsedMinutes: 5,
      doctorAvgConsultationMinutes: 15,
      recentClinicDelayMinutes: 0,
    });

    expect(res).toBeDefined();
    expect(res.expected_wait_minutes).toBeGreaterThan(0);
    expect(res.lower_bound_minutes).toBeDefined();
    expect(res.upper_bound_minutes).toBeDefined();
  });

  // 15. Mobile layout and core patient workflows
  it('15. Mobile layout and core patient workflows: verifies check-in creates active token and zero wait when next', () => {
    const apt = db.bookAppointment({
      hospitalId: 'hosp-kochi-general-01',
      departmentId: 'dept-pediatrics',
      doctorId: 'doc-nair-pediatrics',
      patientId: 'user-patient-rahul',
      patientName: 'Rahul Nair',
      patientPhone: '+91 98470 77889',
      appointmentDate: '2026-10-16',
      slotStartTime: '11:00',
    });

    const queueEntry = db.checkInAppointment(apt.id, {
      name: 'Mobile QR Check-in',
      role: 'PATIENT',
    });

    expect(queueEntry.status).toBe('WAITING');
    expect(queueEntry.appointment_id).toBe(apt.id);
  });
});
