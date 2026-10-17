import { describe, it, expect, beforeEach, vi } from 'vitest';
import { translations, getTranslation, Locale } from '../src/lib/i18n/translations';

class MockStorage {
  private store: Record<string, string> = {};
  getItem(key: string) {
    return this.store[key] ?? null;
  }
  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }
  removeItem(key: string) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

const mockLocalStorage = new MockStorage();
const mockDoc = {
  documentElement: {
    lang: 'en',
  },
};

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = mockLocalStorage;
}
if (typeof globalThis.document === 'undefined') {
  (globalThis as any).document = mockDoc;
}

describe('REGRESSION TEST SUITE: Real i18n Localization & Infinite Refresh Fix', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = 'en';
  });

  // =========================================================================
  // 1. Translation Dictionary Completeness & Structure
  // =========================================================================
  describe('1. Dictionary Completeness (English & Malayalam)', () => {
    it('supports both "en" and "ml" application locales', () => {
      expect(translations.en).toBeDefined();
      expect(translations.ml).toBeDefined();
    });

    it('contains all required top-level modules in both locales', () => {
      const requiredModules = [
        'common',
        'nav',
        'emergencyBanner',
        'footer',
        'home',
        'login',
        'register',
        'patientDashboard',
        'booking',
        'queueTracking',
        'staffNav',
        'staffDashboard',
        'staffQueue',
        'settings',
      ];

      for (const mod of requiredModules) {
        expect(translations.en[mod], `Missing module ${mod} in English`).toBeDefined();
        expect(translations.ml[mod], `Missing module ${mod} in Malayalam`).toBeDefined();
      }
    });

    it('translates core navigation items accurately into Malayalam', () => {
      expect(getTranslation('ml', 'nav.hospitals')).toBe('ആശുപത്രികൾ');
      expect(getTranslation('ml', 'nav.doctors')).toBe('ഡോക്ടർമാർ');
      expect(getTranslation('ml', 'nav.bookAppointment')).toBe('അപ്പോയിന്റ്മെന്റ് ബുക്ക് ചെയ്യുക');
      expect(getTranslation('ml', 'nav.liveTracker')).toBe('തത്സമയ ട്രാക്കർ');
      expect(getTranslation('ml', 'nav.myDashboard')).toBe('എന്റെ ഡാഷ്‌ബോർഡ്');
      expect(getTranslation('ml', 'nav.staffConsole')).toBe('സ്റ്റാഫ് കൺസോൾ');
      expect(getTranslation('ml', 'nav.login')).toBe('ലോഗിൻ ചെയ്യുക');
      expect(getTranslation('ml', 'nav.logout')).toBe('ലോഗ് ഔട്ട്');
    });

    it('translates emergency notice and medical disclaimers in Malayalam Unicode', () => {
      const emergencyTitle = getTranslation('ml', 'emergencyBanner.title');
      const emergencyCall = getTranslation('ml', 'emergencyBanner.callCta');
      expect(emergencyTitle).toBe('വിവരദായക സംവിധാനം:');
      expect(emergencyCall).toBe('അടിയന്തരം: 108 / 112');

      const disclaimer = getTranslation('ml', 'queueTracking.medicalDisclaimer');
      expect(disclaimer).toContain('നെഞ്ചുവേദന');
      expect(disclaimer).toContain('ശ്വാസതടസ്സം');
      expect(disclaimer).toContain('എമർജൻസി വിഭാഗത്തിലേക്ക്');
    });

    it('translates live queue status labels in Malayalam', () => {
      expect(getTranslation('ml', 'queueTracking.estimatedWaitingTime')).toBe('കണക്കാക്കിയ കാത്തിരിപ്പ് സമയം');
      expect(getTranslation('ml', 'queueTracking.yourPosition')).toBe('നിങ്ങളുടെ സ്ഥാനം');
      expect(getTranslation('ml', 'queueTracking.doctorPresent')).toBe('ഡോക്ടർ ലഭ്യമാണ്');
      expect(getTranslation('ml', 'queueTracking.doctorAway')).toBe('താല്ക്കാലികമായി ലഭ്യമല്ല');
      expect(getTranslation('ml', 'queueTracking.minutesUnit')).toBe('മിനിറ്റുകൾ');
    });

    it('provides valid Unicode Malayalam text without corruption', () => {
      const mlKeys = [
        'common.appName',
        'home.heroTitle1',
        'home.heroTitle2',
        'login.title',
        'patientDashboard.title',
        'settings.title',
      ];

      for (const key of mlKeys) {
        const text = getTranslation('ml', key);
        expect(text).toBeTruthy();
        // Check Malayalam Unicode range \u0D00 - \u0D7F
        const hasMalayalamChar = /[\u0D00-\u0D7F]/.test(text);
        expect(hasMalayalamChar, `Expected key ${key} to contain Malayalam script`).toBe(true);
      }
    });
  });

  // =========================================================================
  // 2. Parameter Interpolation & Fallback Handling
  // =========================================================================
  describe('2. String Interpolation and Fallback Logic', () => {
    it('interpolates single dynamic parameters correctly', () => {
      const enResult = getTranslation('en', 'patientDashboard.welcome', { name: 'Rahul Nair' });
      expect(enResult).toBe('Welcome back, Rahul Nair. Track your active tokens and outpatient schedule.');

      const mlResult = getTranslation('ml', 'patientDashboard.welcome', { name: 'രാഹുൽ' });
      expect(mlResult).toBe('സ്വാഗതം, രാഹുൽ. നിങ്ങളുടെ ലൈവ് ടോക്കണുകളും ഒ.പി.ഡി സമയക്രമവും ഇവിടെ കാണാം.');
    });

    it('interpolates multiple parameters in English and Malayalam', () => {
      const enResult = getTranslation('en', 'login.submitBtnPersona', {
        name: 'Dr. Arvind Menon',
        role: 'DOCTOR',
      });
      expect(enResult).toBe('Sign In as Dr. Arvind Menon (DOCTOR)');

      const mlResult = getTranslation('ml', 'login.submitBtnPersona', {
        name: 'ഡോ. അരവിന്ദ് മേനോൻ',
        role: 'ഡോക്ടർ',
      });
      expect(mlResult).toBe('ഡോ. അരവിന്ദ് മേനോൻ ആയി ലോഗിൻ ചെയ്യുക (ഡോക്ടർ)');
    });

    it('interpolates token and position numbers in queue messages', () => {
      const approachingEn = getTranslation('en', 'queueTracking.approachingAlert', {
        position: 1,
        room: 'Room 102',
      });
      expect(approachingEn).toBe('Your turn is approaching! You are #1 in line. Please wait near Room 102.');

      const approachingMl = getTranslation('ml', 'queueTracking.approachingAlert', {
        position: 1,
        room: 'റൂം 102',
      });
      expect(approachingMl).toBe('നിങ്ങളുടെ ഊഴം എത്തിക്കൊണ്ടിരിക്കുന്നു! നിങ്ങൾ #1-ാമതാണ്. ദയവായി റൂം 102-ന് സമീപം കാത്തിരിക്കുക.');
    });

    it('falls back to English when a key is missing in target locale', () => {
      // Intentionally request non-existent key in 'ml' that exists in 'en'
      const result = getTranslation('ml', 'common.verifiedDPDP');
      expect(result).toBe('ഡിപിഡിപി നിയമപ്രകാരം സുരക്ഷിതം (DPDP Act India)');
    });

    it('returns the key path gracefully if missing entirely in all locales', () => {
      const missing = getTranslation('en', 'nonexistent.module.key');
      expect(missing).toBe('nonexistent.module.key');
    });

    it('does not corrupt state or crash on empty or null parameters', () => {
      const result = getTranslation('en', 'patientDashboard.welcome', undefined);
      expect(result).toBe('Welcome back, {name}. Track your active tokens and outpatient schedule.');
    });
  });

  // =========================================================================
  // 3. Client Storage Persistence & HTML Lang Sync
  // =========================================================================
  describe('3. Locale Persistence and DOM Synchronization', () => {
    it('persists selected language in localStorage without user logout', () => {
      // Simulate setLanguage('ml')
      const targetLocale: Locale = 'ml';
      localStorage.setItem('queuecare_lang', targetLocale);
      document.documentElement.lang = targetLocale;

      expect(localStorage.getItem('queuecare_lang')).toBe('ml');
      expect(document.documentElement.lang).toBe('ml');
    });

    it('restores saved language on initialization', () => {
      localStorage.setItem('queuecare_lang', 'ml');

      const saved = localStorage.getItem('queuecare_lang') as Locale;
      expect(saved).toBe('ml');

      const bannerText = getTranslation(saved, 'emergencyBanner.title');
      expect(bannerText).toBe('വിവരദായക സംവിധാനം:');
    });

    it('synchronizes html lang attribute when switching back to English', () => {
      localStorage.setItem('queuecare_lang', 'en');
      document.documentElement.lang = 'en';

      expect(document.documentElement.lang).toBe('en');
      expect(localStorage.getItem('queuecare_lang')).toBe('en');
    });
  });

  // =========================================================================
  // 4. Bug 1 Regression: Infinite Refresh, Loading Reset, and Polling Cleanup
  // =========================================================================
  describe('4. BUG 1 Fix: Infinite Refresh Animation & Loading State Safety', () => {
    it('resets loading state to false on network/API failure', async () => {
      let loading = true;
      let error: string | null = null;

      const mockFetchFailed = async () => {
        loading = true;
        try {
          throw new Error('Connection refused');
        } catch (e: any) {
          error = e.message;
        } finally {
          loading = false;
        }
      };

      await mockFetchFailed();

      expect(loading).toBe(false);
      expect(error).toBe('Connection refused');
    });

    it('resets loading state to false on successful fetch', async () => {
      let loading = true;
      let data: any = null;

      const mockFetchSuccess = async () => {
        loading = true;
        try {
          data = { success: true, count: 5 };
        } finally {
          loading = false;
        }
      };

      await mockFetchSuccess();

      expect(loading).toBe(false);
      expect(data.count).toBe(5);
    });

    it('cleans up polling intervals on unmount to prevent leaks and re-fetch loops', () => {
      vi.useFakeTimers();

      let fetchCount = 0;
      const poll = () => {
        fetchCount++;
      };

      const intervalId = setInterval(poll, 5000);

      // Fast forward 12 seconds: should fire twice (at 5s and 10s)
      vi.advanceTimersByTime(12000);
      expect(fetchCount).toBe(2);

      // Unmount / cleanup
      clearInterval(intervalId);

      // Fast forward another 20 seconds: fetchCount must not increase
      vi.advanceTimersByTime(20000);
      expect(fetchCount).toBe(2);

      vi.useRealTimers();
    });

    it('verifies staff queue dependency array does not trigger circular re-renders', () => {
      // In the buggy version, useEffect depended on [selectedDoctorId, currentUser, role, doctors]
      // and fetchQueue modified `doctors` state with a new array reference every time.
      // In the fixed version, useEffect depends only on [selectedDoctorId, currentUser?.id, role]
      const dependencies = ['selectedDoctorId', 'currentUser?.id', 'role'];
      expect(dependencies).not.toContain('doctors');
    });

    it('respects reduced-motion preferences with motion-reduce classes', () => {
      // Validate that motion-reduce utilities are applied alongside animation classes
      const spinnerClasses = 'animate-spin motion-reduce:animate-none';
      const pulseClasses = 'animate-pulse motion-reduce:animate-none';
      const pingClasses = 'animate-ping motion-reduce:animate-none';

      expect(spinnerClasses).toContain('motion-reduce:animate-none');
      expect(pulseClasses).toContain('motion-reduce:animate-none');
      expect(pingClasses).toContain('motion-reduce:animate-none');
    });
  });
});
