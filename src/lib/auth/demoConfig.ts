import { UserRole } from '@/types/database';

export interface DemoPersona {
  role: UserRole;
  name: string;
  title: string;
  email: string;
  password?: string;
  badge: string;
  targetRoute: string;
  iconName: 'User' | 'Stethoscope' | 'ClipboardList' | 'ShieldCheck';
  description: string;
}

/**
 * Safe demo mode flag:
 * Enabled during local development or when explicitly enabled in non-production environments.
 * Demo credentials are NEVER hardcoded or exposed when demo mode is disabled.
 */
export const IS_DEMO_MODE =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_ENABLE_DEMO_PERSONAS === 'true';

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    role: 'PATIENT',
    name: 'Rahul Nair',
    title: 'Outpatient / Cardiology',
    email: 'patient@queuecare.ai',
    password: IS_DEMO_MODE ? 'password123' : undefined,
    badge: 'Patient Portal',
    targetRoute: '/patient/dashboard',
    iconName: 'User',
    description: 'Check wait time, view token CAR-003, book doctor visits, receive turn alerts.',
  },
  {
    role: 'DOCTOR',
    name: 'Dr. Arvind Menon',
    title: 'Consultant Cardiologist',
    email: 'doctor@queuecare.ai',
    password: IS_DEMO_MODE ? 'password123' : undefined,
    badge: 'Clinical OPD',
    targetRoute: '/staff/queue',
    iconName: 'Stethoscope',
    description: 'Call patients, start/finish consultations, trigger emergency clinical override, declare breaks.',
  },
  {
    role: 'RECEPTIONIST',
    name: 'Anjali Pillai',
    title: 'Front Desk & Triage',
    email: 'receptionist@queuecare.ai',
    password: IS_DEMO_MODE ? 'password123' : undefined,
    badge: 'Reception Console',
    targetRoute: '/staff/queue',
    iconName: 'ClipboardList',
    description: 'Register walk-in patients, QR check-ins, manage doctor delays, reinstate no-shows.',
  },
  {
    role: 'ADMIN',
    name: 'Priya Varma',
    title: 'Hospital Administrator',
    email: 'admin@queuecare.ai',
    password: IS_DEMO_MODE ? 'password123' : undefined,
    badge: 'Admin & Audits',
    targetRoute: '/staff/analytics',
    iconName: 'ShieldCheck',
    description: 'Operational KPI analytics, department queue policies, user permissions, audit trails.',
  },
];
