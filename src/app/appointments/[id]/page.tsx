'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { CheckCircle2, Calendar, Clock, MapPin, User, ArrowRight, QrCode, Phone, Sparkles } from 'lucide-react';
import { Appointment } from '@/types/database';

export default function AppointmentConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { currentUser } = useAuth();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetch('/api/appointments', {
      headers: {
        'x-queuecare-user-id': currentUser.id,
      },
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.appointments) {
          const found = data.appointments.find((a: Appointment) => a.id === id);
          if (found) {
            setAppointment(found);
          } else {
            setErrorMessage(`Appointment reference '${id}' not found.`);
          }
        }
      })
      .catch((err) => {
        setErrorMessage(err.message || 'Failed to retrieve appointment details');
      });
  }, [id, currentUser.id]);

  const handleSelfCheckIn = async () => {
    setCheckingIn(true);
    setErrorMessage('');
    try {
      const res = await fetch(`/api/appointments/${id}/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-queuecare-user-id': currentUser.id,
        },
        credentials: 'include',
        body: JSON.stringify({
          actorRole: 'PATIENT',
          actorName: appointment?.patient_name || currentUser.full_name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCheckInSuccess(data.entry.id);
        setTimeout(() => {
          router.push(`/queue/${data.entry.id}`);
        }, 1200);
      } else {
        setErrorMessage(data.error || 'Check-in failed');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Error executing check-in');
    } finally {
      setCheckingIn(false);
    }
  };

  if (errorMessage && !appointment) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center text-sm text-slate-500 space-y-4">
        <p className="text-rose-600 font-semibold">{errorMessage}</p>
        <Link
          href="/patient/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center text-sm text-slate-500">
        Loading appointment details...
      </div>
    );
  }

  // Dynamically resolve doctor profile or graceful fallback
  const doctorName = appointment.doctor?.full_name || 'Assigned Specialist Doctor';
  const doctorRoom = appointment.doctor?.room_number || 'OPD Room';
  const doctorSpec = appointment.doctor?.specialization || appointment.department?.name || 'Clinical Consultation';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 w-full">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Success Header */}
        <div className="bg-gradient-to-br from-brand-600 to-teal-700 text-white p-6 sm:p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur mx-auto flex items-center justify-center text-white mb-3">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Appointment Confirmed!</h1>
          <p className="text-xs text-white/80 mt-1">
            Reference Booking ID: <span className="font-mono font-bold">{appointment.id}</span>
          </p>
        </div>

        {/* Details Card */}
        <div className="p-6 sm:p-8 space-y-6">
          {checkInSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>You are now checked in! Opening your live queue tracker...</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div>
              <div className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Patient</div>
              <div className="font-bold text-slate-900 text-sm mt-0.5">{appointment.patient_name}</div>
              <div className="text-slate-500">{appointment.patient_phone}</div>
            </div>
            <div>
              <div className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Specialist Doctor</div>
              <div className="font-bold text-slate-900 text-sm mt-0.5">{doctorName}</div>
              <div className="text-brand-600 font-medium">
                {doctorRoom} &bull; {doctorSpec}
              </div>
            </div>
            <div>
              <div className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Consultation Date</div>
              <div className="font-bold text-slate-900 text-sm mt-0.5">{appointment.appointment_date}</div>
            </div>
            <div>
              <div className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Slot Time</div>
              <div className="font-bold text-slate-900 text-sm mt-0.5">
                {appointment.slot_start_time} - {appointment.slot_end_time}
              </div>
            </div>
          </div>

          {/* QR Code Simulation & Check-in info */}
          <div className="p-5 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-3 bg-slate-50/50">
            <div className="w-24 h-24 bg-white border border-slate-300 rounded-xl mx-auto flex items-center justify-center text-slate-800 shadow-sm">
              <QrCode className="w-16 h-16 stroke-[1.5]" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Hospital Arrival QR Code</div>
              <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm mx-auto">
                Scan this code at the clinic reception kiosk or show it to our receptionist upon arrival to activate your live queue token.
              </p>
            </div>

            {/* Direct Check-In Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSelfCheckIn}
                disabled={checkingIn || appointment.status === 'CHECKED_IN'}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold text-xs transition shadow-sm"
              >
                {checkingIn ? (
                  <span>Checking in...</span>
                ) : appointment.status === 'CHECKED_IN' ? (
                  <span>Already Checked In</span>
                ) : (
                  <>
                    <span>I Have Arrived &bull; Check In Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
            <Link href="/patient/dashboard" className="text-brand-600 font-bold hover:underline">
              &larr; Return to Patient Portal
            </Link>
            <Link href="/appointments/book" className="text-slate-500 hover:text-slate-900">
              Book Another Visit
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
