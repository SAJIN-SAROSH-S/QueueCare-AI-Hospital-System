import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/store/mockDb';
import { getServerSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    // Security: Notifications require authentication, and users can only see their own
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to view notifications' },
        { status: 401 }
      );
    }

    // Patients can only see their own notifications.
    // Staff/Admin can query any user's notifications for support purposes.
    let userId = session.userId;
    const requestedUserId = new URL(request.url).searchParams.get('userId');

    if (requestedUserId && requestedUserId !== session.userId) {
      if (session.role === 'PATIENT') {
        return NextResponse.json(
          { success: false, error: 'Patients can only view their own notifications' },
          { status: 403 }
        );
      }
      // Staff/Admin can query other users' notifications
      userId = requestedUserId;
    }

    const notifications = mockDb.getNotifications(userId);
    return NextResponse.json({ success: true, notifications });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
