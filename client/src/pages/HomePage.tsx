import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Users } from 'lucide-react';
import Layout from '../components/Layout';

const HomePage: React.FC = () => {
  const teacherData = localStorage.getItem('teacher');
  const teacher = teacherData ? JSON.parse(teacherData) : null;

  return (
    <Layout>
      <div className="text-center mt-3xl mb-3xl px-sm">
        <h1 className="mb-md home-hero-title">
          國立嘉義大學<br />
          <span style={{ color: 'var(--color-primary)' }}>線上英文考試平台</span>
        </h1>
        <p
          className="text-secondary text-lg mb-2xl mx-auto home-hero-copy"
        >
          選擇身分類別進入平台。
        </p>
        <div className="home-role-cards">
          <Link to="/student/login" className="card text-center home-role-card">
            <div className="mb-lg flex justify-center text-primary">
              <GraduationCap size={56} className="home-role-icon" />
            </div>
            <h3 className="mb-sm">學生</h3>
            <p className="text-sm text-secondary mb-lg">進行英文前後測驗、查看可考考卷</p>
            <span className="btn btn-primary w-full">進入考試</span>
          </Link>
          <Link
            to={teacher ? '/teacher/overview' : '/teacher/login'}
            className="card text-center home-role-card"
          >
            <div className="mb-lg flex justify-center text-secondary">
              <Users size={56} className="home-role-icon" />
            </div>
            <h3 className="mb-sm">老師</h3>
            <p className="text-sm text-secondary mb-lg">考卷管理、成績結算、班級統計</p>
            <span className="btn btn-secondary w-full">{teacher ? '進入管理端' : '管理登入'}</span>
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;
