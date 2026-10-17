import {
  Hospital,
  Department,
  DoctorProfile,
  UserProfile,
  Appointment,
  Queue,
  QueueEntry,
  AuditLog,
  NotificationItem,
  DoctorAvailability,
  QueueEntryStatus,
  PriorityLevel,
} from '@/types/database';
import { validateStateTransition, recalculateQueuePositions } from '../queue/stateMachine';
import { calculateAlgorithmicWaitTime } from '../prediction/estimator';

export class MockDatabase {
  private hospitals: Hospital[] = [];
  private departments: Department[] = [];
  private doctors: DoctorProfile[] = [];
  private users: UserProfile[] = [];
  private appointments: Appointment[] = [];
  private queues: Queue[] = [];
  private queueEntries: QueueEntry[] = [];
  private doctorAvailability: DoctorAvailability[] = [];
  private notifications: NotificationItem[] = [];
  private auditLogs: AuditLog[] = [];

  constructor() {
    this.seedInitialData();
  }

  public seedInitialData() {
    // 1. Hospital in Kochi, Kerala
    this.hospitals = [
      {
        id: 'hosp-kochi-general-01',
        name: 'Kochi Care Polyclinic & Specialty Centre',
        district: 'Ernakulam',
        state: 'Kerala',
        country: 'India',
        address: 'MG Road, Ravipuram, Kochi, Kerala 682016',
        phone: '+91 484 235 6789',
        email: 'info@kochiclinic.queuecare.ai',
        timezone: 'Asia/Kolkata',
        operating_hours: {
          monday: { open: '08:30', close: '18:00' },
          tuesday: { open: '08:30', close: '18:00' },
          wednesday: { open: '08:30', close: '18:00' },
          thursday: { open: '08:30', close: '18:00' },
          friday: { open: '08:30', close: '18:00' },
          saturday: { open: '08:30', close: '14:00' },
        },
        is_active: true,
      },
    ];

    // 2. Departments
    this.departments = [
      {
        id: 'dept-cardio',
        hospital_id: 'hosp-kochi-general-01',
        name: 'Cardiology',
        code: 'CAR',
        description: 'Adult cardiac care, ECG review, Hypertension clinic',
        default_consultation_duration: 18,
        is_active: true,
      },
      {
        id: 'dept-pediatrics',
        hospital_id: 'hosp-kochi-general-01',
        name: 'Pediatrics',
        code: 'PED',
        description: 'Newborn, child health & vaccination clinic',
        default_consultation_duration: 12,
        is_active: true,
      },
      {
        id: 'dept-ortho',
        hospital_id: 'hosp-kochi-general-01',
        name: 'Orthopedics',
        code: 'ORT',
        description: 'Joint pain, trauma & musculoskeletal consultations',
        default_consultation_duration: 15,
        is_active: true,
      },
      {
        id: 'dept-genmed',
        hospital_id: 'hosp-kochi-general-01',
        name: 'General Medicine',
        code: 'GEN',
        description: 'Primary care, fever clinic & chronic condition management',
        default_consultation_duration: 14,
        is_active: true,
      },
    ];

    // 3. User Profiles (Demonstration accounts)
    this.users = [
      {
        id: 'user-admin-01',
        role: 'ADMIN',
        full_name: 'Priya Varma',
        email: 'admin@queuecare.ai',
        phone: '+91 98470 11223',
        preferred_language: 'en',
        created_at: new Date().toISOString(),
      },
      {
        id: 'user-reception-01',
        role: 'RECEPTIONIST',
        full_name: 'Anjali Pillai',
        email: 'receptionist@queuecare.ai',
        phone: '+91 98470 33445',
        preferred_language: 'en',
        created_at: new Date().toISOString(),
      },
      {
        id: 'user-doc-menon',
        role: 'DOCTOR',
        full_name: 'Dr. Arvind Menon',
        email: 'doctor@queuecare.ai',
        phone: '+91 98470 55667',
        preferred_language: 'en',
        created_at: new Date().toISOString(),
      },
      {
        id: 'user-patient-rahul',
        role: 'PATIENT',
        full_name: 'Rahul Nair',
        email: 'patient@queuecare.ai',
        phone: '+91 98470 77889',
        preferred_language: 'en',
        created_at: new Date().toISOString(),
      },
    ];

    // 4. Doctors
    this.doctors = [
      {
        id: 'doc-menon-cardio',
        user_id: 'user-doc-menon',
        hospital_id: 'hosp-kochi-general-01',
        department_id: 'dept-cardio',
        full_name: 'Dr. Arvind Menon',
        qualification: 'MBBS, MD (General Medicine), DM (Cardiology)',
        specialization: 'Consultant Cardiologist & Heart Failure Specialist',
        room_number: 'Room 102 (First Floor)',
        avg_consultation_minutes: 18,
        is_available: true,
      },
      {
        id: 'doc-nair-pediatrics',
        hospital_id: 'hosp-kochi-general-01',
        department_id: 'dept-pediatrics',
        full_name: 'Dr. Sneha Nair',
        qualification: 'MBBS, DCH, DNB (Pediatrics)',
        specialization: 'Pediatrician & Child Development Specialist',
        room_number: 'Room 104 (First Floor)',
        avg_consultation_minutes: 12,
        is_available: true,
      },
      {
        id: 'doc-kurian-ortho',
        hospital_id: 'hosp-kochi-general-01',
        department_id: 'dept-ortho',
        full_name: 'Dr. Mathews Kurian',
        qualification: 'MBBS, MS (Orthopedics), Fellowship in Joint Replacement',
        specialization: 'Senior Orthopedic Surgeon',
        room_number: 'Room 108 (Ground Floor)',
        avg_consultation_minutes: 15,
        is_available: true,
      },
      {
        id: 'doc-thomas-genmed',
        hospital_id: 'hosp-kochi-general-01',
        department_id: 'dept-genmed',
        full_name: 'Dr. Lakshmi Thomas',
        qualification: 'MBBS, MD (Internal Medicine)',
        specialization: 'Internal Medicine Consultant',
        room_number: 'Room 101 (Ground Floor)',
        avg_consultation_minutes: 14,
        is_available: true,
      },
    ];

    // Today's date YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    // 5. Queues
    this.queues = [
      {
        id: `queue-menon-${today}`,
        hospital_id: 'hosp-kochi-general-01',
        doctor_id: 'doc-menon-cardio',
        queue_date: today,
        is_active: true,
        current_token_number: 6,
        created_at: new Date().toISOString(),
      },
      {
        id: `queue-nair-${today}`,
        hospital_id: 'hosp-kochi-general-01',
        doctor_id: 'doc-nair-pediatrics',
        queue_date: today,
        is_active: true,
        current_token_number: 3,
        created_at: new Date().toISOString(),
      },
    ];

    // 6. Queue Entries for Dr. Menon
    this.queueEntries = [
      {
        id: 'entry-menon-001',
        queue_id: `queue-menon-${today}`,
        hospital_id: 'hosp-kochi-general-01',
        doctor_id: 'doc-menon-cardio',
        token_number: 1,
        display_ticket: 'CAR-001',
        patient_name: 'Gopinathan K.',
        patient_phone: '+91 94471 20001',
        priority: 'NORMAL',
        status: 'COMPLETED',
        position_in_queue: 0,
        estimated_wait_minutes: 0,
        wait_time_lower_bound: 0,
        wait_time_upper_bound: 0,
        checked_in_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        consultation_started_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
        consultation_completed_at: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
      },
      {
        id: 'entry-menon-002',
        queue_id: `queue-menon-${today}`,
        hospital_id: 'hosp-kochi-general-01',
        doctor_id: 'doc-menon-cardio',
        token_number: 2,
        display_ticket: 'CAR-002',
        patient_name: 'Fathima Beevi',
        patient_phone: '+91 94471 20002',
        priority: 'NORMAL',
        status: 'IN_CONSULTATION',
        position_in_queue: 0,
        estimated_wait_minutes: 0,
        wait_time_lower_bound: 0,
        wait_time_upper_bound: 0,
        checked_in_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
        consultation_started_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      },
      {
        id: 'entry-menon-003',
        queue_id: `queue-menon-${today}`,
        hospital_id: 'hosp-kochi-general-01',
        doctor_id: 'doc-menon-cardio',
        patient_id: 'user-patient-rahul',
        token_number: 3,
        display_ticket: 'CAR-003',
        patient_name: 'Rahul Nair',
        patient_phone: '+91 98470 77889',
        priority: 'NORMAL',
        status: 'WAITING',
        position_in_queue: 1,
        estimated_wait_minutes: 10,
        wait_time_lower_bound: 7,
        wait_time_upper_bound: 15,
        checked_in_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'entry-menon-004',
        queue_id: `queue-menon-${today}`,
        hospital_id: 'hosp-kochi-general-01',
        doctor_id: 'doc-menon-cardio',
        token_number: 4,
        display_ticket: 'CAR-004',
        patient_name: 'Kavitha Joseph',
        patient_phone: '+91 94471 20004',
        priority: 'NORMAL',
        status: 'WAITING',
        position_in_queue: 2,
        estimated_wait_minutes: 28,
        wait_time_lower_bound: 21,
        wait_time_upper_bound: 36,
        checked_in_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'entry-menon-005',
        queue_id: `queue-menon-${today}`,
        hospital_id: 'hosp-kochi-general-01',
        doctor_id: 'doc-menon-cardio',
        token_number: 5,
        display_ticket: 'CAR-005',
        patient_name: 'Subramanian V.',
        patient_phone: '+91 94471 20005',
        priority: 'NORMAL',
        status: 'WAITING',
        position_in_queue: 3,
        estimated_wait_minutes: 46,
        wait_time_lower_bound: 35,
        wait_time_upper_bound: 58,
        checked_in_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // 7. Initial Appointments
    this.appointments = [
      {
        id: 'apt-001',
        hospital_id: 'hosp-kochi-general-01',
        department_id: 'dept-cardio',
        doctor_id: 'doc-menon-cardio',
        patient_id: 'user-patient-rahul',
        patient_name: 'Rahul Nair',
        patient_phone: '+91 98470 77889',
        appointment_date: today,
        slot_start_time: '10:00',
        slot_end_time: '10:20',
        status: 'CHECKED_IN',
        is_walk_in: false,
        notes: 'Follow-up on ECG and BP medication',
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'apt-002',
        hospital_id: 'hosp-kochi-general-01',
        department_id: 'dept-cardio',
        doctor_id: 'doc-menon-cardio',
        patient_id: 'user-guest-02',
        patient_name: 'Kavitha Joseph',
        patient_phone: '+91 94471 20004',
        appointment_date: today,
        slot_start_time: '10:30',
        slot_end_time: '10:50',
        status: 'CHECKED_IN',
        is_walk_in: false,
        notes: 'Mild chest discomfort evaluation',
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'apt-003',
        hospital_id: 'hosp-kochi-general-01',
        department_id: 'dept-pediatrics',
        doctor_id: 'doc-nair-pediatrics',
        patient_id: 'user-guest-03',
        patient_name: 'Baby Diya (Parent: Anoop)',
        patient_phone: '+91 94471 20009',
        appointment_date: today,
        slot_start_time: '11:00',
        slot_end_time: '11:15',
        status: 'SCHEDULED',
        is_walk_in: false,
        notes: '9-month MMR vaccination',
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    // 8. Notifications
    this.notifications = [
      {
        id: 'notif-001',
        user_id: 'user-patient-rahul',
        title: 'Check-in Confirmed',
        message: 'Your token CAR-003 is active. You have 1 patient ahead of you.',
        type: 'QUEUE_TURN_APPROACHING',
        is_read: false,
        channel: 'IN_APP',
        created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      },
    ];

    // 9. Initial Audit Logs
    this.auditLogs = [
      {
        id: 'audit-001',
        hospital_id: 'hosp-kochi-general-01',
        actor_name: 'Anjali Pillai',
        actor_role: 'RECEPTIONIST',
        action: 'CHECK_IN_PATIENT',
        target_entity: 'queue_entries',
        target_id: 'entry-menon-003',
        details: { token: 'CAR-003', patient: 'Rahul Nair' },
        created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      },
      {
        id: 'audit-002',
        hospital_id: 'hosp-kochi-general-01',
        actor_name: 'Dr. Arvind Menon',
        actor_role: 'DOCTOR',
        action: 'START_CONSULTATION',
        target_entity: 'queue_entries',
        target_id: 'entry-menon-002',
        details: { token: 'CAR-002', patient: 'Fathima Beevi' },
        created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      },
    ];
  }

  // Hospitals & Departments & Doctors
  public getHospitals(): Hospital[] {
    return [...this.hospitals];
  }

  public getHospitalById(id: string): Hospital | undefined {
    return this.hospitals.find((h) => h.id === id);
  }

  public getDepartments(hospitalId?: string): Department[] {
    if (hospitalId) return this.departments.filter((d) => d.hospital_id === hospitalId);
    return [...this.departments];
  }

  public getDoctors(hospitalId?: string, departmentId?: string): DoctorProfile[] {
    return this.doctors.filter((doc) => {
      if (hospitalId && doc.hospital_id !== hospitalId) return false;
      if (departmentId && doc.department_id !== departmentId) return false;
      return true;
    });
  }

  public getDoctorById(id: string): DoctorProfile | undefined {
    return this.doctors.find((d) => d.id === id);
  }

  // Queue Operations
  public getQueueEntries(hospitalId?: string, doctorId?: string): QueueEntry[] {
    return this.queueEntries.filter((entry) => {
      if (hospitalId && entry.hospital_id !== hospitalId) return false;
      if (doctorId && entry.doctor_id !== doctorId) return false;
      return true;
    });
  }

  public getQueueEntryById(id: string): QueueEntry | undefined {
    return this.queueEntries.find((e) => e.id === id);
  }

  /**
   * Recalculates waiting times and queue positions for all waiting patients of a doctor.
   */
  public refreshQueueEstimates(doctorId: string) {
    const doctor = this.getDoctorById(doctorId);
    const avgDuration = doctor?.avg_consultation_minutes || 15;
    const isAvailable = doctor?.is_available ?? true;

    // Filter entries for this doctor
    const docEntries = this.queueEntries.filter((e) => e.doctor_id === doctorId);
    
    // Sort and re-number positions
    const reordered = recalculateQueuePositions(docEntries);

    // Active consulting patient elapsed time
    const activeConsulting = reordered.find((e) => e.status === 'IN_CONSULTATION');
    let elapsedCurrent = 0;
    if (activeConsulting && activeConsulting.consultation_started_at) {
      const startMs = new Date(activeConsulting.consultation_started_at).getTime();
      elapsedCurrent = Math.max(0, Math.floor((Date.now() - startMs) / 60000));
    }

    // Update estimates for all waiting patients
    const updated = reordered.map((entry) => {
      if (entry.status !== 'WAITING' && entry.status !== 'CHECKED_IN') {
        return entry;
      }

      const patientsAhead = Math.max(0, entry.position_in_queue - 1);
      const estimate = calculateAlgorithmicWaitTime({
        patientsAhead,
        currentConsultationElapsedMinutes: elapsedCurrent,
        doctorAvgConsultationMinutes: avgDuration,
        isDoctorAvailable: isAvailable,
        isEmergencyOverride: entry.priority === 'EMERGENCY_OVERRIDE',
      });

      return {
        ...entry,
        estimated_wait_minutes: estimate.expected_wait_minutes,
        wait_time_lower_bound: estimate.lower_bound_minutes,
        wait_time_upper_bound: estimate.upper_bound_minutes,
        updated_at: new Date().toISOString(),
      };
    });

    // Replace in main array
    const otherEntries = this.queueEntries.filter((e) => e.doctor_id !== doctorId);
    this.queueEntries = [...otherEntries, ...updated];
  }

  /**
   * Transactional update of queue entry status with state machine enforcement.
   */
  public updateQueueStatus(
    queueEntryId: string,
    targetStatus: QueueEntryStatus,
    actor: { name: string; role: string; id?: string }
  ): QueueEntry {
    const entry = this.getQueueEntryById(queueEntryId);
    if (!entry) throw new Error(`Queue entry '${queueEntryId}' not found`);

    // Enforce state transition rules
    validateStateTransition(entry.status, targetStatus);

    const now = new Date().toISOString();
    entry.status = targetStatus;
    entry.updated_at = now;

    if (targetStatus === 'IN_CONSULTATION') {
      entry.consultation_started_at = now;
    } else if (targetStatus === 'COMPLETED') {
      entry.consultation_completed_at = now;
    } else if (targetStatus === 'CHECKED_IN') {
      entry.checked_in_at = now;
    }

    // Refresh whole queue positions and wait times
    this.refreshQueueEstimates(entry.doctor_id);

    // Audit log
    this.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      hospital_id: entry.hospital_id,
      actor_id: actor.id,
      actor_name: actor.name,
      actor_role: actor.role,
      action: `STATUS_CHANGE_TO_${targetStatus}`,
      target_entity: 'queue_entries',
      target_id: entry.id,
      details: {
        token: entry.display_ticket,
        patient_name: entry.patient_name,
        new_status: targetStatus,
      },
      created_at: now,
    });

    // Trigger turn alerts for upcoming patients
    this.checkAndSendTurnAlerts(entry.doctor_id);

    return entry;
  }

  /**
   * Clinical Triage Urgent Override (Emergency Bypass).
   * Moves a critical patient directly to next position.
   */
  public triageUrgentOverride(
    queueEntryId: string,
    priority: PriorityLevel,
    reason: string,
    actor: { name: string; role: string; id?: string }
  ): QueueEntry {
    const entry = this.getQueueEntryById(queueEntryId);
    if (!entry) throw new Error(`Queue entry '${queueEntryId}' not found`);

    entry.priority = priority;
    entry.priority_reason = reason;
    entry.updated_at = new Date().toISOString();

    this.refreshQueueEstimates(entry.doctor_id);

    this.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      hospital_id: entry.hospital_id,
      actor_id: actor.id,
      actor_name: actor.name,
      actor_role: actor.role,
      action: `TRIAGE_PRIORITY_${priority}`,
      target_entity: 'queue_entries',
      target_id: entry.id,
      details: {
        token: entry.display_ticket,
        priority,
        reason,
      },
      created_at: new Date().toISOString(),
    });

    return entry;
  }

