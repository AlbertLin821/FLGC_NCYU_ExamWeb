import { useEffect } from 'react';
import { useTeacherLocale } from './TeacherLocaleContext';

export function useTeacherDocumentLang(pathname: string) {
  const { locale } = useTeacherLocale();
  const isTeacherSurface = pathname.startsWith('/teacher');

  useEffect(() => {
    if (!isTeacherSurface) {
      return;
    }
    document.documentElement.lang = locale === 'en' ? 'en' : 'zh-Hant';
    return () => {
      document.documentElement.lang = 'zh-Hant';
    };
  }, [isTeacherSurface, locale]);
}
