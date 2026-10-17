'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import StaffNav from '@/components/StaffNav';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n/useTranslation';
import {
  Users,
  Activity,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  UserCheck,
  Calendar,
} from 'lucide-react';
import { QueueEntry, DoctorProfile, Appointment } from '@/types/database';

export default function StaffDashboardPage() {
  const { role, currentUser } = useAuth();
  const { t } = useTranslation();
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLiveQueue = async () => {
    setLoading(true);
    try {
      const authHeaders = {
        'x-queuecare-user-id': currentUser.id,
      };

      const qRes = await fetch(`/api/queue?hospitalId=hosp-kochi-general-01&_t=${Date.now()}`, {
        headers: authHeaders,
        credentials: 'include',
        cache: 'no-store',
      });
      const qData = await qRes.json();
      if (qData.success) {
        setEntries(qData.entries || []);
        setDoctors(qData.doctors || []);
      }

      const aRes = await fetch(`/api/appointments?_t=${Date.now()}`, {
        headers: authHeaders,
        credentials: 'include',
        cache: 'no-store',
      });
      const aData = await aRes.json();
      if (aData.success) {
        setAppointments(aData.appointments || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveQueue();
  }, [currentUser?.id]);

  const waitingCount = entries.filter((e) => e.status === 'WAITING' || e.status === 'CHECKED_IN').length;
  const inConsultationCount = entries.filter((e) => e.status === 'IN_CONSULTATION').length;
  const completedCount = entries.filter((e) => e.status === 'COMPLETED').length;
  const activeConsultation = entries.find((e) => e.status === 'IN_CONSULTATION');

  return (
    <div className="w-full flex-1 flex flex-col bg-slate-50">
      <StaffNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {t('staffDashboard.title')}
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 uppercase">
                {t('staffDashboard.roleView', { role })}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {t('staffDashboard.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchLiveQueue}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} />
              <span>{t('common.refresh')}</span>
            </button>
            <Link
              href="/staff/queue"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-sm transition"
            >
              <Users className="w-3.5 h-3.5" />
              <span>{t('staffDashboard.manageQueue')}</span>
            </Link>
          </div>
        </div>

        {/* Top Operational Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Patients Waiting</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900">{waitingCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">Ready for consultation</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">In Consultation</span>
              <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-brand-600">{inConsultationCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">Active inside clinic</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Served Today</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-emerald-600">{completedCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">Consultations completed</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Average Wait Time</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900">18.4 <span className="text-sm font-normal text-slate-400">min</span></div>
            <div className="text-[11px] text-emerald-600 mt-1">&minus;4 min faster than baseline</div>
          </div>
        </div>

        {/* Active Consultation Banner */}
        {activeConsultation ? (
          <div className="bg-gradient-to-r from-teal-900 to-slate-900 rounded-2xl text-white p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-400 flex items-center justify-center text-teal-300 font-black text-xl">
                {activeConsultation.display_ticket}
              </div>
              {(() => {
                const consultDoc = doctors.find((d) => d.id === activeConsultation.doctor_id);
                const consultRoom = consultDoc?.room_number || 'OPD Room';
                const consultDocName = consultDoc?.full_name || 'Assigned Specialist Doctor';
                return (
                  <div>
                    <div className="text-xs text-teal-300 font-semibold uppercase tracking-wider">
                      Current Patient In {consultRoom}
                    </div>
                    <div className="text-lg font-bold">{activeConsultation.patient_name}</div>
                    <div className="text-xs text-white/70">Consulting with {consultDocName}</div>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/staff/queue"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition"
              >
                Complete & Call Next
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span>No patient currently inside consultation room. Doctor is ready.</span>
            <Link href="/staff/queue" className="text-teal-700 font-bold hover:underline">
              Call Next Patient &rarr;
            </Link>
          </div>
        )}

        {/* Doctor Queues Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Doctors Availability & Queue Length */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-teal-600" />
                <span>Doctor OPD Queue Status</span>
              </h2>
              <Link href="/staff/doctors" className="text-xs font-semibold text-teal-700 hover:underline">
                Manage Availability
              </Link>
            </div>

            <div className="space-y-3">
              {doctors.map((doc) => {
                const docWaiting = entries.filter(
                  (e) => e.doctor_id === doc.id && (e.status === 'WAITING' || e.status === 'CHECKED_IN')
                ).length;
                const docInConsult = entries.some(
                  (e) => e.doctor_id === doc.id && e.status === 'IN_CONSULTATION'
                );

                return (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{doc.full_name}</div>
                      <div className="text-slate-500">{doc.room_number} &bull; {doc.specialization}</div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <div className="font-bold text-slate-900">{docWaiting} waiting</div>
                        <div className="text-[10px] text-slate-400">~{doc.avg_consultation_minutes}m pace</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        docInConsult
                          ? 'bg-brand-50 text-brand-700 border border-brand-200'
                          : doc.is_available
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {docInConsult ? 'Consulting' : doc.is_available ? 'Ready' : 'Break'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions & Recent Queue Activity */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="font-bold text-slate-900 text-sm">Upcoming Waiting Patients</h2>

            <div className="space-y-2">
              {entries
                .filter((e) => e.status === 'WAITING')
                .slice(0, 4)
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-slate-100 font-bold flex items-center justify-center text-slate-700">
                        #{entry.position_in_queue}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{entry.patient_name}</span>
                          <span className="font-mono text-brand-700 text-[11px] font-semibold">
                            {entry.display_ticket}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Estimated wait: {entry.wait_time_lower_bound}–{entry.wait_time_upper_bound} mins
                        </div>
                      </div>
                    </div>

                    <Link
                      href="/staff/queue"
                      className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 hover:bg-teal-100 font-semibold text-[11px] transition"
                    >
                      Manage
                    </Link>
                  </div>
                ))}
            </div>

            <div className="pt-2">
              <Link
                href="/staff/patients"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
              >
                <span>Register New Walk-in Patient</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
