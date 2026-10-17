/**
 * QueueCare AI — Comprehensive End-to-End User Journey Verification
 * Tests all key routes, APIs, cookies, roles, and UI payloads against the running server.
 */

const BASE_URL = 'http://localhost:3000';
const ML_URL = 'http://127.0.0.1:8000';

interface RouteCheck {
  path: string;
  expectedStatus: number;
  expectedContent?: string;
  cookies?: string;
  headers?: Record<string, string>;
  method?: string;
  body?: any;
}

const routesToVerify: RouteCheck[] = [
  // 1. Public & Marketing Pages
  { path: '/', expectedStatus: 200, expectedContent: 'QueueCare' },
  { path: '/login', expectedStatus: 200, expectedContent: 'Sign in to QueueCare AI' },
  { path: '/register', expectedStatus: 200, expectedContent: 'Create your account' },
  { path: '/hospitals', expectedStatus: 200, expectedContent: 'Hospitals &amp; Clinics' },
  { path: '/hospitals/hosp-kochi-general-01', expectedStatus: 200, expectedContent: 'Kochi Care Polyclinic' },
  { path: '/doctors', expectedStatus: 200, expectedContent: 'Our Specialists &amp; Doctors' },
  { path: '/appointments/book', expectedStatus: 200, expectedContent: 'Book Appointment' },
  { path: '/queue/entry-menon-003', expectedStatus: 200, expectedContent: 'QueueCare' },

  // 2. Patient Authenticated Pages (with Patient session cookie)
  {
    path: '/patient/dashboard',
    expectedStatus: 200,
    expectedContent: 'Patient Portal',
    cookies: 'queuecare_demo_user=user-patient-rahul',
  },
  {
    path: '/patient/appointments',
    expectedStatus: 200,
    expectedContent: 'Appointment History',
    cookies: 'queuecare_demo_user=user-patient-rahul',
  },
  {
    path: '/patient/settings',
    expectedStatus: 200,
    expectedContent: 'Profile &amp; Preferences',
    cookies: 'queuecare_demo_user=user-patient-rahul',
  },

  // 3. Clinical & Staff Console Pages (with Doctor / Admin session cookie)
  {
    path: '/staff/dashboard',
    expectedStatus: 200,
    expectedContent: 'Staff Console',
    cookies: 'queuecare_demo_user=user-doc-menon',
  },
  {
    path: '/staff/queue',
    expectedStatus: 200,
    expectedContent: 'Live Queue Management',
    cookies: 'queuecare_demo_user=user-doc-menon',
  },
  {
    path: '/staff/appointments',
    expectedStatus: 200,
    expectedContent: 'Appointments Management',
    cookies: 'queuecare_demo_user=user-doc-menon',
  },
  {
    path: '/staff/patients',
    expectedStatus: 200,
    expectedContent: 'Walk-in Patient Desk',
    cookies: 'queuecare_demo_user=user-reception-01',
  },
  {
    path: '/staff/doctors',
    expectedStatus: 200,
    expectedContent: 'Doctor Availability',
    cookies: 'queuecare_demo_user=user-admin-01',
  },
  {
    path: '/staff/departments',
    expectedStatus: 200,
    expectedContent: 'Departments',
    cookies: 'queuecare_demo_user=user-admin-01',
  },
  {
    path: '/staff/analytics',
    expectedStatus: 200,
    expectedContent: 'Operational Analytics',
    cookies: 'queuecare_demo_user=user-admin-01',
  },
  {
    path: '/admin/audit-logs',
    expectedStatus: 200,
    expectedContent: 'Audit Logs',
    cookies: 'queuecare_demo_user=user-admin-01',
  },
  {
    path: '/admin/users',
    expectedStatus: 200,
    expectedContent: 'Staff &amp; Role Administration',
    cookies: 'queuecare_demo_user=user-admin-01',
  },

  // 4. API Endpoints
  {
    path: '/api/hospitals',
    expectedStatus: 200,
    expectedContent: 'hosp-kochi-general-01',
  },
  {
    path: '/api/doctors',
    expectedStatus: 200,
    expectedContent: 'Dr. Arvind Menon',
  },
  {
    path: '/api/queue?hospitalId=hosp-kochi-general-01',
    expectedStatus: 200,
    expectedContent: 'CAR-001',
  },
  {
    path: '/api/audit-logs',
    expectedStatus: 200,
    cookies: 'queuecare_demo_user=user-admin-01',
    headers: { 'x-queuecare-user-id': 'user-admin-01' },
  },
  {
    path: '/api/notifications?userId=user-patient-rahul',
    expectedStatus: 200,
    cookies: 'queuecare_demo_user=user-patient-rahul',
    headers: { 'x-queuecare-user-id': 'user-patient-rahul' },
  },
];

async function runE2ESmoke() {
  console.log('====================================================');
  console.log('QueueCare AI — End-to-End Route & Payload Verification');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  for (const r of routesToVerify) {
    const url = `${BASE_URL}${r.path}`;
    try {
      const headers: Record<string, string> = {
        ...(r.headers || {}),
      };
      if (r.cookies) {
        headers['Cookie'] = r.cookies;
      }

      const res = await fetch(url, {
        method: r.method || 'GET',
        headers,
      });

      const bodyText = await res.text();
      const statusMatch = res.status === r.expectedStatus;
      const contentMatch = r.expectedContent ? bodyText.includes(r.expectedContent) : true;

      if (statusMatch && contentMatch) {
        console.log(`[PASS] ${r.method || 'GET'} ${r.path} -> ${res.status}`);
        passed++;
      } else {
        console.error(`[FAIL] ${r.method || 'GET'} ${r.path} -> Expected ${r.expectedStatus}, got ${res.status}. Content match (${r.expectedContent}): ${contentMatch}`);
        failed++;
      }
    } catch (err: any) {
      console.error(`[ERR] ${r.path} -> ${err.message}`);
      failed++;
    }
  }

  // Verify ML Service
  try {
    const mlRes = await fetch(`${ML_URL}/health`);
    const mlData = await mlRes.json();
    if (mlData.status === 'healthy') {
      console.log(`[PASS] ML Service GET ${ML_URL}/health -> 200 (healthy)`);
      passed++;
    } else {
      console.error(`[FAIL] ML Service unhealthy:`, mlData);
      failed++;
    }
  } catch (err: any) {
    console.error(`[ERR] ML Service -> ${err.message}`);
    failed++;
  }

  console.log('====================================================');
  console.log(`E2E Verification Complete: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ESmoke();
