'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import {
  Clock,
  Sparkles,
  RefreshCw,
  Bell,
  AlertTriangle,
  Stethoscope,
} from 'lucide-react';
import { QueueEntry, DoctorProfile } from '@/types/database';

export default function QueueTrackingPage() {
  const params = useParams();
  const id = params.id as string;
  const { t } = useTranslation();
  const [entry, setEntry] = useState<QueueEntry | null>(null);
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const fetchQueueData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    setNetworkError(null);
    try {
      const res = await fetch(`/api/queue?hospitalId=hosp-kochi-general-01&_t=${Date.now()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.success && data.entries) {
        const found = data.entries.find((e: QueueEntry) => e.id === id || e.display_ticket === id);
        if (found) {
          setEntry(found);
          const docFound = data.doctors?.find((d: DoctorProfile) => d.id === found.doctor_id);
          setDoctor(docFound || null);
        } else {
          setEntry(null);
          setDoctor(null);
        }
      }
    } catch (e: any) {
      console.error(e);
      setNetworkError(t('common.networkError'));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      setLastRefreshed(new Date());
    }
  };

  useEffect(() => {
    let isMounted = true;

    const runFetch = async () => {
      if (!isMounted) return;
      await fetchQueueData(false);
    };

    runFetch();

    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      // 5-second polling with safe unmount cleanup
      interval = setInterval(() => {
        if (isMounted) fetchQueueData(false);
      }, 5000);
    }

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [id, autoRefresh]);

  if (loading && !entry) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center text-slate-500 text-sm">
        <RefreshCw className="w-6 h-6 animate-spin motion-reduce:animate-none mx-auto text-brand-600 mb-2" />
        <span>{t('queueTracking.connectingServer')}</span>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center text-slate-500 text-sm space-y-4">
        <div className="text-slate-900 font-bold text-base">{t('queueTracking.ticketNotFound')}</div>
        <p className="text-xs text-slate-500">
          {t('queueTracking.ticketNotFoundDesc', { id })}
        </p>
        <Link
          href="/patient/dashboard"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
        >
          {t('queueTracking.returnDashboard')}
        </Link>
      </div>
    );
  }

  const isApproaching = entry.position_in_queue <= 2;
  const docName = doctor?.full_name || t('queueTracking.assignedDoctor');
  const docRoom = doctor?.room_number || 'OPD Room';
  const docSpec = doctor?.specialization || 'Clinical Specialist';
  const docPace = doctor?.avg_consultation_minutes ? `~${doctor.avg_consultation_minutes}m` : '~15m';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 w-full space-y-6">
      {/* Top Status & Controls */}
      <div className="flex items-center justify-between">
        <Link href="/patient/dashboard" className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition">
          {t('queueTracking.backToDashboard')}
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400">
            Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <button
            onClick={() => fetchQueueData(true)}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition shadow-sm"
            title={t('common.refresh')}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin motion-reduce:animate-none' : ''}`} />
          </button>
        </div>
      </div>

      {networkError && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center justify-between">
          <span>{networkError}</span>
          <button
            onClick={() => fetchQueueData(true)}
            className="underline font-bold"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Approaching Turn Banner */}
      {isApproaching && entry.status === 'WAITING' && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-amber-900 flex items-center gap-3 animate-pulse motion-reduce:animate-none">
          <Bell className="w-6 h-6 text-amber-600 flex-shrink-0" />
          <div className="text-xs sm:text-sm">
            {t('queueTracking.approachingAlert', { position: entry.position_in_queue, room: docRoom })}
          </div>
        </div>
      )}

      {/* Main Ticket Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Ticket Header */}
        <div className="bg-gradient-to-r from-brand-600 to-teal-700 text-white p-6 sm:p-8 text-center relative">
          <span className="text-xs font-bold uppercase tracking-wider text-white/80">
            {t('queueTracking.clinicHeader')}
          </span>
          <div className="text-5xl sm:text-6xl font-black tracking-tight my-2">{entry.display_ticket}</div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping motion-reduce:animate-none"></span>
            <span>{t('patientDashboard.statusLabel', { status: entry.status })}</span>
          </div>
        </div>

        {/* Prediction & Metrics Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Estimated Waiting Time Hero */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              {t('queueTracking.estimatedWaitingTime')}
            </div>
            <div className="text-4xl sm:text-5xl font-extrabold text-slate-900">
              {entry.wait_time_lower_bound} – {entry.wait_time_upper_bound} <span className="text-lg font-semibold text-slate-500">{t('queueTracking.minutesUnit')}</span>
            </div>

            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('queueTracking.aiEngineBadge')}</span>
            </div>

            <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
              {t('queueTracking.dynamicNote')}
            </p>
          </div>

          {/* Real-time Position & Queue Metrics */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-[11px] text-slate-400 font-semibold uppercase">{t('queueTracking.yourPosition')}</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">#{entry.position_in_queue}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {entry.position_in_queue === 1
                  ? t('queueTracking.nextUp')
                  : t('patientDashboard.aheadOfYou', { count: entry.position_in_queue - 1 })}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-[11px] text-slate-400 font-semibold uppercase">{t('queueTracking.doctorPace')}</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{docPace}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{t('queueTracking.historicalAvg')}</div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-[11px] text-slate-400 font-semibold uppercase">{t('queueTracking.clinicDelay')}</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{t('common.onTime')}</div>
              <div className="text-[10px] text-emerald-600 mt-0.5">{t('common.variance')}</div>
            </div>
          </div>

          {/* Doctor on Duty Details */}
          <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">{docName}</div>
                <div className="text-slate-600">
                  {docSpec} &bull; {docRoom}
                </div>
              </div>
            </div>
            <span className={`font-bold px-2.5 py-1 rounded-md border ${
              doctor?.is_available !== false
                ? 'text-emerald-700 bg-white border-emerald-200'
                : 'text-rose-700 bg-white border-rose-200'
            }`}>
              {doctor?.is_available !== false ? t('queueTracking.doctorPresent') : t('queueTracking.doctorAway')}
            </span>
          </div>

          {/* Emergency Safety Notice */}
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>{t('queueTracking.medicalDisclaimerTitle')}</strong> {t('queueTracking.medicalDisclaimer')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
