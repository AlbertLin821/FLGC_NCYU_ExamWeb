import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useStudentLocale } from '../i18n/StudentLocaleContext';
import StudentLanguageSwitch from './StudentLanguageSwitch';

const BRAND_EN = 'NCYU Language Center AI English Write';
const BRAND_ZH = '國立嘉義大學語言中心AI英文寫作評測系統';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { locale, t } = useStudentLocale();
  const teacherData = localStorage.getItem('teacher');
  const teacher = teacherData ? JSON.parse(teacherData) : null;

  const studentSurface = location.pathname === '/' || location.pathname.startsWith('/student');
  const navI18n = studentSurface && locale === 'en';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('teacher');
    navigate('/teacher/login');
  };

  return (
    <header className="header">
      <div className="container header-inner header-inner--responsive">
        <Link to="/" className="header-logo">
          <img className="logo-badge" src="/school.jpg" alt="國立嘉義大學校徽" />
          <span>
            <strong>{BRAND_ZH}</strong>
            <small>{BRAND_EN}</small>
          </span>
        </Link>
        <div className="header-actions">
          {studentSurface && <StudentLanguageSwitch />}
          <nav>
            <ul className="header-nav">
              <li>
                <Link to="/">{navI18n ? t('header.home') : '首頁'}</Link>
              </li>
              {teacher ? (
                <>
                  <li><Link to="/teacher/dashboard">{navI18n ? t('header.teacherPortal') : '管理端'}</Link></li>
                  <li><button onClick={handleLogout} className="btn btn-sm btn-secondary">{navI18n ? t('header.logout') : '登出'}</button></li>
                </>
              ) : (
                <li>
                  <Link to="/teacher/login">{navI18n ? t('header.teacherLogin') : '老師登入'}</Link>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
