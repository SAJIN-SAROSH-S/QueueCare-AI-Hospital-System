export type UserRole = 'PATIENT' | 'RECEPTIONIST' | 'DOCTOR' | 'ADMIN';

export type QueueEntryStatus = 
  | 'BOOKED'
  | 'CHECKED_IN'
  | 'WAITING'
  | 'IN_CONSULTATION'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type PriorityLevel = 'NORMAL' | 'URGENT' | 'EMERGENCY_OVERRIDE';

export interface UserProfile {
  id: string;
  auth_user_id?: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string;
  preferred_language: 'en' | 'ml';
  created_at: string;
}

export interface Hospital {
  id: string;
  name: string;
  district: string;
  state: string;
  country: string;
  address: string;
  phone: string;
  email: string;
  timezone: string;
  operating_hours: {
    [day: string]: { open: string; close: string };
  };
  is_active: boolean;
}

export interface Department {
  id: string;
  hospital_id: string;
  name: string;
  code: string;
  description: string;
  default_consultation_duration: number; // in minutes
  is_active: boolean;
}

export interface DoctorProfile {
  id: string;
  user_id?: string;
  hospital_id: string;
  department_id: string;
  full_name: string;
  qualification: string;
  specialization: string;
  room_number: string;
  avg_consultation_minutes: number;
  is_available: boolean;
  avatar_url?: string;
}

export interface Appointment {
  id: string;
  hospital_id: string;
  department_id: string;
  doctor_id: string;
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  appointment_date: string; // YYYY-MM-DD
  slot_start_time: string; // HH:mm
  slot_end_time: string; // HH:mm
  status: AppointmentStatus;
  is_walk_in: boolean;
  notes?: string;
  created_at: string;
  doctor?: DoctorProfile;
  department?: Department;
}

export interface Queue {
  id: string;
  hospital_id: string;
  doctor_id: string;
  queue_date: string;
  is_active: boolean;
  current_token_number: number;
  created_at: string;
}

export interface QueueEntry {
  id: string;
  queue_id: string;
  hospital_id: string;
  doctor_id: string;
  appointment_id?: string;
  patient_id?: string;
  token_number: number;
  display_ticket: string; // e.g. "CARDIO-001"
  patient_name: string;
  patient_phone: string;
  priority: PriorityLevel;
  priority_reason?: string;
  status: QueueEntryStatus;
  position_in_queue: number; // 1-based, 0 if completed or in consultation
  estimated_wait_minutes: number;
  wait_time_lower_bound: number;
  wait_time_upper_bound: number;
  estimated_start_time?: string;
  checked_in_at?: string;
  consultation_started_at?: string;
  consultation_completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Consultation {
  id: string;
  queue_entry_id: string;
  doctor_id: string;
  hospital_id: string;
  started_at: string;
  ended_at: string;
  duration_minutes: number;
  delay_minutes: number;
  is_urgent: boolean;
  created_at: string;
}

export interface DoctorAvailability {
  id: string;
  doctor_id: string;
  schedule_date: string;
  is_present: boolean;
  break_start_time?: string;
  break_end_time?: string;
  unavailability_reason?: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'QUEUE_TURN_APPROACHING' | 'DELAY_ALERT' | 'STATUS_CHANGE' | 'APPOINTMENT_CONFIRMED' | 'EMERGENCY_NOTICE';
  is_read: boolean;
  channel: 'IN_APP' | 'SMS' | 'WHATSAPP' | 'EMAIL';
  created_at: string;
}

export interface AuditLog {
  id: string;
  hospital_id: string;
  actor_id?: string;
  actor_name: string;
  actor_role: string;
  action: string;
  target_entity: string;
  target_id: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export interface PredictionResult {
  expected_wait_minutes: number;
  lower_bound_minutes: number;
  upper_bound_minutes: number;
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW';
  prediction_source: 'ML_MODEL_V1' | 'ALGORITHMIC_BASELINE';
  model_version: string;
  explanation: string;
  is_synthetic_dev_model: boolean;
  timestamp: string;
}
