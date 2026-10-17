'use client';

import React, { useState, useEffect } from 'react';
import StaffNav from '@/components/StaffNav';
import { Building2, Clock, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Department } from '@/types/database';

export default function StaffDepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    fetch('/api/hospitals?id=hosp-kochi-general-01')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDepartments(data.departments);
        }
      });
  }, []);

  return (
    <div className="w-full flex-1 flex flex-col bg-slate-50">
      <StaffNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">OPD Departments & Consultation Standards</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure default consultation intervals and active specialty clinics.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {departments.map((dept) => (
            <div key={dept.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded border border-teal-200">
                    {dept.code}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Active
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base">{dept.name}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{dept.description}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-600" />
                  <span>Standard Duration:</span>
                </span>
                <span className="font-bold text-slate-900">{dept.default_consultation_duration} mins</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
