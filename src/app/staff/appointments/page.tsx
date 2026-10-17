'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import StaffNav from '@/components/StaffNav';
import { useAuth } from '@/context/AuthContext';
import {
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  User,
  Phone,
  RefreshCw,
  QrCode,
  ArrowRight,
} from 'lucide-react';
import { Appointment } from '@/types/database';

export default function StaffAppointmentsPage() {
  const { currentUser, role } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments?_t=${Date.now()}`, {
        headers: {
          'x-queuecare-user-id': currentUser.id,
        },
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.success) {
        setAppointments(data.appointments || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [currentUser]);

  const handleCheckIn = async (appointmentId: string) => {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-queuecare-user-id': currentUser.id,
        },
        credentials: 'include',
        body: JSON.stringify({
          actorName: currentUser.full_name,
          actorRole: role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice(`Patient checked in! Issued live token: ${data.entry.display_ticket}`);
        setTimeout(() => setActionNotice(null), 4000);
        fetchAppointments();
      } else {
        alert(data.error || 'Check-in failed');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const filtered = appointments.filter((apt) => {
    const matchesSearch =
      apt.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      apt.patient_phone.includes(search) ||
      apt.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || apt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="w-full flex-1 flex flex-col bg-slate-50">
      <StaffNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Appointments Management</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review confirmed patient bookings and check them in upon physical hospital arrival.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAppointments}
              className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/appointments/book"
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs transition"
            >
              + Create Booking
            </Link>
          </div>
        </div>

        {/* Action Notice */}
        {actionNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by patient or phone..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="CHECKED_IN">Checked In</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Appointments Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Date & Slot</th>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">OPD Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No appointments matching query.
                    </td>
                  </tr>
                ) : (
                  filtered.map((apt) => (
                    <tr key={apt.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{apt.patient_name}</td>
                      <td className="py-3.5 px-4 text-slate-500">{apt.patient_phone}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{apt.appointment_date}</div>
                        <div className="text-[11px] text-slate-400">{apt.slot_start_time} - {apt.slot_end_time}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{apt.doctor?.full_name || 'Assigned Doctor'}</div>
                        <div className="text-[10px] text-slate-400">{apt.doctor?.specialization || apt.department?.name || 'OPD'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          apt.status === 'CHECKED_IN'
                            ? 'bg-brand-50 text-brand-700 border border-brand-200'
                            : apt.status === 'COMPLETED'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {apt.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {apt.status === 'SCHEDULED' ? (
                          <button
                            onClick={() => handleCheckIn(apt.id)}
                            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] transition shadow-sm"
                          >
                            Check In to Queue
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Queue Active</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
