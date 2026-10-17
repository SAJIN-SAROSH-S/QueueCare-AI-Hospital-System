import { describe, it, expect, beforeEach } from 'vitest';
import { recalculateQueuePositions } from '../src/lib/queue/stateMachine';
import { calculateAlgorithmicWaitTime } from '../src/lib/prediction/estimator';
import { MockDatabase } from '../src/lib/store/mockDb';
import { canOverrideEmergencyTriage } from '../src/lib/auth/roles';
import { TriageOverrideSchema } from '../src/lib/validations';
import { QueueEntry, PriorityLevel } from '../src/types/database';

describe('QueueCare AI - Clinical Triage Complete Test Suite', () => {
  let db: MockDatabase;

  beforeEach(() => {
    db = new MockDatabase();
  });

  // Triage Test 1: Emergency Override moves back-of-queue patient to Position #1
  it('Triage Test 1: Emergency override moves a patient from position #3 directly to position #1', () => {
    const docId = 'doc-menon-cardio';
    const waitingBefore = db.getQueueEntries('hosp-kochi-general-01', docId)
      .filter((e) => e.status === 'WAITING')
      .sort((a, b) => a.position_in_queue - b.position_in_queue);

    expect(waitingBefore.length).toBeGreaterThanOrEqual(3);
    const lastPatient = waitingBefore[waitingBefore.length - 1];
    expect(lastPatient.position_in_queue).toBe(3);

    // Apply EMERGENCY_OVERRIDE
    db.triageUrgentOverride(
      lastPatient.id,
      'EMERGENCY_OVERRIDE',
      'Acute chest pain and severe shortness of breath reported',
      { name: 'Dr. Arvind Menon', role: 'DOCTOR', id: 'user-doc-menon' }
    );

    const updatedPatient = db.getQueueEntryById(lastPatient.id);
    expect(updatedPatient?.priority).toBe('EMERGENCY_OVERRIDE');
    expect(updatedPatient?.position_in_queue).toBe(1);
  });

  // Triage Test 2: Subsequent waiting patients shift down deterministically
  it('Triage Test 2: Subsequent waiting patients shift down without gaps or duplicates', () => {
    const docId = 'doc-menon-cardio';
    const waitingBefore = db.getQueueEntries('hosp-kochi-general-01', docId)
      .filter((e) => e.status === 'WAITING')
      .sort((a, b) => a.position_in_queue - b.position_in_queue);

    const firstPatientBefore = waitingBefore[0];
    const secondPatientBefore = waitingBefore[1];
    const thirdPatientBefore = waitingBefore[2];

    expect(firstPatientBefore.position_in_queue).toBe(1);
    expect(secondPatientBefore.position_in_queue).toBe(2);

    // Override 3rd patient to Emergency
    db.triageUrgentOverride(
      thirdPatientBefore.id,
      'EMERGENCY_OVERRIDE',
      'Unstable vitals, saturation 88%',
      { name: 'Nurse Anjali', role: 'RECEPTIONIST' }
    );

    const waitingAfter = db.getQueueEntries('hosp-kochi-general-01', docId)
      .filter((e) => e.status === 'WAITING')
      .sort((a, b) => a.position_in_queue - b.position_in_queue);

    // Emergency patient is now #1
    expect(waitingAfter[0].id).toBe(thirdPatientBefore.id);
    expect(waitingAfter[0].position_in_queue).toBe(1);

    // Former #1 is now #2
    expect(waitingAfter[1].id).toBe(firstPatientBefore.id);
    expect(waitingAfter[1].position_in_queue).toBe(2);

    // Former #2 is now #3
    expect(waitingAfter[2].id).toBe(secondPatientBefore.id);
    expect(waitingAfter[2].position_in_queue).toBe(3);

    // Verify all positions are strictly unique and sequential 1..N
    const positions = waitingAfter.map((p) => p.position_in_queue);
    expect(positions).toEqual([1, 2, 3]);
  });

  // Triage Test 3: Active IN_CONSULTATION patient is not preempted
  it('Triage Test 3: Active consultation patient remains position 0 and is not preempted by triage override', () => {
    const docId = 'doc-menon-cardio';
    const activeBefore = db.getQueueEntries('hosp-kochi-general-01', docId)
      .find((e) => e.status === 'IN_CONSULTATION');

    expect(activeBefore).toBeDefined();
    expect(activeBefore?.position_in_queue).toBe(0);

    const waiting = db.getQueueEntries('hosp-kochi-general-01', docId)
      .filter((e) => e.status === 'WAITING');

    db.triageUrgentOverride(
      waiting[0].id,
      'EMERGENCY_OVERRIDE',
      'Severe arrhythmia',
      { name: 'Dr. Menon', role: 'DOCTOR' }
    );

    const activeAfter = db.getQueueEntryById(activeBefore!.id);
    expect(activeAfter?.status).toBe('IN_CONSULTATION');
    expect(activeAfter?.position_in_queue).toBe(0);
  });

  // Triage Test 4: Multi-tier priority ordering: EMERGENCY_OVERRIDE > URGENT > NORMAL
  it('Triage Test 4: Multi-tier priority ordering handles EMERGENCY, URGENT, and NORMAL tiers correctly', () => {
    const rawEntries: QueueEntry[] = [
      {
        id: 'p1', queue_id: 'q', hospital_id: 'h', doctor_id: 'd', token_number: 1,
        display_ticket: 'T-1', patient_name: 'Normal Patient 1', patient_phone: '1',
        priority: 'NORMAL', status: 'WAITING', position_in_queue: 1,
        estimated_wait_minutes: 10, wait_time_lower_bound: 8, wait_time_upper_bound: 12,
        created_at: '', updated_at: '',
      },
      {
        id: 'p2', queue_id: 'q', hospital_id: 'h', doctor_id: 'd', token_number: 2,
        display_ticket: 'T-2', patient_name: 'Normal Patient 2', patient_phone: '2',
        priority: 'NORMAL', status: 'WAITING', position_in_queue: 2,
        estimated_wait_minutes: 20, wait_time_lower_bound: 18, wait_time_upper_bound: 22,
        created_at: '', updated_at: '',
      },
      {
        id: 'p3', queue_id: 'q', hospital_id: 'h', doctor_id: 'd', token_number: 3,
        display_ticket: 'T-3', patient_name: 'Urgent Patient', patient_phone: '3',
        priority: 'URGENT', status: 'WAITING', position_in_queue: 3,
        estimated_wait_minutes: 30, wait_time_lower_bound: 28, wait_time_upper_bound: 32,
        created_at: '', updated_at: '',
      },
      {
        id: 'p4', queue_id: 'q', hospital_id: 'h', doctor_id: 'd', token_number: 4,
        display_ticket: 'T-4', patient_name: 'Emergency Patient', patient_phone: '4',
        priority: 'EMERGENCY_OVERRIDE', status: 'WAITING', position_in_queue: 4,
        estimated_wait_minutes: 40, wait_time_lower_bound: 38, wait_time_upper_bound: 42,
        created_at: '', updated_at: '',
      },
    ];

    const reordered = recalculateQueuePositions(rawEntries);

    // Expected order:
    // 1st: p4 (EMERGENCY_OVERRIDE)
    // 2nd: p3 (URGENT)
    // 3rd: p1 (NORMAL, token 1)
    // 4th: p2 (NORMAL, token 2)
    expect(reordered[0].id).toBe('p4');
    expect(reordered[0].position_in_queue).toBe(1);

    expect(reordered[1].id).toBe('p3');
    expect(reordered[1].position_in_queue).toBe(2);

    expect(reordered[2].id).toBe('p1');
    expect(reordered[2].position_in_queue).toBe(3);

    expect(reordered[3].id).toBe('p2');
    expect(reordered[3].position_in_queue).toBe(4);
  });

  // Triage Test 5: Multiple emergency cases order by FIFO within the emergency tier
  it('Triage Test 5: Multiple emergency cases order chronologically (FIFO) within the emergency tier', () => {
    const rawEntries: QueueEntry[] = [
      {
        id: 'em-1', queue_id: 'q', hospital_id: 'h', doctor_id: 'd', token_number: 10,
        display_ticket: 'T-10', patient_name: 'Emergency 1', patient_phone: '1',
        priority: 'EMERGENCY_OVERRIDE', status: 'WAITING', position_in_queue: 1,
        estimated_wait_minutes: 0, wait_time_lower_bound: 0, wait_time_upper_bound: 0,
        created_at: '', updated_at: '',
      },
      {
        id: 'em-2', queue_id: 'q', hospital_id: 'h', doctor_id: 'd', token_number: 12,
        display_ticket: 'T-12', patient_name: 'Emergency 2', patient_phone: '2',
        priority: 'EMERGENCY_OVERRIDE', status: 'WAITING', position_in_queue: 2,
        estimated_wait_minutes: 0, wait_time_lower_bound: 0, wait_time_upper_bound: 0,
        created_at: '', updated_at: '',
      },
    ];

    const reordered = recalculateQueuePositions(rawEntries);
    expect(reordered[0].id).toBe('em-1');
    expect(reordered[0].position_in_queue).toBe(1);
    expect(reordered[1].id).toBe('em-2');
    expect(reordered[1].position_in_queue).toBe(2);
  });

  // Triage Test 6: Wait-time calculations for Emergency Patient
  it('Triage Test 6: Algorithmic wait-time estimator gives immediate turn to emergency override', () => {
    const estimate = calculateAlgorithmicWaitTime({
      patientsAhead: 5,
      isEmergencyOverride: true,
      currentConsultationElapsedMinutes: 10,
      doctorAvgConsultationMinutes: 18,
    });

    expect(estimate.expected_wait_minutes).toBe(0);
    expect(estimate.confidence_level).toBe('HIGH');
    expect(estimate.explanation).toContain('Emergency priority flagged by clinical team');
  });

  // Triage Test 7: Audit logging of triage override
  it('Triage Test 7: Triage override creates an immutable audit trail entry with clinical justification', () => {
    const docId = 'doc-menon-cardio';
    const waiting = db.getQueueEntries('hosp-kochi-general-01', docId)
      .find((e) => e.status === 'WAITING');

    expect(waiting).toBeDefined();

    db.triageUrgentOverride(
      waiting!.id,
      'EMERGENCY_OVERRIDE',
      'Acute trauma with suspected fracture and hemorrhage',
      { name: 'Dr. Mathews Kurian', role: 'DOCTOR', id: 'doc-kurian-ortho' }
    );

    const logs = db.getAuditLogs('hosp-kochi-general-01');
    const triageLog = logs.find((l) => l.action === 'TRIAGE_PRIORITY_EMERGENCY_OVERRIDE');

    expect(triageLog).toBeDefined();
    expect(triageLog?.actor_name).toBe('Dr. Mathews Kurian');
    expect(triageLog?.actor_role).toBe('DOCTOR');
    expect(triageLog?.target_id).toBe(waiting!.id);
    expect(triageLog?.details).toMatchObject({
      priority: 'EMERGENCY_OVERRIDE',
      reason: 'Acute trauma with suspected fracture and hemorrhage',
    });
  });

  // Triage Test 8: Role-based permissions for triage override
  it('Triage Test 8: Enforces role permissions (Doctors, Receptionists, and Admins can override; Patients cannot)', () => {
    expect(canOverrideEmergencyTriage('DOCTOR')).toBe(true);
    expect(canOverrideEmergencyTriage('RECEPTIONIST')).toBe(true);
    expect(canOverrideEmergencyTriage('ADMIN')).toBe(true);
    expect(canOverrideEmergencyTriage('PATIENT')).toBe(false);
  });

  // Triage Test 9: Input validation using Zod schema
  it('Triage Test 9: Validates triage input schema and rejects invalid or missing justification', () => {
    // Valid input
    const valid = TriageOverrideSchema.safeParse({
      priority: 'EMERGENCY_OVERRIDE',
      reason: 'Patient fainting in waiting lounge',
      actorName: 'Anjali Pillai',
      actorRole: 'RECEPTIONIST',
    });
    expect(valid.success).toBe(true);

    // Invalid priority
    const invalidPriority = TriageOverrideSchema.safeParse({
      priority: 'SUPER_CRITICAL',
      reason: 'Patient fainting',
      actorRole: 'DOCTOR',
    });
    expect(invalidPriority.success).toBe(false);

    // Reason too short (< 3 characters)
    const shortReason = TriageOverrideSchema.safeParse({
      priority: 'URGENT',
      reason: 'ab',
      actorRole: 'DOCTOR',
    });
    expect(shortReason.success).toBe(false);

    // Unauthorized role
    const unauthorizedRole = TriageOverrideSchema.safeParse({
      priority: 'EMERGENCY_OVERRIDE',
      reason: 'Valid reason',
      actorRole: 'PATIENT',
    });
    expect(unauthorizedRole.success).toBe(false);
  });

  // Triage Test 10: Triage Downgrade / Stabilization restores normal queue position
  it('Triage Test 10: Downgrading stabilized patient back to NORMAL restores standard queue position', () => {
    const docId = 'doc-menon-cardio';
    const waiting = db.getQueueEntries('hosp-kochi-general-01', docId)
      .filter((e) => e.status === 'WAITING')
      .sort((a, b) => a.position_in_queue - b.position_in_queue);

    const targetPatient = waiting[waiting.length - 1]; // Originally last

    // 1. Upgrade to Emergency
    db.triageUrgentOverride(
      targetPatient.id,
      'EMERGENCY_OVERRIDE',
      'Acute panic attack with chest tightness',
      { name: 'Dr. Menon', role: 'DOCTOR' }
    );
    expect(db.getQueueEntryById(targetPatient.id)?.position_in_queue).toBe(1);

    // 2. Patient stabilizes, triage physician downgrades to NORMAL
    db.triageUrgentOverride(
      targetPatient.id,
      'NORMAL',
      'ECG normal, patient stabilized after oxygen support',
      { name: 'Dr. Menon', role: 'DOCTOR' }
    );

    const restoredPatient = db.getQueueEntryById(targetPatient.id);
    expect(restoredPatient?.priority).toBe('NORMAL');
    // Position moves back to appropriate FIFO sequence
    expect(restoredPatient?.position_in_queue).toBeGreaterThan(1);
  });
});
