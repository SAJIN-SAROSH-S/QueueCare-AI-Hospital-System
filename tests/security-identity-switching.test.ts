import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { mockDb, MockDatabase } from '../src/lib/store/mockDb';
import { getServerSession, requireRole } from '../src/lib/auth/session';
import {
  enforceRole,
  canAccessPatientRecord,
  canManageQueueOperations,
  canOverrideEmergencyTriage,
  AuthorizationError,
} from '../src/lib/auth/roles';

// API Route Handlers
import { GET as getAuditLogs } from '../src/app/api/audit-logs/route';
import { GET as getQueue, POST as postQueue } from '../src/app/api/queue/route';
import { PATCH as patchTriage } from '../src/app/api/queue/[id]/triage/route';
import { PATCH as patchStatus } from '../src/app/api/queue/[id]/status/route';
import { GET as getDoctors, PATCH as patchDoctor } from '../src/app/api/doctors/route';
import { GET as getAppointments, POST as postAppointment } from '../src/app/api/appointments/route';
import { POST as postCheckin } from '../src/app/api/appointments/[id]/checkin/route';
import { GET as getNotifications } from '../src/app/api/notifications/route';

describe('CRITICAL SECURITY: QueueCare AI Identity Switching & Access Control', () => {
  let db: MockDatabase;

  beforeEach(() => {
    db = new MockDatabase();
  });

  // Helper to create mock NextRequest with demo cookie
  function createAuthedRequest(
    url: string,
    options: {
      userId?: string;
      method?: string;
      body?: any;
    } = {}
  ): NextRequest {
    const { userId, method = 'GET', body } = options;
    const headers = new Headers();
    if (body) {
      headers.set('Content-Type', 'application/json');
    }
    if (userId) {
      // Cookie is the primary trusted session token
      headers.set('Cookie', `queuecare_demo_user=${userId}`);
    }

    return new NextRequest(new URL(url, 'http://localhost:3000'), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // =========================================================================
  // 1. Log in as patient and attempt to access doctor/staff functions directly
  // =========================================================================
  describe('Requirement 1: Direct Access Denial for Patient Role', () => {
    it('SEC-ID-01: enforceRole rejects PATIENT from doctor, receptionist, and admin scopes', () => {
      expect(() => enforceRole('PATIENT', ['DOCTOR'])).toThrow(AuthorizationError);
      expect(() => enforceRole('PATIENT', ['RECEPTIONIST'])).toThrow(AuthorizationError);
      expect(() => enforceRole('PATIENT', ['ADMIN'])).toThrow(AuthorizationError);
      expect(() => enforceRole('PATIENT', ['DOCTOR', 'RECEPTIONIST', 'ADMIN'])).toThrow(AuthorizationError);
    });

    it('SEC-ID-02: Patient is blocked from queue operations and emergency triage overrides', () => {
      expect(canManageQueueOperations('PATIENT')).toBe(false);
      expect(canOverrideEmergencyTriage('PATIENT')).toBe(false);
      expect(canManageQueueOperations('DOCTOR')).toBe(true);
      expect(canManageQueueOperations('RECEPTIONIST')).toBe(true);
      expect(canManageQueueOperations('ADMIN')).toBe(true);
    });

    it('SEC-ID-03: requireRole helper rejects patient when staff role is required', async () => {
      const patientReq = createAuthedRequest('http://localhost:3000/api/test', {
        userId: 'user-patient-rahul',
      });
      await expect(requireRole(patientReq, ['DOCTOR', 'ADMIN'])).rejects.toThrow(
        "Role 'PATIENT' is not permitted"
      );
    });
  });

  // =========================================================================
  // 2. Attempt to call protected APIs using a patient session
  // =========================================================================
  describe('Requirement 2: Protected API Enforcement', () => {
    it('SEC-ID-04: Patient calling GET /api/audit-logs is rejected with 403 Forbidden', async () => {
      const patientReq = createAuthedRequest('http://localhost:3000/api/audit-logs', {
        userId: 'user-patient-rahul',
      });
      const res = await getAuditLogs(patientReq);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Only administrators can access audit logs');
    });

    it('SEC-ID-05: Patient calling POST /api/queue (walk-in registration) is rejected with 403 Forbidden', async () => {
      const patientReq = createAuthedRequest('http://localhost:3000/api/queue', {
        userId: 'user-patient-rahul',
        method: 'POST',
        body: {
          hospitalId: 'hosp-kochi-general-01',
          doctorId: 'doc-menon-cardio',
          patientName: 'Malicious Attacker',
          patientPhone: '+91 99999 11111',
        },
      });
      const res = await postQueue(patientReq);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Only receptionists and admins');
    });

    it('SEC-ID-06: Patient calling PATCH /api/queue/[id]/triage is rejected with 403 Forbidden', async () => {
      const patientReq = createAuthedRequest('http://localhost:3000/api/queue/qe-001/triage', {
        userId: 'user-patient-rahul',
        method: 'PATCH',
        body: {
          priority: 'CRITICAL',
          reason: 'Bypass the line claim',
        },
      });
      const res = await patchTriage(patientReq, { params: { id: 'qe-001' } });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Only clinical staff');
    });

    it('SEC-ID-07: Patient calling PATCH /api/doctors (update availability) is rejected with 403 Forbidden', async () => {
      const patientReq = createAuthedRequest('http://localhost:3000/api/doctors', {
        userId: 'user-patient-rahul',
        method: 'PATCH',
        body: {
          doctorId: 'doc-menon-cardio',
          isAvailable: false,
          reason: 'Unauthorized toggle',
        },
      });
      const res = await patchDoctor(patientReq);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Only doctors, receptionists, and admins');
    });

    it('SEC-ID-08: Doctor cannot update another doctor availability', async () => {
      // Dr. Menon (user-doc-menon) attempts to change Dr. Meera's status (doc-nair-pediatrics)
      const docReq = createAuthedRequest('http://localhost:3000/api/doctors', {
        userId: 'user-doc-menon',
        method: 'PATCH',
        body: {
          doctorId: 'doc-nair-pediatrics',
          isAvailable: false,
          reason: 'Malicious off-duty toggle',
        },
      });
      const res = await patchDoctor(docReq);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('Doctors can only update their own availability');
    });
  });

  // =========================================================================
  // 3. Attempt to modify role in browser storage and request payloads
  // =========================================================================
  describe('Requirement 3: Role Tampering & Payload Forgery Prevention', () => {
    it('SEC-ID-09: Server discards client-submitted actorRole in status update payload and enforces session role', async () => {
      // Patient passes "actorRole: ADMIN" in the request body
      const forgedReq = createAuthedRequest('http://localhost:3000/api/queue/qe-001/status', {
        userId: 'user-patient-rahul',
        method: 'PATCH',
        body: {
          targetStatus: 'IN_CONSULTATION', // Only staff can move patient to consultation
          actorRole: 'ADMIN',             // Forged claim in payload
          actorName: 'Admin Impersonator',
        },
      });
      const res = await patchStatus(forgedReq, { params: { id: 'qe-001' } });
      // Because server derives actorRole from session (PATIENT), it rejects the transition
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('Patients are only permitted to cancel');
    });

    it('SEC-ID-10: Server rejects client header spoofing when genuine session cookie is present', async () => {
      const headers = new Headers();
      // Genuine patient cookie
      headers.set('Cookie', 'queuecare_demo_user=user-patient-rahul');
      // Attacker injects admin header
      headers.set('x-queuecare-user-id', 'user-admin-01');

      const spoofReq = new NextRequest('http://localhost:3000/api/audit-logs', { headers });
      const session = await getServerSession(spoofReq);
      // Cookie takes precedence, server assigns verified patient role
      expect(session?.userId).toBe('user-patient-rahul');
      expect(session?.role).toBe('PATIENT');

      // Audit logs access must be denied
      const res = await getAuditLogs(spoofReq);
      expect(res.status).toBe(403);
    });

    it('SEC-ID-11: Database role cannot be spoofed by client-side identifier tampering', () => {
      const profile = mockDb.getUserById('user-patient-rahul');
      expect(profile?.role).toBe('PATIENT');

      // Modifying in-memory role by client is not persisted; DB remains single source of truth
      const lookedUp = mockDb.getUserByEmail('patient@queuecare.ai');
      expect(lookedUp?.role).toBe('PATIENT');
    });
  });

  // =========================================================================
  // 4. Attempt to access another patient's records by changing record IDs (IDOR)
  // =========================================================================
  describe('Requirement 4: IDOR and Patient Isolation Prevention', () => {
    it('SEC-ID-12: Patient cannot view another patient notifications', async () => {
      // Patient Rahul attempts to read notifications for another user
      const req = createAuthedRequest('http://localhost:3000/api/notifications?userId=user-patient-other', {
        userId: 'user-patient-rahul',
      });
      const res = await getNotifications(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('Patients can only view their own notifications');
    });

    it('SEC-ID-13: Patient query for another patient appointments is overridden to own ID', async () => {
      // Patient Rahul attempts to request Priya's or another patient's appointments
      const req = createAuthedRequest('http://localhost:3000/api/appointments?patientId=victim-id', {
        userId: 'user-patient-rahul',
      });
      const res = await getAppointments(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      // All returned appointments belong strictly to Rahul
      for (const apt of json.appointments) {
        expect(apt.patient_id).toBe('user-patient-rahul');
      }
    });

    it('SEC-ID-14: Patient cannot check in an appointment belonging to someone else', async () => {
      // First create an appointment for someone else
      const victimApt = mockDb.bookAppointment({
        hospitalId: 'hosp-kochi-general-01',
        departmentId: 'dept-cardio',
        doctorId: 'doc-menon-cardio',
        patientId: 'user-victim-009',
        patientName: 'Victim User',
        patientPhone: '+91 99999 00000',
        appointmentDate: '2026-10-25',
        slotStartTime: '14:00',
        notes: 'Private checkup',
      });

      // Rahul attempts to check in victimApt
      const req = createAuthedRequest(`http://localhost:3000/api/appointments/${victimApt.id}/checkin`, {
        userId: 'user-patient-rahul',
        method: 'POST',
      });
      const res = await postCheckin(req, { params: { id: victimApt.id } });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('You can only check in your own appointment');
    });

    it('SEC-ID-15: Public unauthenticated queue view masks patient PII', async () => {
      const publicReq = new NextRequest('http://localhost:3000/api/queue?hospitalId=hosp-kochi-general-01');
      const res = await getQueue(publicReq);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.entries.length).toBeGreaterThan(0);
      for (const entry of json.entries) {
        // Patient phone must NEVER be present in public response
        expect(entry.patient_phone).toBeUndefined();
        // Patient name must be masked with asterisks
        if (entry.patient_name && entry.patient_name !== 'Patient') {
          expect(entry.patient_name).toContain('***');
        }
      }
    });
  });

  // =========================================================================
  // 5. Session Invalidation on Logout
  // =========================================================================
  describe('Requirement 5: Session Termination and Logout Invalidation', () => {
    it('SEC-ID-16: Unauthenticated request after session cookie cleared yields 401 Unauthorized', async () => {
      // Simulating cleared cookie after logout
      const unauthedReq = new NextRequest('http://localhost:3000/api/audit-logs');
      const res = await getAuditLogs(unauthedReq);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain('Authentication required');
    });

    it('SEC-ID-17: getServerSession returns null when cookie is absent or invalid', async () => {
      const emptyReq = new NextRequest('http://localhost:3000/api/queue');
      const session = await getServerSession(emptyReq);
      expect(session).toBeNull();

      const invalidReq = new NextRequest('http://localhost:3000/api/queue', {
        headers: { Cookie: 'queuecare_demo_user=non-existent-user-id' },
      });
      const invalidSession = await getServerSession(invalidReq);
      expect(invalidSession).toBeNull();
    });
  });

  // =========================================================================
  // 6. Valid Authentication & Strict Role Binding
  // =========================================================================
  describe('Requirement 6: Authentic Credentials & Role Binding', () => {
    it('SEC-ID-18: Authenticated sessions accurately bind to database roles', async () => {
      const adminReq = createAuthedRequest('http://localhost:3000/api/audit-logs', {
        userId: 'user-admin-01',
      });
      const adminSession = await getServerSession(adminReq);
      expect(adminSession?.role).toBe('ADMIN');

      const docReq = createAuthedRequest('http://localhost:3000/api/doctors', {
        userId: 'user-doc-menon',
      });
      const docSession = await getServerSession(docReq);
      expect(docSession?.role).toBe('DOCTOR');

      const recepReq = createAuthedRequest('http://localhost:3000/api/queue', {
        userId: 'user-reception-01',
      });
      const recepSession = await getServerSession(recepReq);
      expect(recepSession?.role).toBe('RECEPTIONIST');
    });

    it('SEC-ID-19: Admin session successfully accesses protected audit logs', async () => {
      const adminReq = createAuthedRequest('http://localhost:3000/api/audit-logs', {
        userId: 'user-admin-01',
      });
      const res = await getAuditLogs(adminReq);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.logs)).toBe(true);
    });
  });

  // =========================================================================
  // 7. Supabase Database Row Level Security (RLS) Rules
  // =========================================================================
  describe('Requirement 7: Supabase RLS Rule Validation', () => {
    it('SEC-ID-20: canAccessPatientRecord strictly confines patient to own ID', () => {
      const patient = { id: 'user-patient-rahul', role: 'PATIENT' as const };
      expect(canAccessPatientRecord(patient, 'user-patient-rahul')).toBe(true);
      expect(canAccessPatientRecord(patient, 'user-patient-other')).toBe(false);
      expect(canAccessPatientRecord(patient, 'user-admin-01')).toBe(false);
    });

    it('SEC-ID-21: canAccessPatientRecord permits clinical staff across clinic scope', () => {
      const doctor = { id: 'user-doc-menon', role: 'DOCTOR' as const };
      const recep = { id: 'user-reception-01', role: 'RECEPTIONIST' as const };
      const admin = { id: 'user-admin-01', role: 'ADMIN' as const };

      expect(canAccessPatientRecord(doctor, 'user-patient-rahul')).toBe(true);
      expect(canAccessPatientRecord(recep, 'user-patient-rahul')).toBe(true);
      expect(canAccessPatientRecord(admin, 'user-patient-rahul')).toBe(true);
    });
  });
});
