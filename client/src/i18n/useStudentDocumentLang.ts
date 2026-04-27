import { useEffect } from 'react';
import { useStudentLocale } from './StudentLocaleContext';

/**
 * 在首頁與學生端路由上同步 document.documentElement.lang（無障礙與字體）。
 */
export function useStudentDocumentLang(pathname: string) {
  const { locale } = useStudentLocale();
  const isStudentSurface = pathname === '/' || pathname.startsWith('/student');
  useEffect(() => {
    if (!isStudentSurface) {
      document.documentElement.lang = 'zh-Hant';
      return;
    }
    document.documentElement.lang = locale === 'en' ? 'en' : 'zh-Hant';
    return () => {
      document.documentElement.lang = 'zh-Hant';
    };
  }, [locale, isStudentSurface]);
}
