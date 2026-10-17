'use client';

import React from 'react';
import { AlertTriangle, PhoneCall } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function EmergencyBanner() {
  const { t } = useTranslation();

  return (
    <div className="bg-rose-50 border-b border-rose-200 text-rose-900 text-xs sm:text-sm px-4 py-2 w-full">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
        <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5 sm:mt-0" />
          <span className="leading-snug break-words">
            <strong className="font-semibold">{t('emergencyBanner.title')}</strong> {t('emergencyBanner.message')}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center font-medium pt-1 sm:pt-0">
          <a
            href="tel:108"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition shadow-sm whitespace-nowrap"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>{t('emergencyBanner.callCta')}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
