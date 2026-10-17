'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Stethoscope, Calendar, Search } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { DoctorProfile } from '@/types/database';

export default function DoctorsPage() {
  const { t } = useTranslation();
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/doctors')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDoctors(data.doctors);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredDoctors = doctors.filter(
    (d) =>
      d.full_name.toLowerCase().includes(search.toLowerCase()) ||
      d.specialization.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('nav.doctors')}</h1>
        <p className="text-sm text-slate-500 mt-2">
          {t('footer.doctorsTimings')}
        </p>

        {/* Search */}
        <div className="mt-6 relative max-w-md mx-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by doctor name or specialization..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-slate-500">{t('common.loading')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                      doc.is_available
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {doc.is_available ? t('home.inClinic') : t('queueTracking.doctorAway')}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base">{doc.full_name}</h3>
                <div className="text-xs text-brand-600 font-medium mb-1">{doc.qualification}</div>
                <p className="text-xs text-slate-600 mb-3">{doc.specialization}</p>

                <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1 mb-4">
                  <div><strong>Consultation:</strong> {doc.room_number}</div>
                  <div><strong>{t('queueTracking.doctorPace')}:</strong> ~{doc.avg_consultation_minutes} min per patient</div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href={`/queue/entry-menon-003`}
                  className="text-xs font-semibold text-slate-600 hover:text-brand-600 transition"
                >
                  {t('nav.liveTracker')}
                </Link>
                <Link
                  href={`/appointments/book?doctor=${doc.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{t('nav.bookAppointment')}</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
