import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/store/mockDb';
import { BookAppointmentSchema } from '@/lib/validations';
import { getServerSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId') || undefined;
    const doctorId = searchParams.get('doctorId') || undefined;

    // Security: Require authentication for appointment queries
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to view appointments' },
        { status: 401 }
      );
    }

    // Patients can only see their own appointments
    let effectivePatientId = patientId;
    if (session.role === 'PATIENT') {
      effectivePatientId = session.userId;
    }

    // Requirement 7: Doctors must only see appointments assigned to their doctor profile
    let effectiveDoctorId = doctorId;
    if (session.role === 'DOCTOR') {
      const doc = mockDb.getDoctors().find((d) => d.user_id === session.userId);
      effectiveDoctorId = doc ? doc.id : 'unassigned-doctor-id';
    }

    const rawAppointments = mockDb.getAppointments(effectivePatientId, effectiveDoctorId);
    const departments = mockDb.getDepartments();

    // Enrich each appointment with doctor profile and department details
    const appointments = rawAppointments.map((apt) => {
      const doc = mockDb.getDoctorById(apt.doctor_id);
      const dept = departments.find(
        (d) => d.id === apt.department_id || d.id === doc?.department_id
      );
      return {
        ...apt,
        doctor: doc || null,
        department: dept || null,
      };
    });

    return NextResponse.json({ success: true, appointments });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = BookAppointmentSchema.parse(body);

    // Security: Require authentication for booking
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to book appointments' },
        { status: 401 }
      );
    }

    // Validate that the doctor actually exists
    const doctor = mockDb.getDoctorById(validated.doctorId);
    if (!doctor) {
      return NextResponse.json(
        { success: false, error: `Doctor with ID '${validated.doctorId}' not found` },
        { status: 400 }
      );
    }

    // Patients can only book for themselves; staff can book for any patient
    let effectivePatientId = validated.patientId;
    if (session.role === 'PATIENT') {
      effectivePatientId = session.userId;
    }

    const appointment = mockDb.bookAppointment({
      hospitalId: validated.hospitalId,
      departmentId: doctor.department_id || validated.departmentId,
      doctorId: doctor.id,
      patientId: effectivePatientId,
      patientName: validated.patientName,
      patientPhone: validated.patientPhone,
      appointmentDate: validated.appointmentDate,
      slotStartTime: validated.slotStartTime,
      notes: validated.notes,
    });

    const dept = mockDb.getDepartments().find((d) => d.id === appointment.department_id);

    return NextResponse.json(
      {
        success: true,
        message: 'Appointment scheduled successfully',
        appointment: {
          ...appointment,
          doctor,
          department: dept || null,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to book appointment' },
      { status: 400 }
    );
  }
}
