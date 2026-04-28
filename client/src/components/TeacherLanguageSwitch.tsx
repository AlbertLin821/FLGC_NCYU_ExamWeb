import React from 'react';
import { useTeacherLocale } from '../i18n/TeacherLocaleContext';
import type { TeacherLocale } from '../i18n/teacherMessages';

const TeacherLanguageSwitch: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { locale, setLocale } = useTeacherLocale();

  const selectLocale = (nextLocale: TeacherLocale) => {
    setLocale(nextLocale);
  };

  return (
    <div
      className={compact ? 'student-lang-switch student-lang-switch--compact' : 'student-lang-switch'}
      role="group"
      aria-label="Teacher language"
    >
      <button
        type="button"
        className={`student-lang-btn ${locale === 'zh-TW' ? 'student-lang-btn--active' : ''}`}
        onClick={() => selectLocale('zh-TW')}
      >
        繁中
      </button>
      <button
        type="button"
        className={`student-lang-btn ${locale === 'en' ? 'student-lang-btn--active' : ''}`}
        onClick={() => selectLocale('en')}
      >
        English
      </button>
    </div>
  );
};

export default TeacherLanguageSwitch;
