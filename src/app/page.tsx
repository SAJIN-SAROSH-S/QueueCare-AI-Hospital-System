'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Clock,
  Users,
  ShieldCheck,
  Calendar,
  Sparkles,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { translations } from '@/lib/i18n/translations';

export default function LandingPage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const { t, language } = useTranslation();

  const currentFaqs = translations[language]?.home?.faqList || translations.en.home.faqList;

  return (
    <div className="flex flex-col flex-1">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/70 via-white to-slate-50 border-b border-slate-200 py-10 sm:py-20 lg:py-24 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
            {/* Left Column: Headlines & CTA */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-6 text-center lg:text-left min-w-0 w-full">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-100/80 border border-brand-200 text-brand-800 text-xs font-semibold max-w-full">
                <Sparkles className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                <span className="truncate">{t('home.badge')}</span>
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight sm:leading-[1.15] break-words">
                {t('home.heroTitle1')}{' '}
                <span className="block sm:inline text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-teal-700 break-words">
                  {t('home.heroTitle2')}
                </span>
              </h1>

              <p className="text-sm sm:text-base lg:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed break-words">
                {t('home.heroSubtitle')}
              </p>

              {/* Call to Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 pt-2 w-full max-w-md lg:max-w-none mx-auto lg:mx-0">
                <Link
                  href="/appointments/book"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40"
                >
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>{t('home.bookCta')}</span>
                  <ArrowRight className="w-4 h-4 flex-shrink-0" />
                </Link>

                <Link
                  href="/queue/entry-menon-003"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm border border-slate-300 transition shadow-sm"
                >
                  <Clock className="w-4 h-4 text-brand-600 flex-shrink-0" />
                  <span>{t('home.trackCta')}</span>
                </Link>

                <Link
                  href="/staff/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-teal-800 bg-teal-50/60 hover:bg-teal-50 sm:bg-transparent border border-teal-200 sm:border-transparent text-sm font-medium transition"
                >
                  <ShieldCheck className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  <span>{t('nav.staffConsole')}</span>
                </Link>
              </div>

              {/* Trust badges */}
              <div className="pt-4 grid grid-cols-3 gap-2 sm:gap-4 border-t border-slate-200/60 max-w-lg mx-auto lg:mx-0 w-full">
                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/80 sm:bg-transparent text-center sm:text-left min-w-0">
                  <div className="text-xl sm:text-2xl font-bold text-slate-900">42%</div>
                  <div className="text-[10px] sm:text-xs text-slate-500 leading-tight break-words">{t('home.waitReduction')}</div>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/80 sm:bg-transparent text-center sm:text-left min-w-0">
                  <div className="text-xl sm:text-2xl font-bold text-slate-900">&plusmn;4 min</div>
                  <div className="text-[10px] sm:text-xs text-slate-500 leading-tight break-words">{t('home.estimationMae')}</div>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/80 sm:bg-transparent text-center sm:text-left min-w-0">
                  <div className="text-xl sm:text-2xl font-bold text-slate-900">100%</div>
                  <div className="text-[10px] sm:text-xs text-slate-500 leading-tight break-words">{t('home.mobileFriendly')}</div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Interactive Preview Card */}
            <div className="lg:col-span-5 w-full">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-4 sm:p-6 lg:p-7 relative w-full overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-700 font-bold flex-shrink-0 text-sm">
                      CAR
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wide truncate">{t('home.liveToken')}</div>
                      <div className="text-base sm:text-lg font-bold text-slate-900">CAR-003</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 flex-shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none"></span>
                    {t('home.queueActive')}
                  </span>
                </div>

                <div className="py-4 sm:py-5 space-y-3.5 sm:space-y-4">
                  {/* Doctor Info */}
                  <div className="flex flex-wrap items-start justify-between gap-2 bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-100">
                    <div className="min-w-0">
                      <div className="text-[11px] sm:text-xs text-slate-500">{t('home.doctorOnDuty')}</div>
                      <div className="text-sm font-bold text-slate-900">Dr. Arvind Menon</div>
                      <div className="text-[11px] sm:text-xs text-slate-500">Cardiology &bull; Room 102</div>
                    </div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-teal-100 text-teal-800 flex-shrink-0">
                      {t('home.inClinic')}
                    </span>
                  </div>

                  {/* Estimation Dial */}
                  <div className="bg-gradient-to-br from-brand-50 to-teal-50/50 p-3.5 sm:p-4 rounded-xl border border-brand-100 text-center">
                    <div className="text-[11px] sm:text-xs font-medium text-brand-800 uppercase tracking-wider mb-1">
                      {t('home.estimatedWaitTime')}
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-brand-900">
                      7 – 15 <span className="text-sm sm:text-base font-semibold text-brand-700">{t('common.minutes')}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {t('home.patientAheadNotice')}
                    </p>
                  </div>

                  {/* Queue Stats Matrix */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 text-center">
                    <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-100 min-w-0">
                      <div className="text-[10px] sm:text-xs text-slate-500 truncate">{t('home.yourPosition')}</div>
                      <div className="text-lg sm:text-xl font-bold text-slate-900">{t('home.positionValue')}</div>
                    </div>
                    <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-100 min-w-0">
                      <div className="text-[10px] sm:text-xs text-slate-500 truncate">{t('home.estimatedTurn')}</div>
                      <div className="text-lg sm:text-xl font-bold text-slate-900">{t('home.turnTime')}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-1 sm:pt-2">
                  <Link
                    href="/queue/entry-menon-003"
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
                  >
                    <span>{t('home.openFullTracker')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold text-brand-600 uppercase tracking-wider">{t('home.featuresHeading')}</h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              {t('home.featuresSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{t('home.feature1Title')}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('home.feature1Desc')}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{t('home.feature2Title')}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('home.feature2Desc')}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{t('home.feature3Title')}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('home.feature3Desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-bold text-brand-600 uppercase tracking-wider">{t('home.journeyHeading')}</h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              {t('home.journeySubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-brand-600 text-white font-bold flex items-center justify-center mb-3">
                1
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">{t('home.step1Title')}</h4>
              <p className="text-xs text-slate-600">{t('home.step1Desc')}</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-brand-600 text-white font-bold flex items-center justify-center mb-3">
                2
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">{t('home.step2Title')}</h4>
              <p className="text-xs text-slate-600">{t('home.step2Desc')}</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-brand-600 text-white font-bold flex items-center justify-center mb-3">
                3
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">{t('home.step3Title')}</h4>
              <p className="text-xs text-slate-600">{t('home.step3Desc')}</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-brand-600 text-white font-bold flex items-center justify-center mb-3">
                4
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">{t('home.step4Title')}</h4>
              <p className="text-xs text-slate-600">{t('home.step4Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-xs font-bold text-brand-600 uppercase tracking-wider">{t('home.faqHeading')}</h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">{t('home.faqSubtitle')}</p>
          </div>

          <div className="space-y-3">
            {currentFaqs.map((faq: { q: string; a: string }, index: number) => (
              <div key={index} className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setFaqOpen(faqOpen === index ? null : index)}
                  className="w-full flex items-center justify-between p-4 text-left font-semibold text-slate-900 hover:bg-slate-50 transition text-sm sm:text-base appearance-none bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 transition-transform ${
                      faqOpen === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {faqOpen === index && (
                  <div className="px-4 pb-4 pt-1 text-sm text-slate-600 bg-slate-50/50 border-t border-slate-100">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
