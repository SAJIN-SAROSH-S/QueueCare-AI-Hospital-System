'use client';

import React, { useState, useEffect } from 'react';
import StaffNav from '@/components/StaffNav';
import { useAuth } from '@/context/AuthContext';
import { UserPlus, Search, UserCheck, Phone, CheckCircle2, Stethoscope, Clock } from 'lucide-react';
import { DoctorProfile } from '@/types/database';

export default function StaffPatientsPage() {
  const { currentUser, role } = useAuth();
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('doc-menon-cardio');
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedTicket, setIssuedTicket] = useState<{ ticket: string; patient: string } | null>(null);

  useEffect(() => {
    fetch('/api/doctors')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDoctors(data.doctors);
        }
      });
  }, []);

  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setIssuedTicket(null);

    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-queuecare-user-id': currentUser.id,
        },
        credentials: 'include',
        body: JSON.stringify({
          hospitalId: 'hosp-kochi-general-01',
          doctorId: selectedDoctorId,
          patientName,
          patientPhone,
          actorName: currentUser.full_name,
          actorRole: role,
          actorId: currentUser.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIssuedTicket({
          ticket: data.entry.display_ticket,
          patient: data.entry.patient_name,
        });
        setPatientName('');
        setPatientPhone('');
      } else {
        alert(data.error || 'Failed to issue walk-in token');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-slate-50">
      <StaffNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Walk-in Patient Desk</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Register arrival of walk-in patients without pre-booked slots and assign them into live doctor queues.
          </p>
        </div>

        {issuedTicket && (
          <div className="p-6 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />
              <div>
                <div className="font-extrabold text-base">Token Issued Successfully!</div>
                <div className="text-xs text-emerald-700">
                  Walk-in patient <strong>{issuedTicket.patient}</strong> assigned token <strong className="font-mono text-emerald-950 font-black">{issuedTicket.ticket}</strong>.
                </div>
              </div>
            </div>
            <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white shadow-sm">
              Token Active in Queue
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Registration Form */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-teal-600" />
              <span>Issue Walk-in OPD Token</span>
            </h2>

            <form onSubmit={handleWalkInSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Specialist Doctor & Room</label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-medium text-slate-800"
                >
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.full_name} ({doc.room_number}) — {doc.specialization}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Patient Full Name</label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Anand K. Nair"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Phone (For Turn Notifications)</label>
                <input
                  type="tel"
                  required
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="+91 94470 12345"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider transition shadow-md shadow-teal-700/20"
                >
                  {isSubmitting ? 'Issuing Token...' : 'Issue Physical Token & Add to Queue'}
                </button>
              </div>
            </form>
          </div>

          {/* Guidelines Card */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs text-slate-600">
              <h3 className="font-bold text-slate-900 text-sm">Walk-In Triage Guidelines</h3>
              <ul className="space-y-2 list-disc list-inside">
                <li>Walk-ins are blended into the doctor&apos;s queue based on current clinic policy without superseding booked appointments.</li>
                <li>The patient receives a printed or SMS ticket token with live tracking link.</li>
                <li>Wait times are calculated dynamically based on doctors&apos; historical pace.</li>
                <li>In case of acute respiratory distress, severe bleeding, or cardiac emergencies, use the <strong>Triage Override</strong> button in the queue console immediately.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
