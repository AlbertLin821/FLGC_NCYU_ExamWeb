import React from 'react';
import { useStudentLocale } from '../i18n/StudentLocaleContext';
import type { StudentLocale } from '../i18n/studentMessages';

type Variant = 'default' | 'compact';

const StudentLanguageSwitch: React.FC<{ variant?: Variant }> = ({ variant = 'default' }) => {
  const { locale, setLocale } = useStudentLocale();

  const select = (l: StudentLocale) => {
    setLocale(l);
  };

  const isCompact = variant === 'compact';

  return (
    <div
      className={isCompact ? 'student-lang-switch student-lang-switch--compact' : 'student-lang-switch'}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        className={`student-lang-btn ${locale === 'zh-TW' ? 'student-lang-btn--active' : ''}`}
        onClick={() => select('zh-TW')}
        lang="zh-Hant"
      >
        繁中
      </button>
      <button
        type="button"
        className={`student-lang-btn ${locale === 'en' ? 'student-lang-btn--active' : ''}`}
        onClick={() => select('en')}
        lang="en"
      >
        English
      </button>
    </div>
  );
};

export default StudentLanguageSwitch;
