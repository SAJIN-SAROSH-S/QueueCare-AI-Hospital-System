'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { Calendar, ChevronRight } from 'lucide-react';
import { Appointment } from '@/types/database';

export default function PatientAppointmentsPage() {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/appointments?patientId=${currentUser.id}&_t=${Date.now()}`, {
      headers: {
        'x-queuecare-user-id': currentUser.id,
      },
      credentials: 'include',
      cache: 'no-store',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.appointments) {
          setAppointments(data.appointments);
        }
      })
      .finally(() => setLoading(false));
  }, [currentUser?.id]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('footer.appointmentHistory')}</h1>
          <p className="text-xs text-slate-500 mt-1">{t('patientDashboard.upcomingDesc')}</p>
        </div>
        <Link
          href="/appointments/book"
          className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition"
        >
          {t('patientDashboard.bookAppointment')}
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">{t('common.loading')}</div>
          ) : appointments.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">{t('patientDashboard.noAppointments')}</div>
          ) : (
            appointments.map((apt) => {
              const docName = apt.doctor?.full_name || 'Assigned Specialist Doctor';
              const docSpec = apt.doctor?.specialization || apt.department?.name || 'OPD Consultation';

              return (
                <div
                  key={apt.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center font-bold flex-shrink-0">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        {docSpec} &bull; {docName}
                      </h3>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {t('patientDashboard.dateLabel', { date: apt.appointment_date, time: `${apt.slot_start_time} - ${apt.slot_end_time}` })}
                      </div>
                      {apt.notes && (
                        <div className="text-[11px] text-slate-400 italic mt-1">
                          {t('patientDashboard.notesLabel', { notes: apt.notes })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      apt.status === 'COMPLETED'
                        ? 'bg-slate-100 text-slate-700'
                        : apt.status === 'CHECKED_IN'
                        ? 'bg-brand-50 text-brand-700 border border-brand-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {apt.status}
                    </span>
                    <Link
                      href={`/appointments/${apt.id}`}
                      className="p-2 text-slate-400 hover:text-slate-900 transition"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
