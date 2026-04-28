/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  TEACHER_LOCALE_STORAGE_KEY,
  type TeacherLocale,
  getTeacherString,
} from './teacherMessages';

type TeacherLocaleContextValue = {
  locale: TeacherLocale;
  setLocale: (locale: TeacherLocale) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
};

const TeacherLocaleContext = createContext<TeacherLocaleContextValue | null>(null);

function readStoredLocale(): TeacherLocale {
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
    try {
      localStorage.setItem(TEACHER_LOCALE_STORAGE_KEY, nextLocale);
    } catch {
      /* ignore */
    }
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