  /**
   * Register a walk-in patient directly into the queue.
   */
  public registerWalkIn(params: {
    hospitalId: string;
    doctorId: string;
    patientName: string;
    patientPhone: string;
    actor: { name: string; role: string; id?: string };
  }): QueueEntry {
    const today = new Date().toISOString().split('T')[0];
    const docEntries = this.queueEntries.filter(
      (e) => e.doctor_id === params.doctorId && e.queue_id.includes(today)
    );
    const doctor = this.getDoctorById(params.doctorId);
    const dept = this.departments.find((d) => d.id === doctor?.department_id);
    const deptCode = dept ? dept.code : 'WALK';

    const maxToken = docEntries.reduce((max, e) => Math.max(max, e.token_number), 0);
    const nextToken = maxToken + 1;
    const displayTicket = `${deptCode}-${String(nextToken).padStart(3, '0')}`;

    const newEntry: QueueEntry = {
      id: `entry-${Date.now()}`,
      queue_id: `queue-${params.doctorId}-${today}`,
      hospital_id: params.hospitalId,
      doctor_id: params.doctorId,
      token_number: nextToken,
      display_ticket: displayTicket,
      patient_name: params.patientName,
      patient_phone: params.patientPhone,
      priority: 'NORMAL',
      status: 'WAITING',
      position_in_queue: docEntries.filter((e) => e.status === 'WAITING').length + 1,
      estimated_wait_minutes: 0,
      wait_time_lower_bound: 0,
      wait_time_upper_bound: 0,
      checked_in_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.queueEntries.push(newEntry);
    this.refreshQueueEstimates(params.doctorId);

    this.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      hospital_id: params.hospitalId,
      actor_id: params.actor.id,
      actor_name: params.actor.name,
      actor_role: params.actor.role,
      action: 'REGISTER_WALK_IN',
      target_entity: 'queue_entries',
      target_id: newEntry.id,
      details: { token: displayTicket, patient: params.patientName },
      created_at: new Date().toISOString(),
    });

