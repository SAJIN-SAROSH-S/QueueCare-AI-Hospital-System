'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { Bell, Globe, CheckCircle2, Lock } from 'lucide-react';

export default function PatientSettingsPage() {
  const { currentUser } = useAuth();
  const { t, language, setLanguage } = useTranslation();
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [turnThreshold, setTurnThreshold] = useState(2);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('settings.title')}</h1>
        <p className="text-xs text-slate-500 mt-1">
          {t('settings.subtitle')}
        </p>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{t('common.saved')}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-sm">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 text-sm">{t('settings.personalInfo')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">{t('settings.fullName')}</label>
              <input
                type="text"
                disabled
                value={currentUser.full_name}
                className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">{t('settings.registeredPhone')}</label>
              <input
                type="text"
                disabled
                value={currentUser.phone}
                className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Language Preference */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
          <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand-600" />
            <span>{t('settings.languagePreferences')}</span>
          </h2>
          <p className="text-xs text-slate-500">{t('settings.languageDesc')}</p>
          <div className="grid grid-cols-2 gap-3 max-w-sm pt-1">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`py-2 px-3 text-xs font-semibold rounded-xl border transition ${
                language === 'en'
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLanguage('ml')}
              className={`py-2 px-3 text-xs font-semibold rounded-xl border transition ${
                language === 'ml'
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              മലയാളം (Malayalam)
            </button>
          </div>
        </div>

        {/* Turn Notifications */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Bell className="w-4 h-4 text-brand-600" />
            <span>{t('settings.notificationChannels')}</span>
          </h2>

          <div className="space-y-3 text-xs text-slate-700">
            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
              <div>
                <span className="font-medium">{t('settings.smsAlerts')}</span>
                <p className="text-[11px] text-slate-500">{t('settings.smsDesc')}</p>
              </div>
              <input
                type="checkbox"
                checked={smsEnabled}
                onChange={(e) => setSmsEnabled(e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
              <div>
                <span className="font-medium">{t('settings.whatsappAlerts')}</span>
                <p className="text-[11px] text-slate-500">{t('settings.whatsappDesc')}</p>
              </div>
              <input
                type="checkbox"
                checked={whatsappEnabled}
                onChange={(e) => setWhatsappEnabled(e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
              <div>
                <span className="font-medium">{t('settings.emailAlerts')}</span>
                <p className="text-[11px] text-slate-500">{t('settings.emailDesc')}</p>
              </div>
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded"
              />
            </label>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('settings.turnThreshold')}
              </label>
              <select
                value={turnThreshold}
                onChange={(e) => setTurnThreshold(Number(e.target.value))}
                className="p-2 border border-slate-200 rounded-lg text-xs"
              >
                <option value={1}>1 patient ahead (Immediate notice)</option>
                <option value={2}>2 patients ahead (Recommended, ~20-30 mins)</option>
                <option value={3}>3 patients ahead (~40 mins)</option>
              </select>
            </div>
          </div>
        </div>

        {/* DPDP Act Privacy Notice */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 text-xs text-slate-600 space-y-2">
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-brand-600" />
            <span>Digital Personal Data Protection (India) Compliance</span>
          </div>
          <p className="leading-relaxed">
            QueueCare AI only collects data strictly necessary to run the outpatient clinic queue. Medical diagnoses and prescription specifics are not exposed on public token boards or stored in the operational queue log.
          </p>
        </div>

        <div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs tracking-wide uppercase transition shadow-md shadow-brand-500/20"
          >
            {t('settings.saveBtn')}
          </button>
        </div>
      </form>
    </div>
  );
}
