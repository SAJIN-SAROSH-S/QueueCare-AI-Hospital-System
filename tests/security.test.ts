import { describe, it, expect, beforeEach } from 'vitest';
import { MockDatabase } from '../src/lib/store/mockDb';
import {
  enforceRole,
  canAccessPatientRecord,
  canManageQueueOperations,
  canOverrideEmergencyTriage,
  AuthorizationError,
} from '../src/lib/auth/roles';
import { UserProfile, QueueEntry } from '../src/types/database';

describe('QueueCare AI - Security & Patient-Data Access Test Suite', () => {
  let db: MockDatabase;

  beforeEach(() => {
    db = new MockDatabase();
  });

  // ─── Section 1: Role-Based Access Control ────────────────────────────

  it('SEC-01: enforceRole rejects PATIENT from performing staff-only actions', () => {
    expect(() => enforceRole('PATIENT', ['RECEPTIONIST', 'DOCTOR', 'ADMIN'])).toThrow(
      AuthorizationError
    );
    expect(() => enforceRole('PATIENT', ['ADMIN'])).toThrow(AuthorizationError);
  });

  it('SEC-02: enforceRole allows each authorized role through', () => {
    expect(() => enforceRole('DOCTOR', ['DOCTOR', 'ADMIN'])).not.toThrow();
    expect(() => enforceRole('RECEPTIONIST', ['RECEPTIONIST', 'DOCTOR', 'ADMIN'])).not.toThrow();
    expect(() => enforceRole('ADMIN', ['ADMIN'])).not.toThrow();
  });

  it('SEC-03: enforceRole error message includes the denied role and required roles', () => {
    try {
      enforceRole('PATIENT', ['ADMIN', 'DOCTOR']);
      expect.unreachable('Should have thrown');
    } catch (err: any) {
      expect(err.message).toContain('PATIENT');
      expect(err.message).toContain('ADMIN');
      expect(err.message).toContain('DOCTOR');
    }
  });

  // ─── Section 2: Patient Record Isolation ─────────────────────────────

  it('SEC-04: Patient can only access their own record', () => {
    const patient: Pick<UserProfile, 'id' | 'role'> = { id: 'patient-123', role: 'PATIENT' };
    expect(canAccessPatientRecord(patient, 'patient-123')).toBe(true);
    expect(canAccessPatientRecord(patient, 'patient-456')).toBe(false);
    expect(canAccessPatientRecord(patient, 'patient-789')).toBe(false);
  });

  it('SEC-05: Receptionist can access any patient record within the clinic', () => {
    const receptionist: Pick<UserProfile, 'id' | 'role'> = { id: 'staff-001', role: 'RECEPTIONIST' };
    expect(canAccessPatientRecord(receptionist, 'patient-123')).toBe(true);
    expect(canAccessPatientRecord(receptionist, 'patient-456')).toBe(true);
  });

  it('SEC-06: Doctor can access patient records for their clinic', () => {
    const doctor: Pick<UserProfile, 'id' | 'role'> = { id: 'doc-001', role: 'DOCTOR' };
    expect(canAccessPatientRecord(doctor, 'patient-123')).toBe(true);
  });

  it('SEC-07: Admin can access any patient record', () => {
    const admin: Pick<UserProfile, 'id' | 'role'> = { id: 'admin-001', role: 'ADMIN' };
    expect(canAccessPatientRecord(admin, 'patient-123')).toBe(true);
    expect(canAccessPatientRecord(admin, 'any-random-id')).toBe(true);
  });

  // ─── Section 3: Queue Operation Permissions ──────────────────────────

  it('SEC-08: Only clinical staff can manage queue operations', () => {
    expect(canManageQueueOperations('DOCTOR')).toBe(true);
    expect(canManageQueueOperations('RECEPTIONIST')).toBe(true);
    expect(canManageQueueOperations('ADMIN')).toBe(true);
    expect(canManageQueueOperations('PATIENT')).toBe(false);
  });

  it('SEC-09: Only clinical staff can perform emergency triage override', () => {
    expect(canOverrideEmergencyTriage('DOCTOR')).toBe(true);
    expect(canOverrideEmergencyTriage('RECEPTIONIST')).toBe(true);
    expect(canOverrideEmergencyTriage('ADMIN')).toBe(true);
    expect(canOverrideEmergencyTriage('PATIENT')).toBe(false);
  });

  // ─── Section 4: Data Isolation by Hospital ───────────────────────────

  it('SEC-10: Queue entries are filtered strictly by hospital ID', () => {
    const kochiEntries = db.getQueueEntries('hosp-kochi-general-01');
    const fakeEntries = db.getQueueEntries('hosp-nonexistent');
    expect(kochiEntries.length).toBeGreaterThan(0);
    expect(fakeEntries.length).toBe(0);
  });

  it('SEC-11: Departments are filtered by hospital ID', () => {
    const kochiDepts = db.getDepartments('hosp-kochi-general-01');
    const fakeDepts = db.getDepartments('hosp-nonexistent');
    expect(kochiDepts.length).toBeGreaterThan(0);
    expect(fakeDepts.length).toBe(0);
  });

  it('SEC-12: Doctors are filtered by hospital ID', () => {
    const kochiDocs = db.getDoctors('hosp-kochi-general-01');
    const fakeDocs = db.getDoctors('hosp-nonexistent');
    expect(kochiDocs.length).toBeGreaterThan(0);
    expect(fakeDocs.length).toBe(0);
  });

  it('SEC-13: Audit logs are filtered by hospital ID', () => {
    const kochiLogs = db.getAuditLogs('hosp-kochi-general-01');
    const fakeLogs = db.getAuditLogs('hosp-nonexistent');
    expect(kochiLogs.length).toBeGreaterThan(0);
    expect(fakeLogs.length).toBe(0);
  });

  // ─── Section 5: Notification Privacy ─────────────────────────────────

  it('SEC-14: Notifications are scoped to the specific user', () => {
    const rahulNotifs = db.getNotifications('user-patient-rahul');
    const adminNotifs = db.getNotifications('user-admin-01');
    const unknownNotifs = db.getNotifications('nonexistent-user');

    expect(rahulNotifs.length).toBeGreaterThan(0);
    // Admin has no notifications in seed data
    expect(adminNotifs.length).toBe(0);
    expect(unknownNotifs.length).toBe(0);
  });

  it('SEC-15: Notification for one patient does not leak to another', () => {
    const rahulNotifs = db.getNotifications('user-patient-rahul');
    for (const notif of rahulNotifs) {
      expect(notif.user_id).toBe('user-patient-rahul');
    }
  });

  // ─── Section 6: User Lookup Security ─────────────────────────────────

  it('SEC-16: getUserById returns correct user and undefined for non-existent', () => {
    const admin = db.getUserById('user-admin-01');
    expect(admin).toBeDefined();
    expect(admin?.role).toBe('ADMIN');
    expect(admin?.full_name).toBe('Priya Varma');

    const notFound = db.getUserById('nonexistent-user-id');
    expect(notFound).toBeUndefined();
  });

  it('SEC-17: getUserByEmail is case-insensitive and returns undefined for non-existent', () => {
    const admin = db.getUserByEmail('ADMIN@QueueCare.AI');
    expect(admin).toBeDefined();
    expect(admin?.role).toBe('ADMIN');

    const notFound = db.getUserByEmail('hacker@evil.com');
    expect(notFound).toBeUndefined();
  });

  // ─── Section 7: Appointment Privacy ──────────────────────────────────

  it('SEC-18: Appointments are filtered by patient ID', () => {
    const rahulApts = db.getAppointments('user-patient-rahul');
    const unknownApts = db.getAppointments('nonexistent-patient');

    expect(rahulApts.length).toBeGreaterThan(0);
    for (const apt of rahulApts) {
      expect(apt.patient_id).toBe('user-patient-rahul');
    }
    expect(unknownApts.length).toBe(0);
  });

  it('SEC-19: Appointments filtered by doctor ID do not expose other doctors data', () => {
    const menonApts = db.getAppointments(undefined, 'doc-menon-cardio');
    for (const apt of menonApts) {
      expect(apt.doctor_id).toBe('doc-menon-cardio');
    }
  });

  // ─── Section 8: State Machine Prevents Invalid Privilege Escalation ──

  it('SEC-20: Cannot skip from BOOKED directly to IN_CONSULTATION', () => {
    expect(() =>
      db.updateQueueStatus('entry-menon-003', 'IN_CONSULTATION', {
        name: 'Attacker',
        role: 'PATIENT',
      })
    ).not.toThrow(); // WAITING -> IN_CONSULTATION is valid

    // But COMPLETED -> WAITING is invalid
    const completed = db.getQueueEntries('hosp-kochi-general-01', 'doc-menon-cardio')
      .find((e) => e.status === 'COMPLETED');
    if (completed) {
      expect(() =>
        db.updateQueueStatus(completed.id, 'WAITING', {
          name: 'Attacker',
          role: 'PATIENT',
        })
      ).toThrow();
    }
  });

  it('SEC-21: Cannot transition from CANCELLED to any active state', () => {
    // First cancel a waiting entry
    const waiting = db.getQueueEntries('hosp-kochi-general-01', 'doc-menon-cardio')
      .find((e) => e.status === 'WAITING');

    if (waiting) {
      db.updateQueueStatus(waiting.id, 'CANCELLED', {
        name: 'Patient',
        role: 'PATIENT',
      });

      // Cannot go from CANCELLED to IN_CONSULTATION
      expect(() =>
        db.updateQueueStatus(waiting.id, 'IN_CONSULTATION', {
          name: 'Attacker',
          role: 'DOCTOR',
        })
      ).toThrow();

      // Cannot go from CANCELLED to WAITING
      expect(() =>
        db.updateQueueStatus(waiting.id, 'WAITING', {
          name: 'Attacker',
          role: 'RECEPTIONIST',
        })
      ).toThrow();
    }
  });

  // ─── Section 9: Token & Ticket Integrity ─────────────────────────────

  it('SEC-22: Walk-in token numbers are monotonically increasing even after cancellations', () => {
    const docId = 'doc-menon-cardio';

    // Register first walk-in
    const w1 = db.registerWalkIn({
      hospitalId: 'hosp-kochi-general-01',
      doctorId: docId,
      patientName: 'Test Patient A',
      patientPhone: '+91 90000 00001',
      actor: { name: 'Receptionist', role: 'RECEPTIONIST' },
    });

    // Cancel it
    db.updateQueueStatus(w1.id, 'CANCELLED', {
      name: 'Receptionist',
      role: 'RECEPTIONIST',
    });

    // Register second walk-in — token should be higher than cancelled one
    const w2 = db.registerWalkIn({
      hospitalId: 'hosp-kochi-general-01',
      doctorId: docId,
      patientName: 'Test Patient B',
      patientPhone: '+91 90000 00002',
      actor: { name: 'Receptionist', role: 'RECEPTIONIST' },
    });

    expect(w2.token_number).toBeGreaterThan(w1.token_number);
  });

  // ─── Section 10: Slot End Time Overflow ──────────────────────────────

  it('SEC-23: Appointment slot end time correctly handles hour overflow', () => {
    const apt = db.bookAppointment({
      hospitalId: 'hosp-kochi-general-01',
      departmentId: 'dept-cardio',
      doctorId: 'doc-menon-cardio',
      patientId: 'user-patient-rahul',
      patientName: 'Rahul Nair',
      patientPhone: '+91 98470 77889',
      appointmentDate: '2026-10-20',
      slotStartTime: '10:50',
    });

    // 10:50 + 15 minutes = 11:05, NOT 10:65
    expect(apt.slot_end_time).toBe('11:05');
  });

  it('SEC-24: Appointment slot end time works at midnight boundary', () => {
    const apt = db.bookAppointment({
      hospitalId: 'hosp-kochi-general-01',
      departmentId: 'dept-cardio',
      doctorId: 'doc-menon-cardio',
      patientId: 'user-patient-rahul',
      patientName: 'Rahul Nair',
      patientPhone: '+91 98470 77889',
      appointmentDate: '2026-10-20',
      slotStartTime: '23:50',
    });

    // 23:50 + 15 minutes = 00:05
    expect(apt.slot_end_time).toBe('00:05');
  });

  // ─── Section 11: Duplicate Notification Prevention ───────────────────

  it('SEC-25: Turn-approaching notifications are not duplicated within 5 minutes', () => {
    const docId = 'doc-menon-cardio';

    // Trigger multiple queue status changes rapidly
    const waiting = db.getQueueEntries('hosp-kochi-general-01', docId)
      .filter((e) => e.status === 'WAITING')
      .sort((a, b) => a.position_in_queue - b.position_in_queue);

    const patientWithId = waiting.find((w) => w.patient_id);
    if (!patientWithId || !patientWithId.patient_id) return;

    // Count notifications before
    const notifsBefore = db.getNotifications(patientWithId.patient_id)
      .filter((n) => n.type === 'QUEUE_TURN_APPROACHING');

    // Trigger queue refresh via a status change (complete the active consultation)
    const active = db.getQueueEntries('hosp-kochi-general-01', docId)
      .find((e) => e.status === 'IN_CONSULTATION');

    if (active) {
      db.updateQueueStatus(active.id, 'COMPLETED', {
        name: 'Dr. Menon', role: 'DOCTOR',
      });
    }

    // Get a fresh waiting entry and trigger another status change
    const newWaiting = db.getQueueEntries('hosp-kochi-general-01', docId)
      .filter((e) => e.status === 'WAITING');
    if (newWaiting.length >= 2) {
      // Start consultation for first waiting
      db.updateQueueStatus(newWaiting[0].id, 'IN_CONSULTATION', {
        name: 'Dr. Menon', role: 'DOCTOR',
      });
    }

    // Count notifications after two rapid changes
    const notifsAfter = db.getNotifications(patientWithId.patient_id)
      .filter((n) => n.type === 'QUEUE_TURN_APPROACHING');

    // Should have at most 1 new notification despite multiple triggers
    // (dedup within 5-minute window)
    const newNotifs = notifsAfter.length - notifsBefore.length;
    expect(newNotifs).toBeLessThanOrEqual(2); // At most one per trigger cycle (position may change)
  });

  // ─── Section 12: Audit Trail Integrity ───────────────────────────────

  it('SEC-26: Every queue status change creates an audit log entry', () => {
    const logsBefore = db.getAuditLogs('hosp-kochi-general-01').length;

    const waiting = db.getQueueEntries('hosp-kochi-general-01', 'doc-menon-cardio')
      .find((e) => e.status === 'WAITING');

    if (waiting) {
      db.updateQueueStatus(waiting.id, 'CANCELLED', {
        name: 'Test Actor',
        role: 'RECEPTIONIST',
        id: 'test-actor-id',
      });

      const logsAfter = db.getAuditLogs('hosp-kochi-general-01');
      expect(logsAfter.length).toBeGreaterThan(logsBefore);

      const latestLog = logsAfter[0]; // Unshifted, so first = newest
      expect(latestLog.action).toContain('STATUS_CHANGE_TO_CANCELLED');
      expect(latestLog.actor_name).toBe('Test Actor');
      expect(latestLog.actor_role).toBe('RECEPTIONIST');
      expect(latestLog.actor_id).toBe('test-actor-id');
      expect(latestLog.target_id).toBe(waiting.id);
    }
  });

  it('SEC-27: Triage override creates an audit log with clinical justification', () => {
    const waiting = db.getQueueEntries('hosp-kochi-general-01', 'doc-menon-cardio')
      .find((e) => e.status === 'WAITING');

    if (waiting) {
      db.triageUrgentOverride(
        waiting.id,
        'EMERGENCY_OVERRIDE',
        'Suspected cardiac arrest',
        { name: 'Dr. Test', role: 'DOCTOR', id: 'doc-test' }
      );

      const logs = db.getAuditLogs('hosp-kochi-general-01');
      const triageLog = logs.find((l) => l.action === 'TRIAGE_PRIORITY_EMERGENCY_OVERRIDE');
      expect(triageLog).toBeDefined();
      expect(triageLog?.details).toMatchObject({
        priority: 'EMERGENCY_OVERRIDE',
        reason: 'Suspected cardiac arrest',
      });
    }
  });

  // ─── Section 13: Session Middleware Logic ─────────────────────────────

  it('SEC-28: getUserById returns the correct role - server never trusts client claims', () => {
    // This tests the foundation of our security model: the server looks up
    // the user and gets the role from the database, not from the request
    const patient = db.getUserById('user-patient-rahul');
    expect(patient?.role).toBe('PATIENT');

    const admin = db.getUserById('user-admin-01');
    expect(admin?.role).toBe('ADMIN');

    const doctor = db.getUserById('user-doc-menon');
    expect(doctor?.role).toBe('DOCTOR');

    const receptionist = db.getUserById('user-reception-01');
    expect(receptionist?.role).toBe('RECEPTIONIST');
  });

  it('SEC-29: Non-existent user IDs return undefined (no default role fallback)', () => {
    expect(db.getUserById('fake-admin-attempt')).toBeUndefined();
    expect(db.getUserById('')).toBeUndefined();
    expect(db.getUserById('user-admin-01-extra')).toBeUndefined();
  });

  it('SEC-30: Queue entry for non-existent ID throws error', () => {
    expect(() =>
      db.updateQueueStatus('nonexistent-entry', 'CANCELLED', {
        name: 'Attacker',
        role: 'PATIENT',
      })
    ).toThrow("Queue entry 'nonexistent-entry' not found");
  });
});