    return newEntry;
  }

  /**
   * Book an appointment
   */
  public bookAppointment(params: {
    hospitalId: string;
    departmentId: string;
    doctorId: string;
    patientId: string;
    patientName: string;
    patientPhone: string;
    appointmentDate: string;
    slotStartTime: string;
    notes?: string;
  }): Appointment {
    const startHour = parseInt(params.slotStartTime.split(':')[0], 10);
    const startMin = parseInt(params.slotStartTime.split(':')[1], 10);
    const totalEndMinutes = startHour * 60 + startMin + 15;
    const endHour = Math.floor(totalEndMinutes / 60) % 24;
    const endMin = totalEndMinutes % 60;
    const slotEndTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      hospital_id: params.hospitalId,
      department_id: params.departmentId,
      doctor_id: params.doctorId,
      patient_id: params.patientId,
      patient_name: params.patientName,
      patient_phone: params.patientPhone,
      appointment_date: params.appointmentDate,
      slot_start_time: params.slotStartTime,
      slot_end_time: slotEndTime,
      status: 'SCHEDULED',
      is_walk_in: false,
      notes: params.notes,
      created_at: new Date().toISOString(),
    };

    this.appointments.push(newApt);

    this.notifications.unshift({
      id: `notif-${Date.now()}`,
      user_id: params.patientId,
      title: 'Appointment Booked',
      message: `Your appointment with doctor is scheduled for ${params.appointmentDate} at ${params.slotStartTime}.`,
      type: 'APPOINTMENT_CONFIRMED',
      is_read: false,
      channel: 'IN_APP',
      created_at: new Date().toISOString(),
    });

    return newApt;
  }

  /**
   * Check in an existing appointment into physical queue.
   */
  public checkInAppointment(
    appointmentId: string,
    actor: { name: string; role: string; id?: string }
  ): QueueEntry {
    const apt = this.appointments.find((a) => a.id === appointmentId);
    if (!apt) throw new Error(`Appointment '${appointmentId}' not found`);

    apt.status = 'CHECKED_IN';

    const doctor = this.getDoctorById(apt.doctor_id);
    const dept = this.departments.find((d) => d.id === apt.department_id);
    const deptCode = dept?.code || 'APT';

    const today = new Date().toISOString().split('T')[0];
    const docEntries = this.queueEntries.filter(
      (e) => e.doctor_id === apt.doctor_id && e.queue_id.includes(today)
    );
    const maxToken = docEntries.reduce((max, e) => Math.max(max, e.token_number), 0);
    const nextToken = maxToken + 1;
    const displayTicket = `${deptCode}-${String(nextToken).padStart(3, '0')}`;

    const newEntry: QueueEntry = {
      id: `entry-${Date.now()}`,
      queue_id: `queue-${apt.doctor_id}-${today}`,
      hospital_id: apt.hospital_id,
      doctor_id: apt.doctor_id,
      appointment_id: apt.id,
      patient_id: apt.patient_id,
      token_number: nextToken,
      display_ticket: displayTicket,
      patient_name: apt.patient_name,
      patient_phone: apt.patient_phone,
      priority: 'NORMAL',
      status: 'WAITING',
      position_in_queue: docEntries.filter((e) => e.status === 'WAITING').length + 1,
      estimated_wait_minutes: 0,
      wait_time_lower_bound: 0,
      wait_time_upper_bound: 0,
      checked_in_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.queueEntries.push(newEntry);
    this.refreshQueueEstimates(apt.doctor_id);

    this.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      hospital_id: apt.hospital_id,
      actor_id: actor.id,
      actor_name: actor.name,
      actor_role: actor.role,
      action: 'CHECK_IN_APPOINTMENT',
      target_entity: 'queue_entries',
      target_id: newEntry.id,
      details: { token: displayTicket, patient: apt.patient_name },
      created_at: new Date().toISOString(),
    });

    return newEntry;
  }

  /**
   * Set Doctor Availability or Breaks
   */
  public setDoctorAvailability(
    doctorId: string,
    isAvailable: boolean,
    unavailabilityReason?: string,
    breakStart?: string,
    breakEnd?: string
  ) {
    const doc = this.getDoctorById(doctorId);
    if (!doc) throw new Error(`Doctor '${doctorId}' not found`);

    doc.is_available = isAvailable;
    const today = new Date().toISOString().split('T')[0];

    const existingAvail = this.doctorAvailability.find(
      (a) => a.doctor_id === doctorId && a.schedule_date === today
    );

    if (existingAvail) {
      existingAvail.is_present = isAvailable;
      existingAvail.unavailability_reason = unavailabilityReason;
      existingAvail.break_start_time = breakStart;
      existingAvail.break_end_time = breakEnd;
    } else {
      this.doctorAvailability.push({
        id: `avail-${Date.now()}`,
        doctor_id: doctorId,
        schedule_date: today,
        is_present: isAvailable,
        break_start_time: breakStart,
        break_end_time: breakEnd,
        unavailability_reason: unavailabilityReason,
      });
    }

    this.refreshQueueEstimates(doctorId);
  }

  // Check and dispatch turn-approaching notifications
  private checkAndSendTurnAlerts(doctorId: string) {
    const waiting = this.queueEntries
      .filter((e) => e.doctor_id === doctorId && e.status === 'WAITING')
      .sort((a, b) => a.position_in_queue - b.position_in_queue);

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    for (const patient of waiting) {
      if (patient.position_in_queue <= 2 && patient.patient_id) {
        // Check for duplicate: skip if a similar notification was sent recently
        const recentDuplicate = this.notifications.find(
          (n) =>
            n.user_id === patient.patient_id &&
            n.type === 'QUEUE_TURN_APPROACHING' &&
            n.created_at > fiveMinutesAgo &&
            n.message.includes(patient.display_ticket)
        );
        if (recentDuplicate) continue;

        this.notifications.unshift({
          id: `notif-${Date.now()}-${patient.id}`,
          user_id: patient.patient_id,
          title: 'Your Turn is Approaching!',
          message: `Your token ${patient.display_ticket} is now at position ${patient.position_in_queue}. Please wait near the consultation door.`,
          type: 'QUEUE_TURN_APPROACHING',
          is_read: false,
          channel: 'IN_APP',
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  // Appointments, Users, Notifications, Audit
  public getAppointments(patientId?: string, doctorId?: string): Appointment[] {
    return this.appointments.filter((a) => {
      if (patientId && a.patient_id !== patientId) return false;
      if (doctorId && a.doctor_id !== doctorId) return false;
      return true;
    });
  }

  public getAppointmentById(id: string): Appointment | undefined {
    return this.appointments.find((a) => a.id === id);
  }

  public getUsers(): UserProfile[] {
    return [...this.users];
  }

  public getUserByEmail(email: string): UserProfile | undefined {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserById(id: string): UserProfile | undefined {
    return this.users.find((u) => u.id === id);
  }

  public getNotifications(userId: string): NotificationItem[] {
    return this.notifications.filter((n) => n.user_id === userId);
  }

  public getAuditLogs(hospitalId?: string): AuditLog[] {
    if (hospitalId) return this.auditLogs.filter((l) => l.hospital_id === hospitalId);
    return [...this.auditLogs];
  }
}

// Singleton instance for in-memory persistence during development / server session
const globalForDb = globalThis as unknown as { mockDbInstance: MockDatabase };
export const mockDb = globalForDb.mockDbInstance || new MockDatabase();
if (process.env.NODE_ENV !== 'production') globalForDb.mockDbInstance = mockDb;
