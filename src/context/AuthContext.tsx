'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole, UserProfile } from '@/types/database';

interface AuthContextType {
  currentUser: UserProfile;
  role: UserRole;
  language: 'en' | 'ml';
  isAuthenticated: boolean;
  setLanguage: (lang: 'en' | 'ml') => void;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

// Trusted database profiles registered for demonstration / offline operation
export const REGISTERED_ACCOUNTS: Record<string, UserProfile> = {
  'patient@queuecare.ai': {
    id: 'user-patient-rahul',
    role: 'PATIENT',
    full_name: 'Rahul Nair',
    email: 'patient@queuecare.ai',
    phone: '+91 98470 77889',
    preferred_language: 'en',
    created_at: '2026-01-01T00:00:00Z',
  },
  'receptionist@queuecare.ai': {
    id: 'user-reception-01',
    role: 'RECEPTIONIST',
    full_name: 'Anjali Pillai',
    email: 'receptionist@queuecare.ai',
    phone: '+91 98470 33445',
    preferred_language: 'en',
    created_at: '2026-01-01T00:00:00Z',
  },
  'doctor@queuecare.ai': {
    id: 'user-doc-menon',
    role: 'DOCTOR',
    full_name: 'Dr. Arvind Menon',
    email: 'doctor@queuecare.ai',
    phone: '+91 98470 55667',
    preferred_language: 'en',
    created_at: '2026-01-01T00:00:00Z',
  },
  'admin@queuecare.ai': {
    id: 'user-admin-01',
    role: 'ADMIN',
    full_name: 'Priya Varma',
    email: 'admin@queuecare.ai',
    phone: '+91 98470 11223',
    preferred_language: 'en',
    created_at: '2026-01-01T00:00:00Z',
  },
};

const DEFAULT_UNAUTHENTICATED: UserProfile = {
  id: '',
  role: 'PATIENT',
  full_name: 'Guest User',
  email: '',
  phone: '',
  preferred_language: 'en',
  created_at: '',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getSessionCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )queuecare_demo_user=([^;]+)'));
  return match ? match[2] : null;
}

function setSessionCookie(userId: string) {
  if (typeof document !== 'undefined') {
    document.cookie = `queuecare_demo_user=${userId}; path=/; max-age=604800; SameSite=Lax`;
  }
}

function clearSessionCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = 'queuecare_demo_user=; path=/; max-age=0; SameSite=Lax';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile>(REGISTERED_ACCOUNTS['patient@queuecare.ai']);
  const [language, setLanguageState] = useState<'en' | 'ml'>('en');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  // Sync language with localStorage and html lang attribute
  const setLanguage = useCallback((lang: 'en' | 'ml') => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('queuecare_lang', lang);
      document.documentElement.lang = lang;
    }
  }, []);

  // Validate session against trusted database records on initial load and load saved language
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 1. Load saved language preference
      const savedLang = localStorage.getItem('queuecare_lang') as 'en' | 'ml' | null;
      if (savedLang === 'en' || savedLang === 'ml') {
        setLanguageState(savedLang);
        document.documentElement.lang = savedLang;
      } else {
        document.documentElement.lang = 'en';
      }

      const activeCookieUserId = getSessionCookie();

      if (activeCookieUserId) {
        // Look up by trusted user ID — NEVER trust client-modified role in localStorage
        const trustedAccount = Object.values(REGISTERED_ACCOUNTS).find(
          (u) => u.id === activeCookieUserId
        );
        if (trustedAccount) {
          setCurrentUser(trustedAccount);
          setIsAuthenticated(true);
          // Sync localStorage strictly with trusted database record
          localStorage.setItem('queuecare_active_user', JSON.stringify(trustedAccount));
          return;
        }
      }

      // Check saved storage as fallback, but sanitize against trusted accounts
      const saved = localStorage.getItem('queuecare_active_user');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const trusted = Object.values(REGISTERED_ACCOUNTS).find((u) => u.id === parsed.id);
          if (trusted) {
            // Re-enforce real database role even if localStorage role was tampered with
            setCurrentUser(trusted);
            setIsAuthenticated(true);
            setSessionCookie(trusted.id);
            return;
          }
        } catch {}
      }

      // Default demo initial state: authenticated as Patient Rahul Nair
      const defaultUser = REGISTERED_ACCOUNTS['patient@queuecare.ai'];
      setCurrentUser(defaultUser);
      setIsAuthenticated(true);
      setSessionCookie(defaultUser.id);
    }
  }, []);

  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    const normalized = email.trim().toLowerCase();
    const matchedAccount = REGISTERED_ACCOUNTS[normalized];

    if (!matchedAccount) {
      return { success: false, error: 'Account not found. Please check your email address.' };
    }

    // Authenticate and set session strictly from trusted database record
    setCurrentUser(matchedAccount);
    setIsAuthenticated(true);
    setSessionCookie(matchedAccount.id);

    if (typeof window !== 'undefined') {
      localStorage.setItem('queuecare_active_user', JSON.stringify(matchedAccount));
    }

    // Role-based routing upon successful authentication
    if (matchedAccount.role === 'PATIENT') {
      router.push('/patient/dashboard');
    } else {
      router.push('/staff/dashboard');
    }

    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(DEFAULT_UNAUTHENTICATED);
    clearSessionCookie();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('queuecare_active_user');
    }
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser.role,
        language,
        isAuthenticated,
        setLanguage,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
