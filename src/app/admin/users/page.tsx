'use client';

import React, { useState } from 'react';
import StaffNav from '@/components/StaffNav';
import { useAuth } from '@/context/AuthContext';
import { Shield, UserPlus, Search, CheckCircle2, Lock } from 'lucide-react';
import { UserRole } from '@/types/database';

interface StaffUserItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  clinic: string;
}

export default function AdminUsersPage() {
  const { role } = useAuth();
  const [users, setUsers] = useState<StaffUserItem[]>([
    {
      id: 'usr-1',
      name: 'Priya Varma',
      email: 'admin@queuecare.ai',
      role: 'ADMIN',
      phone: '+91 98470 11223',
      clinic: 'Kochi Care Polyclinic',
    },
    {
      id: 'usr-2',
      name: 'Anjali Pillai',
      email: 'receptionist@queuecare.ai',
      role: 'RECEPTIONIST',
      phone: '+91 98470 33445',
      clinic: 'Kochi Care Polyclinic',
    },
    {
      id: 'usr-3',
      name: 'Dr. Arvind Menon',
      email: 'doctor@queuecare.ai',
      role: 'DOCTOR',
      phone: '+91 98470 55667',
      clinic: 'Cardiology (Room 102)',
    },
    {
      id: 'usr-4',
      name: 'Dr. Sneha Nair',
      email: 'sneha.nair@queuecare.ai',
      role: 'DOCTOR',
      phone: '+91 98470 88990',
      clinic: 'Pediatrics (Room 104)',
    },
  ]);

  const [search, setSearch] = useState('');

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full flex-1 flex flex-col bg-slate-50">
      <StaffNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Staff & Role Administration</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage clinical hospital staff memberships and role-based permissions (RBAC).
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff by name or role..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Role Permission</th>
                <th className="py-3 px-4">Assigned Department</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{u.name}</td>
                  <td className="py-3.5 px-4 text-slate-500">{u.email}</td>
                  <td className="py-3.5 px-4 text-slate-500">{u.phone}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        u.role === 'ADMIN'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : u.role === 'DOCTOR'
                          ? 'bg-teal-50 text-teal-700 border border-teal-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">{u.clinic}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
