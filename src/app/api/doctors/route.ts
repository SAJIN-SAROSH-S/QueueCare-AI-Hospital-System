import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/store/mockDb';
import { UpdateDoctorAvailabilitySchema } from '@/lib/validations';
import { getServerSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hospitalId = searchParams.get('hospitalId') || undefined;
    const departmentId = searchParams.get('departmentId') || undefined;

    // Doctor listing is public (patients need to browse doctors)
    const doctors = mockDb.getDoctors(hospitalId, departmentId);
    return NextResponse.json({ success: true, doctors });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch doctors' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Security: Only doctors (their own), receptionists, and admins can update availability
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to update doctor availability' },
        { status: 401 }
      );
    }

    if (!['DOCTOR', 'RECEPTIONIST', 'ADMIN'].includes(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Only doctors, receptionists, and admins can update doctor availability' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = UpdateDoctorAvailabilitySchema.parse(body);

    // Doctors can only update their own availability
    if (session.role === 'DOCTOR') {
      const doctor = mockDb.getDoctorById(validated.doctorId);
      if (!doctor || doctor.user_id !== session.userId) {
        return NextResponse.json(
          { success: false, error: 'Doctors can only update their own availability' },
          { status: 403 }
        );
      }
    }

    mockDb.setDoctorAvailability(
      validated.doctorId,
      validated.isAvailable,
      validated.reason,
      validated.breakStart,
      validated.breakEnd
    );

    return NextResponse.json({
      success: true,
      message: 'Doctor availability and queue estimates updated',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update availability' },
      { status: 400 }
    );
  }
}
