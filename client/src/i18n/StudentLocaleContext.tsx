/* Context 模組需同檔匯出 Provider 與 hook，略過 react-refresh 僅匯出元件之檢查。 */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  type StudentLocale,
  STUDENT_LOCALE_STORAGE_KEY,
  getStudentString,
} from './studentMessages';
import { GLOBAL_LOCALE_EVENT, readGlobalLocale, syncGlobalLocale } from './localeSync';

type StudentLocaleContextValue = {
  locale: StudentLocale;
  setLocale: (l: StudentLocale) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
};

const StudentLocaleContext = createContext<StudentLocaleContextValue | null>(null);

function readStoredLocale(): StudentLocale {
  const globalLocale = readGlobalLocale();
  if (globalLocale) {
    return globalLocale;
  }
  try {
    const v = localStorage.getItem(STUDENT_LOCALE_STORAGE_KEY);
    if (v === 'en' || v === 'zh-TW') return v;
  } catch {
    /* ignore */
  }
  return 'zh-TW';
}

export function StudentLocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<StudentLocale>(readStoredLocale);

  const setLocale = useCallback((l: StudentLocale) => {
    setLocaleState(l);
    syncGlobalLocale(l, [STUDENT_LOCALE_STORAGE_KEY, 'ncyu-teacher-locale']);
  }, []);

  useEffect(() => {
    const syncLocale = (nextLocale: StudentLocale) => {
      setLocaleState((prev) => (prev === nextLocale ? prev : nextLocale));
    };

    const onStorage = (event: StorageEvent) => {
      if (
        event.key === STUDENT_LOCALE_STORAGE_KEY ||
        event.key === 'ncyu-teacher-locale' ||
        event.key === 'ncyu-global-locale'
      ) {
        const nextLocale = readStoredLocale();
        syncLocale(nextLocale);
      }
    };

    const onGlobalLocale = (event: Event) => {
      const nextLocale = (event as CustomEvent<StudentLocale>).detail;
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
    (path: string, vars?: Record<string, string | number>) => getStudentString(locale, path, vars),
    [locale],
  );

  const value = useMemo<StudentLocaleContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <StudentLocaleContext.Provider value={value}>{children}</StudentLocaleContext.Provider>;
}

export function useStudentLocale(): StudentLocaleContextValue {
  const ctx = useContext(StudentLocaleContext);
  if (!ctx) {
    throw new Error('useStudentLocale must be used within StudentLocaleProvider');
  }
  return ctx;
}
