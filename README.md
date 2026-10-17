# QueueCare AI — Intelligent Hospital Queue Management System

> **A modern, responsive, full-stack hospital outpatient department (OPD) queue intelligence platform designed for healthcare facilities in Kerala, India, and extensible to multi-clinic networks.**

---

## 1. Overview & Value Proposition

Hospital outpatient waiting rooms are often overcrowded, stressful, and unpredictable. Patients struggle without knowing:
- How many patients are ahead of them.
- How long they will probably wait.
- Whether their doctor is on duty, in consultation, or on a break.
- When they should physically arrive at the hospital.

Hospital receptionists and clinical teams simultaneously struggle to balance booked appointment slots with unscheduled walk-in patients.

**QueueCare AI** solves this through an intelligent queue management engine:
- **Dual Prediction Architecture**: A robust deterministic algorithmic waiting-time estimator combined with a scikit-learn regression microservice (`prediction-service`).
- **Dynamic Uncertainty Bounds**: Displays estimates as realistic ranges (e.g., `18–26 minutes`) with confidence indicators instead of false precision.
- **Clinical Triage Overrides**: Authorized medical staff can bypass ordinary FIFO order for acute medical emergencies with full audit trail logging.
- **Multi-Role Portals**: Dedicated, role-enforced interfaces for Patients, Receptionists, Doctors, and Hospital Administrators.
- **DPDP Act (India) Compliance Ready**: Strict data minimization, omitting sensitive medical diagnoses from public displays and isolating tenant databases.

---

## 2. Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript (strict mode), Tailwind CSS, Lucide icons, Recharts.
- **Backend**: Next.js App Router API Route Handlers, Supabase PostgreSQL, Row Level Security (RLS) policies, Zod server-side validation.
- **AI & Prediction**: Python FastAPI microservice with scikit-learn (`GradientBoostingRegressor` / `Ridge`), chronological train/test splitting to prevent temporal data leakage, and automated fallback to the baseline deterministic queue estimator.
- **Testing**: Vitest unit and integration test suite covering 15 core business rules and edge cases.
- **Timezone**: `Asia/Kolkata` configured for Kerala clinic operations.

---

## 3. User Roles & Personas

QueueCare AI includes four active test personas accessible via the one-click role switcher in the navigation bar:

| Role | Persona Name | Key Responsibilities & Capabilities |
| :--- | :--- | :--- |
| **Patient** | *Rahul Nair* | Book OPD slots, track live ticket (`CAR-003`), receive approaching turn alerts, cancel appointments, view history. |
| **Receptionist** | *Anjali Pillai* | Register walk-in arrivals, issue physical queue tokens, check in pre-booked appointments, manage no-show grace periods. |
| **Doctor** | *Dr. Arvind Menon* | View assigned queue, call next patient, start & complete consultations, declare breaks and unavailability. |
| **Admin** | *Priya Varma* | Clinic hours configuration, staff accounts & RBAC permissions, operational analytics, clinical audit logs. |

---

## 4. Project File Structure

```
Hospital/
├── prediction-service/               # Python AI Wait-Time Prediction Microservice
│   ├── main.py                       # FastAPI application & /predict endpoint
│   ├── train.py                      # Chronological ML training script
│   ├── model_meta.json               # Trained model metrics (MAE, RMSE, version)
│   ├── queue_model.joblib            # Serialized scikit-learn model artifact
│   └── requirements.txt              # FastAPI, uvicorn, scikit-learn, pandas
├── src/
│   ├── app/                          # Next.js App Router (29 pages & API routes)
│   │   ├── page.tsx                  # Public Landing Page with FAQ & Live Preview
│   │   ├── register/page.tsx         # Patient & Staff Registration
│   │   ├── login/page.tsx            # Sign In with One-Click Test Personas
│   │   ├── hospitals/                # Clinic directory & detail pages
│   │   ├── doctors/                  # OPD Specialists & consultation schedule
│   │   ├── appointments/             # Booking & QR confirmation screens
│   │   ├── queue/[id]/page.tsx       # Live Real-Time Queue Tracker
│   │   ├── patient/                  # Patient Portal (Dashboard, History, Settings)
│   │   ├── staff/                    # Clinical Staff Console (Dashboard, Queue, Walk-ins, Doctors, Analytics, Settings)
│   │   ├── admin/                    # Admin Console (Users & Audit Logs)
│   │   └── api/                      # REST API endpoints (Zod validated)
│   ├── components/                   # Reusable UI components (Navbar, Footer, EmergencyBanner, StaffNav)
│   ├── context/                      # Client-side AuthContext & Role Switcher
│   ├── lib/
│   │   ├── auth/                     # Server-side RBAC & Record-level privacy
│   │   ├── notifications/            # In-app, SMS, WhatsApp & Email notification service
│   │   ├── prediction/               # Algorithmic waiting-time estimator & failover
│   │   ├── queue/                    # Queue State Machine & priority reordering
│   │   ├── store/                    # In-memory mock database with Kerala seed data
│   │   ├── supabase/                 # Supabase Browser & Server SSR clients
│   │   └── validations/              # Zod input schemas
│   └── types/                        # TypeScript domain definitions
├── supabase/
│   └── migrations/
│       └── 20241015000000_init_queuecare.sql # PostgreSQL schema, RLS, indexes & constraints
├── tests/
│   └── queuecare.test.ts             # 15 Vitest automated business logic tests
├── .env.example                      # Documented environment configuration
├── next.config.js                    # Next.js configuration
├── tailwind.config.ts                # Healthcare styling theme
└── vitest.config.ts                  # Testing configuration
```

