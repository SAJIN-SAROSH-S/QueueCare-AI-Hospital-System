'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Building2, MapPin, Phone, Clock, ArrowRight, Search } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { Hospital, Department } from '@/types/database';

export default function HospitalsPage() {
  const { t } = useTranslation();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/hospitals')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setHospitals(data.hospitals);
          setDepartments(data.departments);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredHospitals = hospitals.filter(
    (h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.district.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('nav.hospitals')}</h1>
        <p className="text-sm text-slate-500 mt-2">
          {t('footer.findClinic')}
        </p>

        {/* Search */}
        <div className="mt-6 relative max-w-md mx-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by clinic name or district (e.g. Ernakulam)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-slate-500">{t('common.loading')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredHospitals.map((hospital) => (
            <div
              key={hospital.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center font-bold">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{hospital.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{hospital.district}, {hospital.state}</span>
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {t('home.queueActive')}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mb-4">{hospital.address}</p>

                {/* Available OPD Departments */}
                <div className="mb-4">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Active OPD Specialties
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {departments.map((dept) => (
                      <span
                        key={dept.id}
                        className="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium"
                      >
                        {dept.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-2 mb-4">
                  <Clock className="w-3.5 h-3.5 text-brand-600" />
                  <span>{t('footer.opdHours')}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <a
                  href={`tel:${hospital.phone}`}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 text-brand-600" />
                  <span>{hospital.phone}</span>
                </a>
                <Link
                  href={`/hospitals/${hospital.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition"
                >
                  <span>View Doctors & Queue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
