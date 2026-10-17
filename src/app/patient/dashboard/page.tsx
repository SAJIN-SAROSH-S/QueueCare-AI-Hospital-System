'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n/useTranslation';
import {
  Clock,
  Calendar,
  AlertCircle,
  ArrowRight,
  Bell,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { Appointment, QueueEntry, NotificationItem, DoctorProfile } from '@/types/database';

export default function PatientDashboard() {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [queueEntry, setQueueEntry] = useState<QueueEntry | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setErrorNotice(null);
    try {
      const authHeaders = {
        'x-queuecare-user-id': currentUser.id,
      };

      // 1. Fetch appointments with cache-busting
      const aptRes = await fetch(`/api/appointments?patientId=${currentUser.id}&_t=${Date.now()}`, {
        headers: authHeaders,
        credentials: 'include',
        cache: 'no-store',
      });
      const aptData = await aptRes.json();
      if (aptData.success) {
        setAppointments(aptData.appointments);
      }

      // 2. Fetch active queue entry and doctors list
      const queueRes = await fetch(`/api/queue?hospitalId=hosp-kochi-general-01&_t=${Date.now()}`, {
        headers: authHeaders,
        credentials: 'include',
        cache: 'no-store',
      });
      const queueData = await queueRes.json();
      if (queueData.success && queueData.entries) {
        setDoctors(queueData.doctors || []);
        const myActive = queueData.entries.find(
          (e: QueueEntry) =>
            (e.patient_id === currentUser.id || e.patient_name === currentUser.full_name) &&
            e.status !== 'COMPLETED' &&
            e.status !== 'CANCELLED'
        );
        setQueueEntry(myActive || null);
      }

      // 3. Fetch notifications
      const notifRes = await fetch(`/api/notifications?userId=${currentUser.id}`, {
        headers: authHeaders,
        credentials: 'include',
      });
      const notifData = await notifRes.json();
      if (notifData.success) {
        setNotifications(notifData.notifications);
      }
    } catch (e: any) {
      console.error(e);
      setErrorNotice(t('common.networkError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser?.id]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('patientDashboard.title')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('patientDashboard.welcome', { name: currentUser.full_name })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} />
            <span>{t('patientDashboard.refreshQueue')}</span>
          </button>
          <Link
            href="/appointments/book"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition shadow-md shadow-brand-500/20"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{t('patientDashboard.bookAppointment')}</span>
          </Link>
        </div>
      </div>

      {errorNotice && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorNotice}</span>
          </div>
          <button
            onClick={fetchDashboardData}
            className="px-2.5 py-1 rounded-md bg-white border border-rose-300 font-semibold hover:bg-rose-100 transition"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Active Queue Card Highlight */}
      {queueEntry ? (
        <div className="mb-8 bg-gradient-to-br from-brand-600 via-teal-700 to-slate-900 rounded-2xl text-white p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-medium border border-white/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping motion-reduce:animate-none"></span>
                <span>{t('patientDashboard.liveQueueBadge')}</span>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="text-4xl sm:text-5xl font-black tracking-tight">{queueEntry.display_ticket}</span>
                <span className="text-xs uppercase px-2.5 py-1 rounded-md bg-white/20 font-bold tracking-wider">
                  {t('patientDashboard.statusLabel', { status: queueEntry.status })}
                </span>
              </div>
              {(() => {
                const activeDoc = doctors.find((d) => d.id === queueEntry.doctor_id);
                const docName = activeDoc?.full_name || 'Assigned Specialist Doctor';
                const docDetails = activeDoc
                  ? `${activeDoc.specialization} • ${activeDoc.room_number}`
                  : 'OPD Consultation';
                return (
                  <p className="text-sm text-white/80 max-w-xl">
                    {t('patientDashboard.consultingWith', { doctor: docName, details: docDetails })}
                  </p>
                );
              })()}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-white/10 backdrop-blur border border-white/20 p-4 rounded-xl">
              <div>
                <div className="text-xs text-white/70">{t('patientDashboard.positionInLine')}</div>
                <div className="text-2xl font-bold mt-0.5">#{queueEntry.position_in_queue}</div>
                <div className="text-[10px] text-white/60">
                  {queueEntry.position_in_queue === 1
                    ? t('patientDashboard.nextToBeCalled')
                    : t('patientDashboard.aheadOfYou', { count: queueEntry.position_in_queue - 1 })}
                </div>
              </div>
              <div>
                <div className="text-xs text-white/70">{t('patientDashboard.estimatedWait')}</div>
                <div className="text-2xl font-bold mt-0.5">
                  {queueEntry.wait_time_lower_bound}–{queueEntry.wait_time_upper_bound}m
                </div>
                <div className="text-[10px] text-emerald-300">{t('common.highConfidence')}</div>
              </div>

              <div className="col-span-2 sm:col-span-1 flex items-center justify-end sm:justify-start">
                <Link
                  href={`/queue/${queueEntry.id}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 transition"
                >
                  <span>{t('patientDashboard.openLiveTracker')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 p-6 bg-white rounded-2xl border border-slate-200 text-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t('patientDashboard.noActiveQueueTitle')}</h3>
              <p className="text-xs text-slate-500">{t('patientDashboard.noActiveQueueDesc')}</p>
            </div>
          </div>
          <Link
            href="/appointments/book"
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
          >
            {t('patientDashboard.scheduleOrJoin')}
          </Link>
        </div>
      )}

      {/* Main Grid: Appointments & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Appointments */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{t('patientDashboard.yourAppointments')}</h3>
                <p className="text-xs text-slate-500">{t('patientDashboard.upcomingDesc')}</p>
              </div>
              <Link href="/patient/appointments" className="text-xs font-semibold text-brand-600 hover:underline">
                {t('patientDashboard.viewAllHistory')}
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {appointments.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  {t('patientDashboard.noAppointments')}
                </div>
              ) : (
                appointments.map((apt) => {
                  const aptDoc = apt.doctor || doctors.find((d) => d.id === apt.doctor_id);
                  const docName = aptDoc?.full_name || 'Specialist Doctor';
                  const docSpec = aptDoc?.specialization || apt.department?.name || 'OPD Consultation';
                  return (
                    <div key={apt.id} className="p-5 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center font-bold flex-shrink-0">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{docName} &bull; {docSpec}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {t('patientDashboard.dateLabel', { date: apt.appointment_date, time: `${apt.slot_start_time} - ${apt.slot_end_time}` })}
                          </div>
                          {apt.notes && (
                            <div className="text-[11px] text-slate-400 mt-1 italic">
                              {t('patientDashboard.notesLabel', { notes: apt.notes })}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          apt.status === 'CHECKED_IN'
                            ? 'bg-brand-50 text-brand-700 border border-brand-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {apt.status}
                        </span>
                        <Link
                          href={`/appointments/${apt.id}`}
                          className="text-xs font-semibold text-slate-700 hover:text-brand-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-white transition"
                        >
                          {t('patientDashboard.detailsBtn')}
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Notifications & Clinic Info */}
        <div className="space-y-6">
          {/* Notifications Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Bell className="w-4 h-4 text-brand-600" />
                <span>{t('patientDashboard.recentUpdates')}</span>
              </h3>
              <span className="text-[11px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                {t('patientDashboard.alertsCount', { count: notifications.length })}
              </span>
            </div>

            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="text-xs text-slate-400 py-4 text-center">{t('patientDashboard.noUnread')}</div>
              ) : (
                notifications.map((notif) => (
                  <div key={notif.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>{notif.title}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{t('patientDashboard.justNow')}</span>
                    </div>
                    <p className="text-slate-600 mt-1 leading-relaxed">{notif.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Clinic Location & Assistance */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 text-xs text-slate-600 space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-700" />
              <span>{t('patientDashboard.clinicInfo')}</span>
            </h4>
            <p className="leading-relaxed whitespace-pre-line">
              {t('patientDashboard.clinicAddress')}
            </p>
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span>{t('patientDashboard.receptionAssistance')}</span>
              <a href="tel:+914842356789" className="font-bold text-brand-600 hover:underline">
                +91 484 235 6789
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
