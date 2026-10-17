import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/store/mockDb';
import { UpdateQueueStatusSchema } from '@/lib/validations';
import { getServerSession } from '@/lib/auth/session';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const queueEntryId = params.id;

    // Security: Verify identity from server session, not client-submitted role
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to update queue status' },
        { status: 401 }
      );
    }

    const body = await request.json();
    // Validate the body but OVERRIDE actorRole with server-verified session
    const validated = UpdateQueueStatusSchema.parse({
      ...body,
      actorRole: session.role, // Server-verified, not client-claimed
      actorName: session.userName,
      actorId: session.userId,
    });

    // Verify role permissions on server using verified session role
    const allowedRoles = ['RECEPTIONIST', 'DOCTOR', 'ADMIN', 'PATIENT'] as const;
    if (!allowedRoles.includes(session.role as any)) {
      return NextResponse.json(
        { success: false, error: `Role '${session.role}' is not permitted to update queue status` },
        { status: 403 }
      );
    }

    // Patients can only cancel their own booking
    if (session.role === 'PATIENT') {
      if (validated.targetStatus !== 'CANCELLED') {
        return NextResponse.json(
          { success: false, error: 'Patients are only permitted to cancel their appointment' },
          { status: 403 }
        );
      }
      // Verify the patient owns this queue entry
      const entry = mockDb.getQueueEntryById(queueEntryId);
      if (entry && entry.patient_id && entry.patient_id !== session.userId) {
        return NextResponse.json(
          { success: false, error: 'You can only cancel your own queue entry' },
          { status: 403 }
        );
      }
    }

    const updated = mockDb.updateQueueStatus(queueEntryId, validated.targetStatus, {
      name: session.userName,
      role: session.role,
      id: session.userId,
    });

    return NextResponse.json({
      success: true,
      message: `Status updated to ${validated.targetStatus}`,
      entry: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Status transition failed' },
      { status: 400 }
    );
  }
}
