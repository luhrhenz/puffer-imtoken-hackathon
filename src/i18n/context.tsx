import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Locale,
  LOCALE_LABELS,
  LOCALE_NAMES,
  messages,
  interpolate,
  Messages,
} from './locales';

const STORAGE_KEY = 'stakemind-locale';

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  localeLabel: string;
  localeName: string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getByPath(obj: Messages, path: string): string | undefined {
  return path.split('.').reduce((acc: unknown, part) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj as unknown) as string | undefined;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && saved in messages) return saved;
    const browser = navigator.language.toLowerCase();
    if (browser.startsWith('zh')) return 'zh';
    if (browser.startsWith('es')) return 'es';
    return 'en';
  });

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const value =
        getByPath(messages[locale], key) ?? getByPath(messages.en, key) ?? key;
      return vars ? interpolate(value, vars) : value;
    },
    [locale],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title =
      locale === 'zh'
        ? 'StakeMind - AI 质押顾问'
        : locale === 'es'
          ? 'StakeMind - Asesor IA de Staking'
          : 'StakeMind - AI Staking Advisor';
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      localeLabel: LOCALE_LABELS[locale],
      localeName: LOCALE_NAMES[locale],
    }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useI18n();
  return (
    <div className={`lang-switcher${compact ? ' compact' : ''}`}>
      {(['en', 'zh', 'es'] as Locale[]).map((code) => (
        <button
          key={code}
          type="button"
          className={locale === code ? 'active' : ''}
          onClick={() => setLocale(code)}
          aria-label={LOCALE_NAMES[code]}
        >
          {LOCALE_LABELS[code]}
        </button>
      ))}
    </div>
  );
}
