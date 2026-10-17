'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { DEMO_PERSONAS, DemoPersona } from '@/lib/auth/demoConfig';
import {
  Activity,
  Mail,
  Lock,
  CheckCircle2,
  ShieldCheck,
  User,
  Stethoscope,
  ClipboardList,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { UserRole } from '@/types/database';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useTranslation();

  // Selected persona state: null if user types manually or deselects
  const [selectedPersona, setSelectedPersona] = useState<DemoPersona | null>(DEMO_PERSONAS[0]);
  const [email, setEmail] = useState<string>(DEMO_PERSONAS[0].email);
  const [password, setPassword] = useState<string>(DEMO_PERSONAS[0].password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState<{ name: string; role: UserRole } | null>(null);

  // Icon mapping
  const iconMap = {
    User,
    Stethoscope,
    ClipboardList,
    ShieldCheck,
  };

  // Helper to sync persona when email changes manually
  const handleEmailChange = (newEmail: string) => {
    setEmail(newEmail);
    setErrorMessage('');
    const matched = DEMO_PERSONAS.find(
      (p) => p.email.toLowerCase() === newEmail.trim().toLowerCase()
    );
    if (matched) {
      setSelectedPersona(matched);
      if (matched.password && !password) {
        setPassword(matched.password);
      }
    } else {
      setSelectedPersona(null);
    }
  };

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword);
    setErrorMessage('');
  };

  // Click on a demo persona card
  const handleSelectPersona = (p: DemoPersona) => {
    if (selectedPersona?.email === p.email) {
      // Toggle off to manual entry
      setSelectedPersona(null);
      setErrorMessage('');
      return;
    }

    setSelectedPersona(p);
    setEmail(p.email);
    setPassword(p.password || '');
    setErrorMessage('');
  };

  // Handle keyboard interaction on persona card
  const handlePersonaKeyDown = (e: React.KeyboardEvent, p: DemoPersona) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelectPersona(p);
    }
  };

  // Genuine authentication submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter an email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter a password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      // Authenticate genuinely through server-backed auth context
      const res = await login(email.trim(), password);

      if (res.success) {
        // Matched persona or derived server-verified identity
        const personaMatch = DEMO_PERSONAS.find(
          (p) => p.email.toLowerCase() === email.trim().toLowerCase()
        );
        const resolvedRole: UserRole = personaMatch?.role || 'PATIENT';
        const resolvedName: string = personaMatch?.name || email.trim();

        setSuccessInfo({ name: resolvedName, role: resolvedRole });

        // Navigate based strictly on server-assigned role
        let targetRoute = '/patient/dashboard';
        if (resolvedRole === 'DOCTOR') {
          targetRoute = '/staff/queue';
        } else if (resolvedRole === 'RECEPTIONIST') {
          targetRoute = '/staff/queue';
        } else if (resolvedRole === 'ADMIN') {
          targetRoute = '/staff/analytics';
        }

        setTimeout(() => {
          router.push(targetRoute);
        }, 800);
      } else {
        setLoading(false);
        setErrorMessage(res.error || 'Authentication failed. Please verify your credentials.');
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err.message || 'An unexpected error occurred during authentication.');
    }
  };

  // Primary button label calculation
  const buttonLabel = selectedPersona
    ? t('login.submitBtnPersona', { name: selectedPersona.name, role: selectedPersona.role })
    : t('login.submitBtnDefault');

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 via-brand-50/25 to-slate-100">
      <div className="max-w-lg w-full space-y-6 bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/60">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-brand-500/25 mb-3">
            <Activity className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('login.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {t('login.subtitle')}
          </p>
        </div>

        {/* Success Feedback Banner */}
        {successInfo && (
          <div
            role="status"
            className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2.5 animate-in fade-in"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <span className="font-bold">Identity verified!</span> Logging in as{' '}
              <strong>
                {successInfo.name} ({successInfo.role})
              </strong>{' '}
              and redirecting to your portal...
            </div>
          </div>
        )}

        {/* Error Feedback Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Demo Persona Selection Cards */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>{t('login.demoAccountsTitle')}</span>
            </label>
            <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
              Demo Mode
            </span>
          </div>

          <div
            className="grid grid-cols-2 gap-2.5"
            role="radiogroup"
            aria-label="Selectable demo personas"
          >
            {DEMO_PERSONAS.map((p) => {
              const Icon = iconMap[p.iconName];
              const isSelected = selectedPersona?.role === p.role;
              return (
                <div
                  key={p.role}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onClick={() => handleSelectPersona(p)}
                  onKeyDown={(e) => handlePersonaKeyDown(e, p)}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer relative flex flex-col justify-between select-none outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    isSelected
                      ? 'border-brand-600 bg-brand-50/70 shadow-sm ring-2 ring-brand-600'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                          isSelected
                            ? 'bg-brand-600 text-white'
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900 leading-tight">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {p.title.split('/')[0]}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-slate-200/60">
                    <span className="text-[10px] font-semibold text-brand-700 uppercase">
                      {p.badge}
                    </span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse motion-reduce:animate-none"></span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Credentials Form */}
        <form className="space-y-4 text-sm" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              {t('login.emailLabel')}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" aria-hidden="true" />
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="name@queuecare.ai"
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs sm:text-sm"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-700"
              >
                {t('login.passwordLabel')}
              </label>
              {selectedPersona && (
                <span className="text-[10px] text-slate-400">
                  Demo credentials auto-filled
                </span>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" aria-hidden="true" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-9 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs sm:text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none p-0.5 rounded"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Unified Primary Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 hover:from-brand-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm tracking-wide uppercase transition shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
                <span>{t('login.signingIn')}</span>
              </>
            ) : (
              <>
                <span>{buttonLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
          <Link href="/hospitals" className="text-slate-500 hover:text-slate-900 transition">
            {t('nav.hospitals')}
          </Link>
          <Link href="/register" className="text-brand-600 font-bold hover:underline transition">
            {t('login.registerLink')}
          </Link>
        </div>
      </div>
    </div>
  );
}
