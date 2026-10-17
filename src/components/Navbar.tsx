'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Activity,
  Calendar,
  Clock,
  ShieldCheck,
  Building2,
  Menu,
  X,
  User,
  ChevronDown,
  Globe,
  LogOut,
  Stethoscope,
  LogIn,
} from 'lucide-react';

import { useTranslation } from '@/lib/i18n/useTranslation';

export default function Navbar() {
  const pathname = usePathname();
  const { currentUser, role, logout, isAuthenticated } = useAuth();
  const { t, language, setLanguage } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isStaff = role === 'DOCTOR' || role === 'RECEPTIONIST' || role === 'ADMIN';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between h-16 w-full gap-2">
          {/* Logo */}
          <div className="flex items-center gap-4 lg:gap-8 min-w-0">
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-teal-400 flex items-center justify-center text-white shadow-sm shadow-brand-500/30 flex-shrink-0">
                <Activity className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 flex items-center gap-1.5 whitespace-nowrap">
                  QueueCare <span className="text-brand-600 font-extrabold text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-brand-50 border border-brand-200 uppercase">AI</span>
                </span>
                <p className="text-[10px] text-slate-500 font-medium -mt-1 hidden sm:block truncate">{t('common.tagline')}</p>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">
              <Link
                href="/hospitals"
                className={`px-3 py-2 rounded-lg transition ${
                  pathname.startsWith('/hospitals')
                    ? 'text-brand-700 bg-brand-50 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {t('nav.hospitals')}
              </Link>
              <Link
                href="/doctors"
                className={`px-3 py-2 rounded-lg transition ${
                  pathname === '/doctors'
                    ? 'text-brand-700 bg-brand-50 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {t('nav.doctors')}
              </Link>
              <Link
                href="/appointments/book"
                className={`px-3 py-2 rounded-lg transition ${
                  pathname === '/appointments/book'
                    ? 'text-brand-700 bg-brand-50 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {t('nav.bookAppointment')}
              </Link>
              <Link
                href="/queue/entry-menon-003"
                className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 ${
                  pathname.startsWith('/queue')
                    ? 'text-brand-700 bg-brand-50 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-4 h-4 text-brand-600 animate-pulse motion-reduce:animate-none" />
                {t('nav.liveTracker')}
              </Link>

              {/* Role-Specific Portal Link */}
              {isAuthenticated && (
                !isStaff ? (
                  <Link
                    href="/patient/dashboard"
                    className={`px-3 py-2 rounded-lg transition ${
                      pathname.startsWith('/patient')
                        ? 'text-brand-700 bg-brand-50 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {t('nav.myDashboard')}
                  </Link>
                ) : (
                  <Link
                    href="/staff/dashboard"
                    className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 ${
                      pathname.startsWith('/staff') || pathname.startsWith('/admin')
                        ? 'bg-teal-50 text-teal-800 font-bold border border-teal-200'
                        : 'text-teal-700 hover:bg-teal-50'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    <span>{t('nav.staffConsole')}</span>
                  </Link>
                )
              )}
            </nav>
          </div>

          {/* Right Controls: Language & Authenticated User Profile */}
          <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
            {/* Segmented Language Switcher indicating active language */}
            <div
              className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold"
              role="group"
              aria-label={t('nav.toggleLanguage')}
            >
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  language === 'en'
                    ? 'bg-white text-brand-700 shadow-sm font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                aria-pressed={language === 'en'}
                title="Switch to English"
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ml')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  language === 'ml'
                    ? 'bg-white text-brand-700 shadow-sm font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                aria-pressed={language === 'ml'}
                title="മലയാളത്തിലേക്ക് മാറ്റുക"
              >
                മലയാളം
              </button>
            </div>

            {isAuthenticated ? (
              /* User Profile Menu (NO identity switcher — Sign Out required to change accounts) */
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition text-xs shadow-sm"
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    role === 'PATIENT' ? 'bg-brand-100 text-brand-700' :
                    role === 'DOCTOR' ? 'bg-blue-100 text-blue-700' :
                    role === 'RECEPTIONIST' ? 'bg-amber-100 text-amber-800' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {currentUser.full_name ? currentUser.full_name[0] : 'U'}
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-slate-900 leading-tight flex items-center gap-1.5">
                      <span>{currentUser.full_name}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                        role === 'PATIENT' ? 'bg-brand-50 text-brand-700 border border-brand-200' :
                        role === 'DOCTOR' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        role === 'RECEPTIONIST' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                        'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {role}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1">
                    {/* Account Header */}
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-xs text-slate-500">Authenticated Account</p>
                      <p className="font-bold text-slate-900 text-sm">{currentUser.full_name}</p>
                      <p className="text-[11px] text-slate-400">{currentUser.email}</p>
                      <div className="mt-1.5">
                        <span className="inline-block text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          Role: {role}
                        </span>
                      </div>
                    </div>

                    {/* Quick Navigation Links */}
                    <div className="py-1 border-b border-slate-100 text-xs">
                      {!isStaff ? (
                        <>
                          <Link
                            href="/patient/dashboard"
                            onClick={() => setUserDropdownOpen(false)}
                            className="px-4 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition"
                          >
                            <User className="w-4 h-4 text-slate-400" />
                            <span>{t('nav.myDashboard')}</span>
                          </Link>
                          <Link
                            href="/patient/appointments"
                            onClick={() => setUserDropdownOpen(false)}
                            className="px-4 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition"
                          >
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span>{t('footer.appointmentHistory')}</span>
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link
                            href="/staff/dashboard"
                            onClick={() => setUserDropdownOpen(false)}
                            className="px-4 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-50 hover:text-teal-600 transition"
                          >
                            <ShieldCheck className="w-4 h-4 text-slate-400" />
                            <span>{t('nav.staffConsole')}</span>
                          </Link>
                          <Link
                            href="/staff/queue"
                            onClick={() => setUserDropdownOpen(false)}
                            className="px-4 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-50 hover:text-teal-600 transition"
                          >
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span>{t('footer.liveQueueManager')}</span>
                          </Link>
                        </>
                      )}
                    </div>

                    {/* Sign Out Action */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                        }}
                        className="w-full text-left px-4 py-2 text-xs flex items-center gap-2 text-rose-600 hover:bg-rose-50 transition font-semibold"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{t('nav.logout')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{t('nav.login')}</span>
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition shadow-sm"
                >
                  <span>{t('login.registerLink')}</span>
                </Link>
              </div>
            )}

            {/* Quick Action Button */}
            <Link
              href="/appointments/book"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition shadow-sm shadow-brand-500/20"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{t('nav.bookAppointment')}</span>
            </Link>
          </div>

          {/* Mobile / Tablet Menu & Language Switcher */}
          <div className="flex lg:hidden items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'ml' : 'en')}
              className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 bg-slate-50 text-brand-700 hover:bg-slate-100 flex items-center gap-1"
              title={language === 'en' ? 'മലയാളത്തിലേക്ക് മാറ്റുക' : 'Switch to English'}
              aria-label="Switch Language"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'ML' : 'EN'}</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-4">
          {/* Mobile Language Switcher */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-medium text-slate-600">Language / ഭാഷ:</span>
            <div className="flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded-md transition ${
                  language === 'en'
                    ? 'bg-white text-brand-700 shadow-sm font-bold'
                    : 'text-slate-500'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ml')}
                className={`px-3 py-1 rounded-md transition ${
                  language === 'ml'
                    ? 'bg-white text-brand-700 shadow-sm font-bold'
                    : 'text-slate-500'
                }`}
              >
                മലയാളം
              </button>
            </div>
          </div>

          {isAuthenticated ? (
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="font-bold text-sm text-slate-900">{currentUser.full_name}</div>
                <div className="text-xs text-slate-500">{currentUser.email} ({role})</div>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="text-xs text-rose-600 font-semibold px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200"
              >
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-800"
              >
                {t('nav.login')}
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 rounded-xl bg-brand-600 text-xs font-semibold text-white"
              >
                {t('login.registerLink')}
              </Link>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs font-medium">
            {isAuthenticated && (
              !isStaff ? (
                <Link
                  href="/patient/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-lg bg-brand-50 border border-brand-200 text-brand-800 font-bold"
                >
                  {t('nav.myDashboard')}
                </Link>
              ) : (
                <Link
                  href="/staff/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 font-bold"
                >
                  {t('nav.staffConsole')}
                </Link>
              )
            )}
            <Link
              href="/queue/entry-menon-003"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-medium"
            >
              {t('nav.liveTracker')}
            </Link>
            <Link
              href="/hospitals"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800"
            >
              {t('nav.hospitals')}
            </Link>
            <Link
              href="/doctors"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800"
            >
              {t('nav.doctors')}
            </Link>
            <Link
              href="/appointments/book"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800"
            >
              {t('nav.bookAppointment')}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
