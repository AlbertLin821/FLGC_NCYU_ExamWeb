import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useStudentLocale } from '../i18n/StudentLocaleContext';
import { useTeacherLocale } from '../i18n/TeacherLocaleContext';
import StudentLanguageSwitch from './StudentLanguageSwitch';
import TeacherLanguageSwitch from './TeacherLanguageSwitch';

const BRAND_EN = 'NCYU Language Center AI English Write';
const BRAND_ZH = '國立嘉義大學語言中心AI英文寫作評測系統';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { locale: studentLocale, t: tStudent } = useStudentLocale();
  const { locale: teacherLocale, t: tTeacher } = useTeacherLocale();
  const teacherData = localStorage.getItem('teacher');
  const teacher = teacherData ? JSON.parse(teacherData) : null;

  const studentSurface = location.pathname === '/' || location.pathname.startsWith('/student');
  const teacherSurface = location.pathname.startsWith('/teacher');
  const useTeacherI18n = teacherSurface && teacherLocale === 'en';
  const useStudentI18n = studentSurface && studentLocale === 'en';
  const tHeader = useTeacherI18n ? tTeacher : tStudent;
  const navI18n = useTeacherI18n || useStudentI18n;

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
          {teacherSurface ? <TeacherLanguageSwitch /> : studentSurface ? <StudentLanguageSwitch /> : null}
          <nav>
            <ul className="header-nav">
              <li>
                <Link to="/">{navI18n ? tHeader('header.home') : '首頁'}</Link>
              </li>
              {teacher ? (
                <>
                  <li><Link to="/teacher/dashboard">{navI18n ? tHeader('header.teacherPortal') : '管理端'}</Link></li>
                  <li><button onClick={handleLogout} className="btn btn-sm btn-secondary">{navI18n ? tHeader('header.logout') : '登出'}</button></li>
                </>
              ) : (
                <li>
                  <Link to="/teacher/login">{navI18n ? tHeader('header.teacherLogin') : '老師登入'}</Link>
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
