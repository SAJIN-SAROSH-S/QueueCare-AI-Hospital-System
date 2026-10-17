import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/store/mockDb';
import { RegisterWalkInSchema } from '@/lib/validations';
import { getServerSession } from '@/lib/auth/session';

/**
 * Strips patient PII from queue entries for public/unauthenticated callers.
 * Only returns position, ticket, status, and wait-time information.
 */
function sanitizeQueueEntryForPublic(entry: any) {
  return {
    id: entry.id,
    queue_id: entry.queue_id,
    hospital_id: entry.hospital_id,
    doctor_id: entry.doctor_id,
    token_number: entry.token_number,
    display_ticket: entry.display_ticket,
    // Mask patient name to initials for public display
    patient_name: entry.patient_name
      ? entry.patient_name.split(' ').map((w: string) => w[0] + '***').join(' ')
      : 'Patient',
    // NEVER expose phone to public
    priority: entry.priority,
    status: entry.status,
    position_in_queue: entry.position_in_queue,
    estimated_wait_minutes: entry.estimated_wait_minutes,
    wait_time_lower_bound: entry.wait_time_lower_bound,
    wait_time_upper_bound: entry.wait_time_upper_bound,
    estimated_start_time: entry.estimated_start_time,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hospitalId = searchParams.get('hospitalId') || 'hosp-kochi-general-01';
    const doctorId = searchParams.get('doctorId') || undefined;

    const entries = mockDb.getQueueEntries(hospitalId, doctorId);
    const doctors = mockDb.getDoctors(hospitalId);

    // Security: Check if caller is authenticated staff — if so, return full data.
    // Otherwise, return sanitized data without patient PII.
    const session = await getServerSession(request);
    const isStaff = session && ['RECEPTIONIST', 'DOCTOR', 'ADMIN'].includes(session.role);

    const safeEntries = isStaff
      ? entries
      : entries.map(sanitizeQueueEntryForPublic);

    return NextResponse.json({
      success: true,
      entries: safeEntries,
      doctors,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch queue' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Security: Only staff can register walk-in patients
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to register walk-in patients' },
        { status: 401 }
      );
    }
    if (!['RECEPTIONIST', 'ADMIN'].includes(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Only receptionists and admins can register walk-in patients' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = RegisterWalkInSchema.parse(body);

    const newEntry = mockDb.registerWalkIn({
      hospitalId: validated.hospitalId,
      doctorId: validated.doctorId,
      patientName: validated.patientName,
      patientPhone: validated.patientPhone,
      actor: {
        name: session.userName,
        role: session.role,
        id: session.userId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Walk-in token ${newEntry.display_ticket} issued successfully.`,
        entry: newEntry,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to register walk-in' },
      { status: 400 }
    );
  }
}
