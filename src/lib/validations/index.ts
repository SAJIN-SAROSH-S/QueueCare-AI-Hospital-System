import { z } from 'zod';

export const BookAppointmentSchema = z.object({
  hospitalId: z.string().min(1, 'Hospital ID is required'),
  departmentId: z.string().min(1, 'Department ID is required'),
  doctorId: z.string().min(1, 'Doctor ID is required'),
  patientId: z.string().min(1, 'Patient ID is required'),
  patientName: z.string().min(2, 'Patient name must be at least 2 characters'),
  patientPhone: z.string().min(10, 'Valid phone number is required'),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'),
  slotStartTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time format must be HH:MM'),
  notes: z.string().max(500).optional(),
});

export const RegisterWalkInSchema = z.object({
  hospitalId: z.string().min(1, 'Hospital ID is required'),
  doctorId: z.string().min(1, 'Doctor ID is required'),
  patientName: z.string().min(2, 'Patient name must be at least 2 characters'),
  patientPhone: z.string().min(10, 'Valid phone number is required'),
  notes: z.string().max(500).optional(),
});

export const UpdateQueueStatusSchema = z.object({
  targetStatus: z.enum([
    'BOOKED',
    'CHECKED_IN',
    'WAITING',
    'IN_CONSULTATION',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW',
  ]),
  actorName: z.string().default('Staff Member'),
  actorRole: z.enum(['RECEPTIONIST', 'DOCTOR', 'ADMIN', 'PATIENT']),
  actorId: z.string().optional(),
});

export const TriageOverrideSchema = z.object({
  priority: z.enum(['NORMAL', 'URGENT', 'EMERGENCY_OVERRIDE']),
  reason: z.string().min(3, 'Triage justification is required for clinical audit'),
  actorName: z.string().default('Clinical Staff'),
  actorRole: z.enum(['RECEPTIONIST', 'DOCTOR', 'ADMIN']),
});

export const UpdateDoctorAvailabilitySchema = z.object({
  doctorId: z.string().min(1),
  isAvailable: z.boolean(),
  reason: z.string().optional(),
  breakStart: z.string().optional(),
  breakEnd: z.string().optional(),
});
