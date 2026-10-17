'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { Calendar, Clock, User, Phone, AlertCircle, ArrowRight } from 'lucide-react';
import { DoctorProfile, Department } from '@/types/database';

function BookAppointmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultDocId = searchParams.get('doctor') || 'doc-menon-cardio';
  const { currentUser } = useAuth();
  const { t } = useTranslation();

  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(defaultDocId);
  const [patientName, setPatientName] = useState(currentUser.full_name);
  const [patientPhone, setPatientPhone] = useState(currentUser.phone);
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [slotStartTime, setSlotStartTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const timeSlots = [
    '09:00', '09:20', '09:40',
    '10:00', '10:20', '10:40',
    '11:00', '11:20', '11:40',
    '14:00', '14:20', '14:40',
    '15:00', '15:20', '15:40',
    '16:00', '16:20',
  ];

  useEffect(() => {
    fetch('/api/hospitals?id=hosp-kochi-general-01')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.doctors) {
          setDoctors(data.doctors);
          setDepartments(data.departments || []);
          const urlDoc = searchParams.get('doctor');
          if (urlDoc && data.doctors.some((d: DoctorProfile) => d.id === urlDoc)) {
            setSelectedDoctorId(urlDoc);
          } else if (data.doctors.length > 0 && !data.doctors.some((d: DoctorProfile) => d.id === selectedDoctorId)) {
            setSelectedDoctorId(data.doctors[0].id);
          }
        }
      });
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    const doctorToBook = doctors.find((d) => d.id === selectedDoctorId);
    if (!doctorToBook) {
      setErrorMessage('Please select an active doctor before booking.');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-queuecare-user-id': currentUser.id,
        },
        credentials: 'include',
        body: JSON.stringify({
          hospitalId: 'hosp-kochi-general-01',
          departmentId: doctorToBook.department_id,
          doctorId: doctorToBook.id,
          patientId: currentUser.id,
          patientName,
          patientPhone,
          appointmentDate,
          slotStartTime,
          notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        router.push(`/appointments/${data.appointment.id}`);
      } else {
        setErrorMessage(data.error || 'Booking failed');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <div className="text-center max-w-xl mx-auto mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('booking.title')}</h1>
        <p className="text-sm text-slate-500 mt-2">
          {t('booking.subtitle')}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 sm:p-8">
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-sm">
          {/* Doctor Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">{t('booking.selectDoctor')}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {doctors.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoctorId(doc.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    selectedDoctorId === doc.id
                      ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{doc.full_name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                      ~{doc.avg_consultation_minutes}m/pt
                    </span>
                  </div>
                  <div className="text-xs text-brand-700 font-medium mt-0.5">{doc.specialization}</div>
                  <div className="text-[11px] text-slate-500 mt-1">{doc.room_number}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Date & Time Slot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">{t('booking.appointmentDate')}</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="date"
                  required
                  value={appointmentDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">{t('booking.selectTimeSlot')}</label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  value={slotStartTime}
                  onChange={(e) => setSlotStartTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot} (OPD Consultation)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Patient Contact Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">{t('register.fullNameLabel')}</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">{t('register.phoneLabel')}</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              {t('booking.reasonNotes')}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('booking.notesPlaceholder')}
              className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
            ></textarea>
          </div>

          {/* Action button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>{t('booking.submitting')}</span>
              ) : (
                <>
                  <span>{t('booking.submitBtn')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BookAppointmentPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 py-16 text-center text-xs text-slate-500">
          Loading appointment booking form...
        </div>
      }
    >
      <BookAppointmentContent />
    </Suspense>
  );
}
