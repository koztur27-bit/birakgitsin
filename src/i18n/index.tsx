import React, { createContext, useContext, useMemo } from 'react';
import { AppLanguage, localeTag } from './detect';
import { translations } from './translations';

type Dict = any;

type I18nContextValue = {
  locale: AppLanguage;
  t: (key: string, params?: Record<string, string | number>) => string;
  ta: <T = any>(key: string) => T;
  tag: string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getByPath(obj: any, path: string): any {
  return path.split('.').reduce<any>((acc, part) => (acc && acc[part] != null ? acc[part] : undefined), obj);
}

function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? String(params[k]) : `{${k}}`));
}

export function I18nProvider({
  locale,
  children,
}: {
  locale: AppLanguage;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nContextValue>(() => {
    const dict: Dict = translations[locale] || translations.en;
    const fallback: Dict = translations.en;
    const t = (key: string, params?: Record<string, string | number>) => {
      const raw = getByPath(dict, key) ?? getByPath(fallback, key) ?? key;
      return typeof raw === 'string' ? interpolate(raw, params) : String(key);
    };
    const ta = <T = any,>(key: string): T => {
      const raw = getByPath(dict, key);
      if (raw !== undefined) return raw as T;
      const fb = getByPath(fallback, key);
      if (fb !== undefined) return fb as T;
      return ([] as unknown) as T;
    };
    return { locale, t, ta, tag: localeTag(locale) };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    const t = (key: string) => key;
    const ta = <T = any,>(_key: string) => ([] as unknown) as T;
    return { locale: 'tr', t, ta, tag: 'tr-TR' };
  }
  return ctx;
}

export function tStatic(locale: AppLanguage, key: string, params?: Record<string, string | number>): string {
  const dict = translations[locale] || translations.en;
  const raw = getByPath(dict, key) ?? getByPath(translations.en, key) ?? key;
  return typeof raw === 'string' ? interpolate(raw, params) : key;
}

export { AppLanguage, localeTag } from './detect';
export { translations } from './translations';
