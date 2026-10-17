import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/store/mockDb';
import { getServerSession } from '@/lib/auth/session';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = params.id;

    // Security: Require authentication for check-in
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required for check-in' },
        { status: 401 }
      );
    }

    // Patients can only check in their own appointments; staff can check in any
    if (session.role === 'PATIENT') {
      const apt = mockDb.getAppointmentById(appointmentId);
      if (apt && apt.patient_id !== session.userId) {
        return NextResponse.json(
          { success: false, error: 'You can only check in your own appointment' },
          { status: 403 }
        );
      }
    }

    const queueEntry = mockDb.checkInAppointment(appointmentId, {
      name: session.userName,
      role: session.role,
      id: session.userId,
    });

    return NextResponse.json({
      success: true,
      message: `Checked in! Your live queue ticket is ${queueEntry.display_ticket}`,
      entry: queueEntry,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Check-in failed' },
      { status: 400 }
    );
  }
}
