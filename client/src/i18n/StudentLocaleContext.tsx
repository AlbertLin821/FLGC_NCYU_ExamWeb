/* Context 模組需同檔匯出 Provider 與 hook，略過 react-refresh 僅匯出元件之檢查。 */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  type StudentLocale,
  STUDENT_LOCALE_STORAGE_KEY,
  getStudentString,
} from './studentMessages';

type StudentLocaleContextValue = {
  locale: StudentLocale;
  setLocale: (l: StudentLocale) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
};

const StudentLocaleContext = createContext<StudentLocaleContextValue | null>(null);

function readStoredLocale(): StudentLocale {
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
    try {
      localStorage.setItem(STUDENT_LOCALE_STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
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
