'use client';

import React, { useState, useEffect } from 'react';
import StaffNav from '@/components/StaffNav';
import { useAuth } from '@/context/AuthContext';
import { Stethoscope, Clock, CheckCircle2, Coffee, AlertCircle, RefreshCw } from 'lucide-react';
import { DoctorProfile } from '@/types/database';

export default function StaffDoctorsPage() {
  const { role } = useAuth();
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const [breakModalDoc, setBreakModalDoc] = useState<DoctorProfile | null>(null);
  const [breakReason, setBreakReason] = useState('Lunch & Clinical Rounds');
  const [breakStart, setBreakStart] = useState('13:00');
  const [breakEnd, setBreakEnd] = useState('14:00');

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/doctors');
      const data = await res.json();
      if (data.success) {
        setDoctors(data.doctors);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const toggleAvailability = async (doctorId: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/doctors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId,
          isAvailable: !currentStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotice(`Doctor availability updated. Queue wait-times recalculated.`);
        setTimeout(() => setNotice(null), 3500);
        fetchDoctors();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleBreakSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!breakModalDoc) return;

    try {
      const res = await fetch('/api/doctors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: breakModalDoc.id,
          isAvailable: false,
          reason: breakReason,
          breakStart,
          breakEnd,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotice(`Break scheduled for ${breakModalDoc.full_name}. Queue estimates updated.`);
        setBreakModalDoc(null);
        setTimeout(() => setNotice(null), 3500);
        fetchDoctors();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-slate-50">
      <StaffNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Doctor Schedules & Availability</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Control clinical availability and breaks. The prediction engine factors declared breaks into queue estimations.
            </p>
          </div>
          <button
            onClick={fetchDoctors}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 self-start"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {notice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {doctors.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{doc.full_name}</h3>
                    <div className="text-xs text-brand-700 font-medium">{doc.specialization}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{doc.room_number}</div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      doc.is_available
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {doc.is_available ? 'Available' : 'On Break / Off Duty'}
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1 mb-4">
                  <div><strong>Pace Metric:</strong> ~{doc.avg_consultation_minutes} minutes per outpatient</div>
                  <div><strong>Status:</strong> {doc.is_available ? 'Consulting patients in room' : 'Declared break in progress'}</div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setBreakModalDoc(doc)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition"
                >
                  <Coffee className="w-3.5 h-3.5 text-amber-600" />
                  <span>Declare Break</span>
                </button>

                <button
                  onClick={() => toggleAvailability(doc.id, doc.is_available)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    doc.is_available
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                  }`}
                >
                  {doc.is_available ? 'Mark Unavailable' : 'Mark Available'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Break Declaration Modal */}
      {breakModalDoc && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Declare Break for {breakModalDoc.full_name}</h3>
            <p className="text-xs text-slate-500">
              QueueCare AI will add the break duration into patient wait-time forecasts.
            </p>

            <form onSubmit={handleBreakSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Break Reason</label>
                <input
                  type="text"
                  required
                  value={breakReason}
                  onChange={(e) => setBreakReason(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={breakStart}
                    onChange={(e) => setBreakStart(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estimated Return</label>
                  <input
                    type="time"
                    required
                    value={breakEnd}
                    onChange={(e) => setBreakEnd(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setBreakModalDoc(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  Set Break & Update Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
