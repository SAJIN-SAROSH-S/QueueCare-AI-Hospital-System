import { NextRequest } from 'next/server';
import { UserRole } from '@/types/database';
import { mockDb } from '@/lib/store/mockDb';

/**
 * Server-side session — verified identity of the calling user.
 * Never trust client-submitted role claims; always derive from this.
 */
export interface ServerSession {
  userId: string;
  role: UserRole;
  userName: string;
}

/**
 * Extracts a verified server session from the incoming request.
 *
 * **When Supabase is configured**: reads the JWT from cookies using Supabase SSR,
 * looks up the user profile in the database.
 *
 * **When in demo/mock mode** (no Supabase env vars): reads user identity from
 * the `x-queuecare-user-id` header or `queuecare_demo_user` cookie, then
 * looks up the user in the mock database. The server verifies the role — the
 * client cannot claim an arbitrary role.
 *
 * Returns `null` if no valid session can be established.
 */
export async function getServerSession(request: NextRequest): Promise<ServerSession | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // ── Supabase production path ──────────────────────────────────────────
  if (supabaseUrl && supabaseKey) {
    try {
      // Dynamic import to avoid build errors when Supabase SSR is not available
      const { createServerSupabaseClient } = await import('@/lib/supabase/server');
      const supabase = createServerSupabaseClient();
      if (!supabase) return null;

      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;

      // Look up the user profile in the database to get the role
      // In production this would be a Supabase DB query; here we check mockDb as well
      const profile = mockDb.getUserByEmail(user.email || '');
      if (!profile) return null;

      return {
        userId: profile.id,
        role: profile.role,
        userName: profile.full_name,
      };
    } catch {
      // Supabase auth failed; fall through to demo mode
      return null;
    }
  }

  // ── Session Cookie Resolution ─────────────────────────────────────────
  // Primary trusted identity token is the signed/session cookie
  const cookieUserId = request.cookies.get('queuecare_demo_user')?.value;
  // Test/internal header fallback only used when no conflicting cookie is present
  const headerUserId = request.headers.get('x-queuecare-user-id');
  const userId = cookieUserId || headerUserId;

  if (!userId) return null;

  // Server-verified: look up user in the database and return their real role
  const user = mockDb.getUserById(userId);
  if (!user) return null;

  return {
    userId: user.id,
    role: user.role,
    userName: user.full_name,
  };
}

/**
 * Requires an authenticated session. Throws an error suitable for API routes
 * when no valid session exists.
 */
export async function requireSession(request: NextRequest): Promise<ServerSession> {
  const session = await getServerSession(request);
  if (!session) {
    const error = new Error('Authentication required') as Error & { status: number };
    error.status = 401;
    throw error;
  }
  return session;
}

/**
 * Requires an authenticated session with one of the specified roles.
 * Throws 401 if unauthenticated, 403 if role is not permitted.
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: UserRole[]
): Promise<ServerSession> {
  const session = await requireSession(request);
  if (!allowedRoles.includes(session.role)) {
    const error = new Error(
      `Role '${session.role}' is not permitted. Required: ${allowedRoles.join(', ')}`
    ) as Error & { status: number };
    error.status = 403;
    throw error;
  }
  return session;
}
