-- ====================================================================
-- QueueCare AI: Intelligent Hospital Queue Management System Schema
-- ====================================================================

-- 1. Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enums for type safety
DO $$ BEGIN
  CREATE TYPE user_role_enum AS ENUM ('PATIENT', 'RECEPTIONIST', 'DOCTOR', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE appointment_status_enum AS ENUM (
    'SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE queue_entry_status_enum AS ENUM (
    'BOOKED', 'CHECKED_IN', 'WAITING', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED', 'NO_SHOW'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE priority_type_enum AS ENUM ('NORMAL', 'URGENT', 'EMERGENCY_OVERRIDE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. User Profiles (Extends auth.users or standalone profile table)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE, -- References auth.users(id) in Supabase Auth
  role user_role_enum NOT NULL DEFAULT 'PATIENT',
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  preferred_language VARCHAR(10) DEFAULT 'en', -- en, ml (Malayalam)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Hospitals (Multi-clinic capable, starts with Kerala clinic)
CREATE TABLE IF NOT EXISTS hospitals (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  district VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL DEFAULT 'Kerala',
  country VARCHAR(50) NOT NULL DEFAULT 'India',
  address TEXT NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
  operating_hours JSONB NOT NULL DEFAULT '{"monday": {"open": "08:30", "close": "17:30"}, "tuesday": {"open": "08:30", "close": "17:30"}, "wednesday": {"open": "08:30", "close": "17:30"}, "thursday": {"open": "08:30", "close": "17:30"}, "friday": {"open": "08:30", "close": "17:30"}, "saturday": {"open": "08:30", "close": "14:00"}}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Departments
CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(100) PRIMARY KEY,
  hospital_id VARCHAR(100) NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(20) NOT NULL,
  description TEXT,
  default_consultation_duration INT NOT NULL DEFAULT 15, -- minutes
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(hospital_id, code)
);

-- 6. Doctor Profiles
CREATE TABLE IF NOT EXISTS doctor_profiles (
  id VARCHAR(100) PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  hospital_id VARCHAR(100) NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  department_id VARCHAR(100) NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  qualification VARCHAR(255) NOT NULL,
  specialization VARCHAR(255) NOT NULL,
  room_number VARCHAR(50) NOT NULL,
  avg_consultation_minutes INT NOT NULL DEFAULT 15,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Hospital Staff Memberships
CREATE TABLE IF NOT EXISTS hospital_staff_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  hospital_id VARCHAR(100) NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  role user_role_enum NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, hospital_id)
);

-- 8. Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR(100) PRIMARY KEY,
  hospital_id VARCHAR(100) NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  department_id VARCHAR(100) NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  doctor_id VARCHAR(100) NOT NULL REFERENCES doctor_profiles(id) ON DELETE RESTRICT,
  patient_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
  patient_name VARCHAR(255) NOT NULL,
  patient_phone VARCHAR(50) NOT NULL,
  appointment_date DATE NOT NULL,
  slot_start_time TIME NOT NULL,
  slot_end_time TIME NOT NULL,
  status appointment_status_enum NOT NULL DEFAULT 'SCHEDULED',
  is_walk_in BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Daily Queues (One queue per doctor per date)
CREATE TABLE IF NOT EXISTS queues (
  id VARCHAR(100) PRIMARY KEY,
  hospital_id VARCHAR(100) NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  doctor_id VARCHAR(100) NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  queue_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  current_token_number INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(doctor_id, queue_date)
);

-- 10. Queue Entries
CREATE TABLE IF NOT EXISTS queue_entries (
  id VARCHAR(100) PRIMARY KEY,
  queue_id VARCHAR(100) NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
  hospital_id VARCHAR(100) NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  doctor_id VARCHAR(100) NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  appointment_id VARCHAR(100) REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  token_number INT NOT NULL,
  display_ticket VARCHAR(50) NOT NULL, -- e.g. "CARDIO-007"
  patient_name VARCHAR(255) NOT NULL,
  patient_phone VARCHAR(50) NOT NULL,
  priority priority_type_enum NOT NULL DEFAULT 'NORMAL',
  priority_reason TEXT,
  status queue_entry_status_enum NOT NULL DEFAULT 'WAITING',
  position_in_queue INT NOT NULL,
  estimated_wait_minutes INT NOT NULL DEFAULT 0,
  wait_time_lower_bound INT NOT NULL DEFAULT 0,
  wait_time_upper_bound INT NOT NULL DEFAULT 0,
  estimated_start_time TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  consultation_started_at TIMESTAMPTZ,
  consultation_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Consultations (Record actual consultation history for AI training)
CREATE TABLE IF NOT EXISTS consultations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  queue_entry_id VARCHAR(100) NOT NULL REFERENCES queue_entries(id) ON DELETE CASCADE,
  doctor_id VARCHAR(100) NOT NULL REFERENCES doctor_profiles(id) ON DELETE RESTRICT,
  hospital_id VARCHAR(100) NOT NULL REFERENCES hospitals(id) ON DELETE RESTRICT,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  duration_minutes NUMERIC(5, 2) NOT NULL,
  delay_minutes INT NOT NULL DEFAULT 0,
  is_urgent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Doctor Availability & Breaks
CREATE TABLE IF NOT EXISTS doctor_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id VARCHAR(100) NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  schedule_date DATE NOT NULL,
  is_present BOOLEAN NOT NULL DEFAULT TRUE,
  break_start_time TIME,
  break_end_time TIME,
  unavailability_reason VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- QUEUE_TURN_APPROACHING, DELAY_ALERT, CANCELLED, etc.
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  channel VARCHAR(50) NOT NULL DEFAULT 'IN_APP', -- IN_APP, SMS, WHATSAPP, EMAIL
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  sms_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  turn_alert_threshold_patients INT NOT NULL DEFAULT 2, -- Alert when <= 2 patients ahead
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Prediction Records (Tracks accuracy of algorithmic vs ML predictions)
CREATE TABLE IF NOT EXISTS prediction_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  queue_entry_id VARCHAR(100) NOT NULL REFERENCES queue_entries(id) ON DELETE CASCADE,
  doctor_id VARCHAR(100) NOT NULL,
  predicted_wait_minutes INT NOT NULL,
  actual_wait_minutes INT,
  prediction_source VARCHAR(50) NOT NULL, -- 'ALGORITHMIC_BASELINE' | 'ML_MODEL_V1'
  confidence_score NUMERIC(3, 2) NOT NULL,
  features_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id VARCHAR(100) NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  actor_name VARCHAR(255) NOT NULL,
  actor_role VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_entity VARCHAR(100) NOT NULL,
  target_id VARCHAR(100) NOT NULL,
  details JSONB,
  ip_address VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_date_doctor ON appointments(hospital_id, doctor_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_queue_entries_queue_status ON queue_entries(queue_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_entries_position ON queue_entries(queue_id, position_in_queue);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor ON consultations(doctor_id, started_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_hospital ON audit_logs(hospital_id, created_at DESC);

-- Row Level Security (RLS) Setup
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Patients can read their own profile
CREATE POLICY patient_read_own_profile ON user_profiles
  FOR SELECT USING (auth.uid() = auth_user_id);

-- Patients can view their own appointments
CREATE POLICY patient_read_own_appointments ON appointments
  FOR SELECT USING (
    patient_id IN (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
  );

-- Staff members can manage appointments in their hospital
CREATE POLICY staff_manage_appointments ON appointments
  FOR ALL USING (
    hospital_id IN (
      SELECT hospital_id FROM hospital_staff_memberships
      WHERE user_id IN (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
      AND role IN ('RECEPTIONIST', 'DOCTOR', 'ADMIN')
    )
  );

-- Queue entries public status read (for tracking boards / tokens) & patient self read
CREATE POLICY queue_entry_read_policy ON queue_entries
  FOR SELECT USING (true);

-- Staff can modify queue entries for their hospital
CREATE POLICY staff_modify_queue_entries ON queue_entries
  FOR ALL USING (
    hospital_id IN (
      SELECT hospital_id FROM hospital_staff_memberships
      WHERE user_id IN (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
      AND role IN ('RECEPTIONIST', 'DOCTOR', 'ADMIN')
    )
  );

-- Users can only read their own notifications
CREATE POLICY user_read_own_notifications ON notifications
  FOR SELECT USING (
    user_id IN (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
  );

-- Only hospital administrators can read audit logs
CREATE POLICY admin_read_audit_logs ON audit_logs
  FOR SELECT USING (
    hospital_id IN (
      SELECT hospital_id FROM hospital_staff_memberships
      WHERE user_id IN (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
      AND role = 'ADMIN'
    )
  );

-- Patients can update their own personal details, but CANNOT alter their assigned role
CREATE POLICY patient_update_own_profile ON user_profiles
  FOR UPDATE USING (auth.uid() = auth_user_id)
  WITH CHECK (
    auth.uid() = auth_user_id
    -- Disallow changing the role column
    AND role = (SELECT role FROM user_profiles WHERE auth_user_id = auth.uid())
  );

