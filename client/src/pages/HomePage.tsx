import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Users } from 'lucide-react';
import Layout from '../components/Layout';
import { useStudentLocale } from '../i18n/StudentLocaleContext';

const BRAND_EN = 'NCYU Language Center AI English Write';
const BRAND_ZH = '國立嘉義大學語言中心AI英文寫作評測系統';

const HomePage: React.FC = () => {
  const teacherData = localStorage.getItem('teacher');
  const teacher = teacherData ? JSON.parse(teacherData) : null;
  const { locale, t } = useStudentLocale();

  return (
    <Layout>
      <div className="text-center mt-3xl mb-3xl px-sm">
        <img className="home-brand-seal mb-lg" src="/school.jpg" alt="國立嘉義大學校徽" />
        <h1 className="mb-md home-hero-title">
          {BRAND_ZH}
        </h1>
        <p className="text-sm text-secondary mb-sm">{BRAND_EN}</p>
        <p
          className="text-secondary text-lg mb-2xl mx-auto home-hero-copy"
        >
          {t('home.chooseRole')}
        </p>
        <div className="home-role-cards">
          <Link to="/student/login" className="card text-center home-role-card">
            <div className="mb-lg flex justify-center text-primary">
              <GraduationCap size={56} className="home-role-icon" />
            </div>
            {locale === 'en' ? (
              <h3 className="mb-sm" lang="en">
                STUDENT
                <span className="text-secondary text-base font-normal" lang="zh-Hant" style={{ display: 'block', marginTop: 'var(--space-xs)' }}>
                  學生
                </span>
              </h3>
            ) : (
              <h3 className="mb-sm" lang="zh-Hant">
                學生
                <span className="text-secondary text-base font-normal" lang="en" style={{ display: 'block', marginTop: 'var(--space-xs)' }}>
                  STUDENT
                </span>
              </h3>
            )}
            <p className="text-sm text-secondary mb-lg">{t('home.studentDesc')}</p>
            <span className="btn btn-primary w-full">{t('home.studentCta')}</span>
          </Link>
          <Link
            to={teacher ? '/teacher/overview' : '/teacher/login'}
            className="card text-center home-role-card"
          >
            <div className="mb-lg flex justify-center text-secondary">
              <Users size={56} className="home-role-icon" />
            </div>
            {locale === 'en' ? (
              <h3 className="mb-sm" lang="en">
                TEACHER / ADMIN
                <span className="text-secondary text-base font-normal" lang="zh-Hant" style={{ display: 'block', marginTop: 'var(--space-xs)' }}>
                  老師 / 管理端
                </span>
              </h3>
            ) : (
              <h3 className="mb-sm" lang="zh-Hant">
                老師
                <span className="text-secondary text-base font-normal" lang="en" style={{ display: 'block', marginTop: 'var(--space-xs)' }}>
                  TEACHER / ADMIN
                </span>
              </h3>
            )}
            <p className="text-sm text-secondary mb-lg">{t('home.teacherDesc')}</p>
            <span className="btn btn-secondary w-full">{teacher ? t('home.teacherCtaEnter') : t('home.teacherCtaLogin')}</span>
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;
