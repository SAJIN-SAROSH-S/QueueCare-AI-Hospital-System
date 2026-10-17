import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/store/mockDb';
import { getServerSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    // Security: Only ADMIN users can view audit logs
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to access audit logs' },
        { status: 401 }
      );
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only administrators can access audit logs' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const hospitalId = searchParams.get('hospitalId') || undefined;

    const logs = mockDb.getAuditLogs(hospitalId);
    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
