/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  TEACHER_LOCALE_STORAGE_KEY,
  type TeacherLocale,
  getTeacherString,
} from './teacherMessages';
import { GLOBAL_LOCALE_EVENT, readGlobalLocale, syncGlobalLocale } from './localeSync';

type TeacherLocaleContextValue = {
  locale: TeacherLocale;
  setLocale: (locale: TeacherLocale) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
};

const TeacherLocaleContext = createContext<TeacherLocaleContextValue | null>(null);

function readStoredLocale(): TeacherLocale {
  const globalLocale = readGlobalLocale();
  if (globalLocale) {
    return globalLocale;
  }
  try {
    const value = localStorage.getItem(TEACHER_LOCALE_STORAGE_KEY);
    if (value === 'zh-TW' || value === 'en') {
      return value;
    }
  } catch {
    /* ignore */
  }
  return 'zh-TW';
}

export function TeacherLocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<TeacherLocale>(readStoredLocale);

  const setLocale = useCallback((nextLocale: TeacherLocale) => {
    setLocaleState(nextLocale);
    syncGlobalLocale(nextLocale, [TEACHER_LOCALE_STORAGE_KEY, 'ncyu-student-locale']);
  }, []);

  useEffect(() => {
    const syncLocale = (nextLocale: TeacherLocale) => {
      setLocaleState((prev) => (prev === nextLocale ? prev : nextLocale));
    };

    const onStorage = (event: StorageEvent) => {
      if (
        event.key === TEACHER_LOCALE_STORAGE_KEY ||
        event.key === 'ncyu-student-locale' ||
        event.key === 'ncyu-global-locale'
      ) {
        const nextLocale = readStoredLocale();
        syncLocale(nextLocale);
      }
    };

    const onGlobalLocale = (event: Event) => {
      const nextLocale = (event as CustomEvent<TeacherLocale>).detail;
      if (nextLocale === 'zh-TW' || nextLocale === 'en') {
        syncLocale(nextLocale);
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(GLOBAL_LOCALE_EVENT, onGlobalLocale as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(GLOBAL_LOCALE_EVENT, onGlobalLocale as EventListener);
    };
  }, []);

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) =>
      getTeacherString(locale, path, vars),
    [locale],
  );

  const value = useMemo<TeacherLocaleContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return (
    <TeacherLocaleContext.Provider value={value}>
      {children}
    </TeacherLocaleContext.Provider>
  );
}

export function useTeacherLocale(): TeacherLocaleContextValue {
  const context = useContext(TeacherLocaleContext);
  if (!context) {
    throw new Error('useTeacherLocale must be used within TeacherLocaleProvider');
  }
  return context;
}
