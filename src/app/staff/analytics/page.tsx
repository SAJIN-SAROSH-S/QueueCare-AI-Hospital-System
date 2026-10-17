'use client';

import React from 'react';
import StaffNav from '@/components/StaffNav';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Clock, TrendingDown, Users, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function StaffAnalyticsPage() {
  const waitTimeByHour = [
    { hour: '08:30', baseline: 25, queuecareAI: 14 },
    { hour: '10:00', baseline: 42, queuecareAI: 22 },
    { hour: '11:30', baseline: 55, queuecareAI: 28 },
    { hour: '13:00', baseline: 20, queuecareAI: 12 },
    { hour: '14:30', baseline: 48, queuecareAI: 26 },
    { hour: '16:00', baseline: 36, queuecareAI: 18 },
  ];

  const throughputByDept = [
    { department: 'Cardiology', served: 38, avgDuration: 17 },
    { department: 'Pediatrics', served: 46, avgDuration: 12 },
    { department: 'Orthopedics', served: 32, avgDuration: 15 },
    { department: 'Gen Medicine', served: 54, avgDuration: 14 },
  ];

  const queueDistribution = [
    { name: 'Completed Consultations', value: 72, color: '#0d9488' },
    { name: 'Waiting in Clinic', value: 18, color: '#f59e0b' },
    { name: 'Rescheduled / Cancelled', value: 7, color: '#94a3b8' },
    { name: 'No-Shows', value: 3, color: '#ef4444' },
  ];

  return (
    <div className="w-full flex-1 flex flex-col bg-slate-50">
      <StaffNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clinical & Operational Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time outpatient throughput, actual waiting time reductions, and clinic capacity utilization.
          </p>
        </div>

        {/* Top Summary Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase">Average Wait Time</div>
            <div className="text-2xl font-black text-slate-900 mt-1">18.4 min</div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">&minus;42% vs Manual OPD</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase">Daily Outpatients</div>
            <div className="text-2xl font-black text-slate-900 mt-1">170 patients</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Across 4 departments</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase">AI Model Accuracy</div>
            <div className="text-2xl font-black text-brand-600 mt-1">2.98 min MAE</div>
            <div className="text-[11px] text-emerald-600 mt-0.5">High Confidence Interval</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase">No-Show Rate</div>
            <div className="text-2xl font-black text-slate-900 mt-1">3.1%</div>
            <div className="text-[11px] text-emerald-600 mt-0.5">Within Kerala clinic targets</div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Wait Time Comparison Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Waiting Time Reduction by Time of Day (Minutes)</h2>
              <p className="text-xs text-slate-400">Baseline unmanaged wait vs QueueCare AI predicted & optimized wait</p>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={waitTimeByHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Line type="monotone" dataKey="baseline" name="Historical Baseline (mins)" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="queuecareAI" name="QueueCare AI Wait (mins)" stroke="#0d9488" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Department Throughput Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Patient Volume by Department Today</h2>
              <p className="text-xs text-slate-400">Consultations served across specialties</p>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={throughputByDept}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="department" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="served" name="Patients Consulted" fill="#0284c7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
