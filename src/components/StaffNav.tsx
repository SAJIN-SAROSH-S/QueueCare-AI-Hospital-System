'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n/useTranslation';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Stethoscope,
  Building2,
  BarChart3,
  Settings,
  Shield,
  FileText,
  UserPlus,
} from 'lucide-react';

export default function StaffNav() {
  const pathname = usePathname();
  const { role } = useAuth();
  const { t } = useTranslation();

  const navItems = [
    { label: t('staffNav.opdConsole'), href: '/staff/dashboard', icon: LayoutDashboard },
    { label: t('staffNav.liveQueue'), href: '/staff/queue', icon: Users },
    { label: t('staffNav.appointments'), href: '/staff/appointments', icon: Calendar },
    { label: t('staffNav.walkIn'), href: '/staff/patients', icon: UserPlus },
    { label: t('staffNav.doctors'), href: '/staff/doctors', icon: Stethoscope },
    { label: t('staffNav.departments'), href: '/staff/departments', icon: Building2 },
    { label: t('staffNav.analytics'), href: '/staff/analytics', icon: BarChart3 },
    { label: t('footer.notificationSettings'), href: '/staff/settings', icon: Settings },
    { label: t('nav.role'), href: '/admin/users', icon: Shield, adminOnly: true },
    { label: t('staffNav.auditLogs'), href: '/admin/audit-logs', icon: FileText, adminOnly: true },
  ];

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 overflow-x-auto py-2 text-xs font-semibold scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            if (item.adminOnly && role !== 'ADMIN') return null;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition ${
                  active
                    ? 'bg-teal-50 text-teal-800 border border-teal-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-teal-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
