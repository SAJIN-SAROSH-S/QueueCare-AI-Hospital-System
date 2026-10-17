'use client';

import React, { useState } from 'react';
import StaffNav from '@/components/StaffNav';
import { Settings, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function StaffSettingsPage() {
  const [openingTime, setOpeningTime] = useState('08:30');
  const [closingTime, setClosingTime] = useState('18:00');
  const [gracePeriod, setGracePeriod] = useState(30);
  const [turnAlertThreshold, setTurnAlertThreshold] = useState(2);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-slate-50">
      <StaffNav />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clinic Operational Configuration</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure outpatient hours, no-show grace rules, and automated turn dispatch thresholds.
          </p>
        </div>

        {saved && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Clinic operational policies updated!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6 text-xs">
          {/* Operating Hours */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              <span>OPD Operating Hours (Kochi Care Polyclinic)</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Clinic Opening Time</label>
                <input
                  type="time"
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Clinic Closing Time</label>
                <input
                  type="time"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Queue & No-Show Policies */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Queue Scheduling & Grace Policies</span>
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  No-Show Grace Period (Minutes)
                </label>
                <p className="text-[11px] text-slate-400 mb-1">
                  Grace period allowed before reception staff may mark a non-arrived patient as No-Show.
                </p>
                <input
                  type="number"
                  min={10}
                  max={120}
                  value={gracePeriod}
                  onChange={(e) => setGracePeriod(Number(e.target.value))}
                  className="w-32 p-2 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div className="pt-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Turn Dispatch Threshold (Patients Ahead)
                </label>
                <p className="text-[11px] text-slate-400 mb-1">
                  Trigger automated turn-approaching SMS/In-App notifications when this many patients are ahead in line.
                </p>
                <select
                  value={turnAlertThreshold}
                  onChange={(e) => setTurnAlertThreshold(Number(e.target.value))}
                  className="w-48 p-2 border border-slate-200 rounded-xl bg-white font-medium"
                >
                  <option value={1}>1 patient ahead</option>
                  <option value={2}>2 patients ahead (Default)</option>
                  <option value={3}>3 patients ahead</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="py-3 px-6 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider transition shadow-md shadow-teal-700/20"
            >
              Save Clinic Policies
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
