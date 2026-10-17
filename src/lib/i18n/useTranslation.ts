'use client';

import { useAuth } from '@/context/AuthContext';
import { getTranslation, Locale } from './translations';
import { useCallback } from 'react';

export function useTranslation() {
  const { language, setLanguage } = useAuth();

  const t = useCallback(
    (keyPath: string, params?: Record<string, string | number>) => {
      return getTranslation(language as Locale, keyPath, params);
    },
    [language]
  );

  return {
    t,
    language: language as Locale,
    locale: language as Locale,
    setLanguage,
    setLocale: setLanguage,
  };
}
