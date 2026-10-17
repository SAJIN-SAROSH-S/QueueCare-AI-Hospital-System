import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { mockDb } from '@/lib/store/mockDb';
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const userId = cookieStore.get('queuecare_demo_user')?.value;
  const user = userId ? mockDb.getUserById(userId) : null;

  // If unauthenticated on the server, prompt to sign in
  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Authentication Required</h2>
          <p className="text-xs text-slate-500">
            You must be signed in with an Administrator account to access hospital audit trails and user administration.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition shadow-sm"
          >
            <LogIn className="w-4 h-4" />
            <span>Go to Login</span>
          </Link>
        </div>
      </div>
    );
  }

  // If not ADMIN, block access
  if (user.role !== 'ADMIN') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-rose-200 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Access Denied (403)</h2>
          <p className="text-xs text-slate-500">
            Your account (<strong>{user.full_name}</strong>) has the <strong>{user.role}</strong> role. Administrative audit logs and hospital user configuration require explicit <strong>ADMIN</strong> privileges.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            {user.role === 'PATIENT' ? (
              <Link
                href="/patient/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Patient Portal</span>
              </Link>
            ) : (
              <Link
                href="/staff/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Staff Console</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
