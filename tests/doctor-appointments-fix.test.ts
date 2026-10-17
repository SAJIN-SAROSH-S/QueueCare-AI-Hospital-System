import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { MockDatabase } from '../src/lib/store/mockDb';
import { GET as getAppointments, POST as postAppointment } from '../src/app/api/appointments/route';
import { GET as getQueue } from '../src/app/api/queue/route';
import { DEMO_PERSONAS, IS_DEMO_MODE } from '../src/lib/auth/demoConfig';

describe('REGRESSION TEST SUITE: Selected Doctor, Appointment Isolation & Details Updating', () => {
  let db: MockDatabase;

  beforeEach(() => {
    db = new MockDatabase();
  });

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
      headers.set('Cookie', `queuecare_demo_user=${userId}`);
      headers.set('x-queuecare-user-id', userId);
    }
    return new NextRequest(new URL(url, 'http://localhost:3000'), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // =========================================================================
  // Requirement 1 & 2: Doctor Selection and Independent Appointment Persistence
  // =========================================================================
  describe('Requirement 1 & 2: Doctor Selection and Appointment Persistence', () => {
    it('DOC-01: Booking appointment with Doctor A (Cardiology - Dr. Arvind Menon) saves exact doctor ID', async () => {
      const req = createAuthedRequest('http://localhost:3000/api/appointments', {
        userId: 'user-patient-rahul',
        method: 'POST',
        body: {
          hospitalId: 'hosp-kochi-general-01',
          departmentId: 'dept-cardio',
          doctorId: 'doc-menon-cardio',
          patientId: 'user-patient-rahul',
          patientName: 'Rahul Nair',
          patientPhone: '+91 98470 77889',
          appointmentDate: '2026-10-25',
          slotStartTime: '10:00',
          notes: 'Cardiology routine visit',
        },
      });

      const res = await postAppointment(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.appointment.doctor_id).toBe('doc-menon-cardio');
      expect(json.appointment.doctor).toBeDefined();
      expect(json.appointment.doctor.full_name).toBe('Dr. Arvind Menon');
      expect(json.appointment.doctor.specialization).toContain('Cardiologist');
    });

    it('DOC-02: Booking second appointment with Doctor B (Pediatrics - Dr. Sneha Nair) preserves distinct doctor details', async () => {
      // 1. Book Doctor A
      const reqA = createAuthedRequest('http://localhost:3000/api/appointments', {
        userId: 'user-patient-rahul',
        method: 'POST',
        body: {
          hospitalId: 'hosp-kochi-general-01',
          departmentId: 'dept-cardio',
          doctorId: 'doc-menon-cardio',
          patientId: 'user-patient-rahul',
          patientName: 'Rahul Nair',
          patientPhone: '+91 98470 77889',
          appointmentDate: '2026-10-25',
          slotStartTime: '10:00',
        },
      });
      const resA = await postAppointment(reqA);
      const dataA = await resA.json();

      // 2. Book Doctor B
      const reqB = createAuthedRequest('http://localhost:3000/api/appointments', {
        userId: 'user-patient-rahul',
        method: 'POST',
        body: {
          hospitalId: 'hosp-kochi-general-01',
          departmentId: 'dept-pediatrics',
          doctorId: 'doc-nair-pediatrics',
          patientId: 'user-patient-rahul',
          patientName: 'Rahul Nair',
          patientPhone: '+91 98470 77889',
          appointmentDate: '2026-10-26',
          slotStartTime: '11:00',
        },
      });
      const resB = await postAppointment(reqB);
      expect(resB.status).toBe(201);
      const dataB = await resB.json();

      // Verify Doctor B retains its own doctor ID and specialization
      expect(dataB.appointment.doctor_id).toBe('doc-nair-pediatrics');
      expect(dataB.appointment.doctor.full_name).toBe('Dr. Sneha Nair');
      expect(dataB.appointment.doctor.specialization).toContain('Pediatrician');

      // Verify Appointment A was NOT mutated or overwritten
      expect(dataA.appointment.doctor_id).toBe('doc-menon-cardio');
      expect(dataA.appointment.doctor.full_name).toBe('Dr. Arvind Menon');
    });

    it('DOC-03: Switching between appointments returns distinct doctor profiles from GET /api/appointments', async () => {
      // Fetch Rahul's appointments
      const getReq = createAuthedRequest('http://localhost:3000/api/appointments', {
        userId: 'user-patient-rahul',
      });
      const res = await getAppointments(getReq);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      const aptA = json.appointments.find((a: any) => a.doctor_id === 'doc-menon-cardio');
      const aptB = json.appointments.find((a: any) => a.doctor_id === 'doc-nair-pediatrics');

      expect(aptA).toBeDefined();
      expect(aptA.doctor.full_name).toBe('Dr. Arvind Menon');
      expect(aptB).toBeDefined();
      expect(aptB.doctor.full_name).toBe('Dr. Sneha Nair');
    });
  });

  // =========================================================================
  // Requirement 7 & 8: Doctor Queue Isolation and Doctor Dashboard Access
  // =========================================================================
  describe('Requirement 7 & 8: Doctor Queue Independence and Role Isolation', () => {
    it('DOC-04: Doctor session sees ONLY appointments assigned to their profile', async () => {
      // Dr. Menon (user-doc-menon) requests appointments
      const docReq = createAuthedRequest('http://localhost:3000/api/appointments', {
        userId: 'user-doc-menon',
      });
      const res = await getAppointments(docReq);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      // Must only contain appointments for doc-menon-cardio
      for (const apt of json.appointments) {
        expect(apt.doctor_id).toBe('doc-menon-cardio');
      }
      // Must not contain appointments for Dr. Nair
      const nairApts = json.appointments.filter((a: any) => a.doctor_id === 'doc-nair-pediatrics');
      expect(nairApts.length).toBe(0);
    });

    it('DOC-05: Queue positions are calculated independently per doctor queue', () => {
      const today = new Date().toISOString().split('T')[0];

      // Check-in patient into Dr. Menon's queue
      const aptMenon = db.bookAppointment({
        hospitalId: 'hosp-kochi-general-01',
        departmentId: 'dept-cardio',
        doctorId: 'doc-menon-cardio',
        patientId: 'patient-test-01',
        patientName: 'Patient One',
        patientPhone: '+91 90000 11111',
        appointmentDate: today,
        slotStartTime: '09:00',
      });
      const entryMenon = db.checkInAppointment(aptMenon.id, {
        name: 'Receptionist',
        role: 'RECEPTIONIST',
      });

      // Check-in patient into Dr. Nair's queue
      const aptNair = db.bookAppointment({
        hospitalId: 'hosp-kochi-general-01',
        departmentId: 'dept-pediatrics',
        doctorId: 'doc-nair-pediatrics',
        patientId: 'patient-test-02',
        patientName: 'Patient Two',
        patientPhone: '+91 90000 22222',
        appointmentDate: today,
        slotStartTime: '09:00',
      });
      const entryNair = db.checkInAppointment(aptNair.id, {
        name: 'Receptionist',
        role: 'RECEPTIONIST',
      });

      // Both must have distinct queues and ticket prefixes
      expect(entryMenon.doctor_id).toBe('doc-menon-cardio');
      expect(entryMenon.display_ticket).toContain('CAR');
      expect(entryNair.doctor_id).toBe('doc-nair-pediatrics');
      expect(entryNair.display_ticket).toContain('PED');

      // The entries must not contaminate each other's queues
      const menonQueue = db.getQueueEntries('hosp-kochi-general-01', 'doc-menon-cardio');
      const nairQueue = db.getQueueEntries('hosp-kochi-general-01', 'doc-nair-pediatrics');

      expect(menonQueue.some((e) => e.id === entryNair.id)).toBe(false);
      expect(nairQueue.some((e) => e.id === entryMenon.id)).toBe(false);
    });
  });

  // =========================================================================
  // Requirement 10: Graceful Handling of Missing / Deleted Doctor Profiles
  // =========================================================================
  describe('Requirement 10: Graceful Handling of Missing Profiles and Invalid Doctor IDs', () => {
    it('DOC-06: Booking with invalid doctor ID is rejected with 400 Bad Request', async () => {
      const invalidReq = createAuthedRequest('http://localhost:3000/api/appointments', {
        userId: 'user-patient-rahul',
        method: 'POST',
        body: {
          hospitalId: 'hosp-kochi-general-01',
          departmentId: 'dept-cardio',
          doctorId: 'doc-nonexistent-999',
          patientId: 'user-patient-rahul',
          patientName: 'Rahul Nair',
          patientPhone: '+91 98470 77889',
          appointmentDate: '2026-10-25',
          slotStartTime: '10:00',
        },
      });

      const res = await postAppointment(invalidReq);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('not found');
    });

    it('DOC-07: GET /api/queue returns full doctor list even when doctorId query param is supplied', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/queue?hospitalId=hosp-kochi-general-01&doctorId=doc-menon-cardio'
      );
      const res = await getQueue(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      // Doctors array must NOT be empty
      expect(json.doctors.length).toBeGreaterThan(0);
      expect(json.doctors.some((d: any) => d.id === 'doc-menon-cardio')).toBe(true);
      expect(json.doctors.some((d: any) => d.id === 'doc-nair-pediatrics')).toBe(true);
    });
  });

  // =========================================================================
  // Login Experience Tests (Task 1 Requirements)
  // =========================================================================
  describe('Task 1: Login Experience and Persona Credentials', () => {
    it('LOGIN-01: Demo personas include all four required roles with configured credentials', () => {
      expect(DEMO_PERSONAS).toHaveLength(4);

      const patient = DEMO_PERSONAS.find((p) => p.role === 'PATIENT');
      const doctor = DEMO_PERSONAS.find((p) => p.role === 'DOCTOR');
      const receptionist = DEMO_PERSONAS.find((p) => p.role === 'RECEPTIONIST');
      const admin = DEMO_PERSONAS.find((p) => p.role === 'ADMIN');

      expect(patient?.name).toBe('Rahul Nair');
      expect(patient?.email).toBe('patient@queuecare.ai');

      expect(doctor?.name).toBe('Dr. Arvind Menon');
      expect(doctor?.email).toBe('doctor@queuecare.ai');

      expect(receptionist?.name).toBe('Anjali Pillai');
      expect(receptionist?.email).toBe('receptionist@queuecare.ai');

      expect(admin?.name).toBe('Priya Varma');
      expect(admin?.email).toBe('admin@queuecare.ai');

      if (IS_DEMO_MODE) {
        expect(patient?.password).toBe('password123');
        expect(doctor?.password).toBe('password123');
        expect(receptionist?.password).toBe('password123');
        expect(admin?.password).toBe('password123');
      }
    });

    it('LOGIN-02: Each persona specifies the correct post-login target dashboard route', () => {
      const patient = DEMO_PERSONAS.find((p) => p.role === 'PATIENT');
      const doctor = DEMO_PERSONAS.find((p) => p.role === 'DOCTOR');
      const receptionist = DEMO_PERSONAS.find((p) => p.role === 'RECEPTIONIST');
      const admin = DEMO_PERSONAS.find((p) => p.role === 'ADMIN');

      expect(patient?.targetRoute).toBe('/patient/dashboard');
      expect(doctor?.targetRoute).toBe('/staff/queue');
      expect(receptionist?.targetRoute).toBe('/staff/queue');
      expect(admin?.targetRoute).toBe('/staff/analytics');
    });
  });
});
