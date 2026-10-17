'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Building2, MapPin, Phone, Clock, Stethoscope, ArrowRight, Calendar, UserCheck } from 'lucide-react';
import { Hospital, Department, DoctorProfile } from '@/types/database';

export default function HospitalDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/hospitals?id=${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setHospital(data.hospital);
          setDepartments(data.departments);
          setDoctors(data.doctors);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="text-center py-20 text-slate-500 text-sm">Loading clinic details...</div>;
  }

  if (!hospital) {
    return <div className="text-center py-20 text-slate-500 text-sm">Hospital not found.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
      {/* Hospital Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center font-bold">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{hospital.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Open Today
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{hospital.address}</span>
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-brand-600" />
                  {hospital.phone}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-brand-600" />
                  Mon–Sat: 08:30 – 18:00
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/appointments/book"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-md shadow-brand-500/20"
          >
            <Calendar className="w-4 h-4" />
            <span>Book Appointment Here</span>
          </Link>
        </div>
      </div>

      {/* OPD Doctors & Specialties */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Available Doctors & Outpatient Clinics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doc) => {
            const dept = departments.find((d) => d.id === doc.department_id);
            return (
              <div
                key={doc.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                        {dept?.name || 'Specialty'}
                      </span>
                      <h3 className="font-bold text-slate-900 text-base mt-1.5">{doc.full_name}</h3>
                      <div className="text-xs text-slate-500">{doc.qualification}</div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      doc.is_available
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {doc.is_available ? 'Available' : 'On Break'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 mb-4 space-y-1">
                    <div><strong>Specialization:</strong> {doc.specialization}</div>
                    <div><strong>OPD Consultation:</strong> {doc.room_number}</div>
                    <div><strong>Avg Wait per Patient:</strong> ~{doc.avg_consultation_minutes} mins</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href={`/queue/entry-menon-003`}
                    className="text-xs font-semibold text-slate-600 hover:text-brand-600"
                  >
                    View Queue
                  </Link>
                  <Link
                    href={`/appointments/book?doctor=${doc.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold"
                  >
                    <span>Book Token</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
