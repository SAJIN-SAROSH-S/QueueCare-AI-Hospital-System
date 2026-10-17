import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/store/mockDb';
import { TriageOverrideSchema } from '@/lib/validations';
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
        { success: false, error: 'Authentication required for triage override' },
        { status: 401 }
      );
    }

    // Only clinical / reception staff can override triage priority
    if (!['DOCTOR', 'RECEPTIONIST', 'ADMIN'].includes(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Only clinical staff (Doctor, Receptionist, Admin) can perform triage overrides' },
        { status: 403 }
      );
    }

    const body = await request.json();
    // Validate the body but use server-verified actor info
    const validated = TriageOverrideSchema.parse({
      ...body,
      actorRole: session.role,
      actorName: session.userName,
    });

    const updated = mockDb.triageUrgentOverride(
      queueEntryId,
      validated.priority,
      validated.reason,
      {
        name: session.userName,
        role: session.role,
        id: session.userId,
      }
    );

    return NextResponse.json({
      success: true,
      message: `Triage priority updated to ${validated.priority}`,
      entry: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Triage override failed' },
      { status: 400 }
    );
  }
}
