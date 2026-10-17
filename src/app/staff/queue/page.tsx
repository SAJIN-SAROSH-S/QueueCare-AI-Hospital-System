'use client';

import React, { useState, useEffect } from 'react';
import StaffNav from '@/components/StaffNav';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n/useTranslation';
import {
  Users,
  Play,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Clock,
  RefreshCw,
  Search,
  Filter,
  AlertTriangle,
  Stethoscope,
  ShieldAlert,
} from 'lucide-react';
import { QueueEntry, DoctorProfile, QueueEntryStatus, PriorityLevel } from '@/types/database';

export default function StaffQueuePage() {
  const { role, currentUser } = useAuth();
  const { t } = useTranslation();
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('doc-menon-cardio');
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Modal states for triage override & confirmation
  const [triageModalEntry, setTriageModalEntry] = useState<QueueEntry | null>(null);
  const [triagePriority, setTriagePriority] = useState<PriorityLevel>('EMERGENCY_OVERRIDE');
  const [triageReason, setTriageReason] = useState('');

  const [confirmModal, setConfirmModal] = useState<{
    entry: QueueEntry;
    action: QueueEntryStatus;
    title: string;
    description: string;
  } | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/queue?hospitalId=hosp-kochi-general-01&doctorId=${selectedDoctorId}`, {
        headers: {
          'x-queuecare-user-id': currentUser.id,
        },
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setEntries(data.entries || []);
        if (data.doctors) {
          setDoctors(data.doctors);
          if (role === 'DOCTOR') {
            const myDoc = data.doctors.find((d: DoctorProfile) => d.user_id === currentUser.id);
            if (myDoc && selectedDoctorId !== myDoc.id) {
              setSelectedDoctorId(myDoc.id);
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [selectedDoctorId, currentUser?.id, role]);

  const updateStatus = async (queueEntryId: string, targetStatus: QueueEntryStatus) => {
    try {
      const res = await fetch(`/api/queue/${queueEntryId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-queuecare-user-id': currentUser.id,
        },
        credentials: 'include',
        body: JSON.stringify({
          targetStatus,
          actorName: currentUser.full_name,
          actorRole: role,
          actorId: currentUser.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActionMessage(data.message);
        setTimeout(() => setActionMessage(null), 3500);
        fetchQueue();
      } else {
        alert(data.error || 'Failed to update status');
      }
    } catch (e: any) {
      alert(e.message || 'Error executing transition');
    }
  };

  const handleTriageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!triageModalEntry) return;

    try {
      const res = await fetch(`/api/queue/${triageModalEntry.id}/triage`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-queuecare-user-id': currentUser.id,
        },
        credentials: 'include',
        body: JSON.stringify({
          priority: triagePriority,
          reason: triageReason,
          actorName: currentUser.full_name,
          actorRole: role,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActionMessage(`Triage priority updated for ${triageModalEntry.display_ticket}`);
        setTriageModalEntry(null);
        setTriageReason('');
        setTimeout(() => setActionMessage(null), 3500);
        fetchQueue();
      } else {
        alert(data.error || 'Triage override failed');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const activeConsultation = entries.find((e) => e.status === 'IN_CONSULTATION');
  const waitingPatients = entries
    .filter((e) => e.status === 'WAITING' || e.status === 'CHECKED_IN')
    .sort((a, b) => a.position_in_queue - b.position_in_queue);
  const completedOrPast = entries.filter(
    (e) => e.status === 'COMPLETED' || e.status === 'CANCELLED' || e.status === 'NO_SHOW'
  );

  return (
    <div className="w-full flex-1 flex flex-col bg-slate-50">
      <StaffNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Header & Doctor Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('staffQueue.title')}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('staffQueue.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedDoctorId}
              disabled={role === 'DOCTOR'}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="p-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold text-slate-800 shadow-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              {doctors.length > 0 ? (
                doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} ({d.specialization.split(' ')[0]} - {d.room_number})
                  </option>
                ))
              ) : (
                <>
                  <option value="doc-menon-cardio">Dr. Arvind Menon (Cardiology - Room 102)</option>
                  <option value="doc-nair-pediatrics">Dr. Sneha Nair (Pediatrics - Room 104)</option>
                  <option value="doc-kurian-ortho">Dr. Mathews Kurian (Orthopedics - Room 108)</option>
                  <option value="doc-thomas-genmed">Dr. Lakshmi Thomas (Gen Medicine - Room 101)</option>
                </>
              )}
            </select>

            <button
              onClick={fetchQueue}
              className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition shadow-sm"
              title={t('common.refresh')}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {actionMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Active Consultation Hero Card */}
        <div className="bg-white rounded-2xl border-2 border-brand-500 shadow-lg p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none"></span>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                {t('staffDashboard.activeConsultationTitle')}
              </h2>
            </div>
            <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
              {t('home.liveToken')}
            </span>
          </div>

          {activeConsultation ? (
            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-brand-600 text-white flex items-center justify-center text-2xl font-black shadow-md shadow-brand-500/20">
                  {activeConsultation.display_ticket}
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-900">{activeConsultation.patient_name}</div>
                  <div className="text-xs text-slate-500">Phone: {activeConsultation.patient_phone}</div>
                  <div className="text-xs text-brand-700 mt-1 font-medium">
                    Started: {new Date(activeConsultation.consultation_started_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Doctor Consultation Controls */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => updateStatus(activeConsultation.id, 'COMPLETED')}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Consultation</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500 space-y-3">
              <p>No patient is currently in consultation with this doctor.</p>
              {waitingPatients.length > 0 && (
                <button
                  onClick={() => updateStatus(waitingPatients[0].id, 'IN_CONSULTATION')}
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition inline-flex items-center gap-1.5"
                >
                  <Play className="w-4 h-4" />
                  <span>Call Next Patient: {waitingPatients[0].patient_name} ({waitingPatients[0].display_ticket})</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Waiting Queue Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Waiting Queue ({waitingPatients.length} Patients)</h2>
              <p className="text-xs text-slate-500">Sequence determined by FIFO arrival and emergency triage flags</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Pos</th>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Est. Wait</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {waitingPatients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Waiting queue is empty.
                    </td>
                  </tr>
                ) : (
                  waitingPatients.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">#{entry.position_in_queue}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                          {entry.display_ticket}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{entry.patient_name}</div>
                        <div className="text-[11px] text-slate-400">{entry.patient_phone}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            entry.priority === 'EMERGENCY_OVERRIDE'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                              : entry.priority === 'URGENT'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {entry.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        {entry.wait_time_lower_bound}–{entry.wait_time_upper_bound} mins
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => updateStatus(entry.id, 'IN_CONSULTATION')}
                          className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-[11px] transition"
                        >
                          Start Consultation
                        </button>
                        <button
                          onClick={() => setTriageModalEntry(entry)}
                          className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] border border-rose-200 transition"
                          title="Urgent Triage Bypass"
                        >
                          Triage
                        </button>
                        <button
                          onClick={() =>
                            setConfirmModal({
                              entry,
                              action: 'NO_SHOW',
                              title: 'Mark as No-Show?',
                              description: `Marking ${entry.patient_name} (${entry.display_ticket}) as No-Show after grace period elapsed.`,
                            })
                          }
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-[11px] transition"
                        >
                          No-Show
                        </button>
                        <button
                          onClick={() =>
                            setConfirmModal({
                              entry,
                              action: 'CANCELLED',
                              title: 'Cancel Queue Token?',
                              description: `Cancel token ${entry.display_ticket} for patient ${entry.patient_name}?`,
                            })
                          }
                          className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-[11px] transition"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Completed Consultations Today */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h3 className="font-bold text-slate-900 text-sm">Completed / Inactive Today ({completedOrPast.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {completedOrPast.map((p) => (
              <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">{p.patient_name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{p.display_ticket}</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  p.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Triage Override Modal */}
      {triageModalEntry && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="font-bold text-slate-900 text-base">Emergency Triage Override</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Clinical priority override moves <strong>{triageModalEntry.patient_name}</strong> ({triageModalEntry.display_ticket}) ahead of ordinary queue order.
            </p>

            <form onSubmit={handleTriageSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Priority Classification</label>
                <select
                  value={triagePriority}
                  onChange={(e) => setTriagePriority(e.target.value as PriorityLevel)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="EMERGENCY_OVERRIDE">EMERGENCY OVERRIDE (Immediate Next)</option>
                  <option value="URGENT">URGENT (Accelerated Priority)</option>
                  <option value="NORMAL">NORMAL (Standard FIFO)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Clinical Justification (For Audit Log)</label>
                <textarea
                  required
                  rows={3}
                  value={triageReason}
                  onChange={(e) => setTriageReason(e.target.value)}
                  placeholder="e.g. Severe hypertensive emergency, clinical observation ordered by triage doctor."
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTriageModalEntry(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  Confirm Triage Bypass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">{confirmModal.title}</h3>
            <p className="text-xs text-slate-600">{confirmModal.description}</p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                No, Keep
              </button>
              <button
                onClick={() => {
                  updateStatus(confirmModal.entry.id, confirmModal.action);
                  setConfirmModal(null);
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
