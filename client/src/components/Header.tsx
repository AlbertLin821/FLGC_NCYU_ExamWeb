import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const BRAND_EN = 'NCYU Language Center AI English Write';
const BRAND_ZH = '國立嘉義大學語言中心AI英文寫作評測系統';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const teacherData = localStorage.getItem('teacher');
  const teacher = teacherData ? JSON.parse(teacherData) : null;

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
            <strong>{BRAND_EN}</strong>
            <small>{BRAND_ZH}</small>
          </span>
        </Link>
        <nav>
          <ul className="header-nav">
            <li><Link to="/">首頁</Link></li>
            {teacher ? (
              <>
                <li><Link to="/teacher/dashboard">管理端</Link></li>
                <li><button onClick={handleLogout} className="btn btn-sm btn-secondary">登出</button></li>
              </>
            ) : (
              <li><Link to="/teacher/login">老師登入</Link></li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