---

## 5. Local Setup & Execution Commands

### Prerequisites
- Node.js 18+ (tested on Node v24.19)
- Python 3.10+ (tested on Python 3.14)

### 1. Install Node Dependencies
```bash
npm install
```

### 2. Configure Python Prediction Microservice (Optional but Recommended)
```bash
# Create and activate Python virtual environment
py -m venv prediction-service/venv

# Install ML requirements
.\prediction-service\venv\Scripts\pip install -r prediction-service\requirements.txt

# Train the development regression model
.\prediction-service\venv\Scripts\python.exe .\prediction-service\train.py

# Start the FastAPI prediction daemon on port 8000
.\prediction-service\venv\Scripts\python.exe -m uvicorn main:app --app-dir prediction-service --host 127.0.0.1 --port 8000
```

### 3. Run Automated Tests
```bash
npx vitest run
```
*Executes all 15 test suites verifying queue transitions, priority reordering, wait estimation, and data isolation.*

### 4. Build and Start the Full-Stack Application
```bash
# Production Build
npm run build

# Start Production Server
npm run start
```
The application will be live at `http://localhost:3000`.

---

## 6. Supabase Database Configuration

For production deployment with a live Supabase instance:

1. Create a new project in [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in the Supabase Dashboard.
3. Open `supabase/migrations/20241015000000_init_queuecare.sql` and run the script. It provisions:
   - Tables: `hospitals`, `departments`, `doctor_profiles`, `user_profiles`, `appointments`, `queues`, `queue_entries`, `consultations`, `doctor_availability`, `notifications`, `prediction_records`, `audit_logs`.
   - Custom PostgreSQL ENUM types: `user_role_enum`, `queue_entry_status_enum`, `priority_type_enum`.
   - Row Level Security (RLS) policies isolating patient records and staff hospital permissions.
4. Copy your project credentials into `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
   ```
*(In local development mode without Supabase credentials, the application automatically uses the built-in repository store with Kerala clinic seed records).*

---

## 7. AI Wait-Time Prediction Engine Details

The prediction engine adheres to strict safety and data-integrity guidelines:

1. **Deterministic Algorithmic Baseline**:
   $$\text{Wait} = \max(0, \text{AvgDuration} - \text{ElapsedCurrent}) + (\text{PatientsAhead} - 1) \times \text{AvgDuration} + \text{Delay} + \text{Breaks}$$
2. **Machine-Learning Regressor**:
   - Model: Scikit-learn `GradientBoostingRegressor` (100 estimators, max depth 4).
   - Features: `patients_ahead`, `elapsed_consultation_minutes`, `avg_doctor_duration`, `hour_of_day`, `day_of_week`, `recent_clinic_delay_minutes`.
   - Evaluation: Chronological 80/20 train/test split preventing temporal leakage, achieving a test MAE of **2.98 minutes**.
3. **Graceful Fallback**:
   - If the Python microservice is offline or times out (>1200ms), the Next.js API automatically falls back to the deterministic algorithmic calculation without interrupting the patient or doctor.
4. **Data Integrity Guarantee**:
   - Synthetic development records are explicitly labeled in metadata (`is_synthetic_dev_data: true`) so fabricated records are never represented as real clinical results.

---

## 8. Security & Privacy (DPDP Act India)

- **Zero Diagnostic Leaks**: Queue display boards and live tokens expose only token identifiers (`CAR-003`) and doctor room numbers—never patient diagnoses, medical history, or caste/religion.
- **Server-Side Authorization**: Roles are validated in API route handlers (`enforceRole`), preventing client-side bypasses.
- **Emergency Safety Disclaimers**: Prominently displayed banners instruct patients that wait times are informational and advise dialing 108/112 or proceeding to the ER during acute symptoms.

---

## 9. Verification Summary

- **Vitest Unit & Integration Tests**: 15 / 15 Passed (100%).
- **TypeScript Type Checking (`tsc --noEmit`)**: 0 errors.
- **Next.js Production Build**: 29 / 29 pages compiled and statically optimized.
- **FastAPI Prediction Microservice**: Healthy on `http://127.0.0.1:8000/health`, predicting wait times with sub-5ms latency.
