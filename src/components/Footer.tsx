'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, MapPin, Phone, Mail, Clock } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-slate-900 text-slate-300 text-sm mt-auto border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center font-bold">
                Q
              </div>
              <span className="font-bold text-lg text-white">{t('common.appName')}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('footer.brandDesc')}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-brand-400 font-medium">
              <Shield className="w-4 h-4 flex-shrink-0" />
              <span>{t('common.verifiedDPDP')}</span>
            </div>
          </div>

          {/* Patient Quick Links */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">{t('footer.forPatients')}</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/hospitals" className="text-slate-400 hover:text-white transition no-underline block">{t('footer.findClinic')}</Link></li>
              <li><Link href="/doctors" className="text-slate-400 hover:text-white transition no-underline block">{t('footer.doctorsTimings')}</Link></li>
              <li><Link href="/appointments/book" className="text-slate-400 hover:text-white transition no-underline block">{t('footer.bookAppointment')}</Link></li>
              <li><Link href="/queue/entry-menon-003" className="text-slate-400 hover:text-white transition no-underline block">{t('footer.liveQueueTracker')}</Link></li>
              <li><Link href="/patient/appointments" className="text-slate-400 hover:text-white transition no-underline block">{t('footer.appointmentHistory')}</Link></li>
              <li><Link href="/patient/settings" className="text-slate-400 hover:text-white transition no-underline block">{t('footer.notificationSettings')}</Link></li>
            </ul>
          </div>

          {/* Hospital Staff Console */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">{t('footer.staffConsole')}</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/staff/dashboard" className="text-slate-400 hover:text-white transition no-underline block">{t('footer.opdDashboard')}</Link></li>
              <li><Link href="/staff/queue" className="text-slate-400 hover:text-white transition no-underline block">{t('footer.liveQueueManager')}</Link></li>
              <li><Link href="/staff/appointments" className="text-slate-400 hover:text-white transition no-underline block">{t('footer.appointmentsCheckin')}</Link></li>
              <li><Link href="/staff/patients" className="text-slate-400 hover:text-white transition no-underline block">{t('footer.walkInRegistration')}</Link></li>
              <li><Link href="/staff/analytics" className="text-slate-400 hover:text-white transition no-underline block">{t('footer.operationalAnalytics')}</Link></li>
              <li><Link href="/admin/audit-logs" className="text-slate-400 hover:text-white transition no-underline block">{t('footer.auditLogs')}</Link></li>
            </ul>
          </div>

          {/* Kerala Clinic Pilot Details */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">{t('footer.clinicContact')}</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-start gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
                <span className="break-words">{t('footer.clinicAddress')}</span>
              </li>
              <li className="flex items-center gap-2 min-w-0">
                <Phone className="w-4 h-4 text-brand-400 flex-shrink-0" />
                <a href="tel:+914842356789" className="hover:text-white transition no-underline truncate">{t('footer.receptionPhone')}</a>
              </li>
              <li className="flex items-center gap-2 min-w-0">
                <Mail className="w-4 h-4 text-brand-400 flex-shrink-0" />
                <a href="mailto:care@keralaclinic.example.com" className="hover:text-white transition no-underline truncate">{t('footer.receptionEmail')}</a>
              </li>
              <li className="flex items-center gap-2 min-w-0">
                <Clock className="w-4 h-4 text-brand-400 flex-shrink-0" />
                <span className="truncate">{t('footer.opdHours')}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Legal & Regulatory Notice */}
        <div className="pt-6 border-t border-slate-800 text-xs text-slate-500 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>
            {t('footer.copyright')}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-slate-400">
            <span className="hover:text-white transition cursor-pointer">{t('footer.privacyPolicy')}</span>
            <span className="hover:text-white transition cursor-pointer">{t('footer.termsOfService')}</span>
            <span className="hover:text-white transition cursor-pointer">{t('footer.emergencyProtocols')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
