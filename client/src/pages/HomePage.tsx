import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Users } from 'lucide-react';
import Layout from '../components/Layout';

const HomePage: React.FC = () => {
  const teacherData = localStorage.getItem('teacher');
  const teacher = teacherData ? JSON.parse(teacherData) : null;

  return (
    <Layout>
      <div className="text-center mt-3xl mb-3xl">
        <h1 className="mb-md" style={{ fontSize: '2.5rem', fontWeight: 800 }}>
          國立中興大學<br />
          <span style={{ color: 'var(--color-primary)' }}>線上英文考試平台</span>
        </h1>
        <p className="text-secondary mb-2xl" style={{ fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
          選擇身分類別進入平台。
        </p>
        <div className="flex justify-center gap-lg">
          <Link to="/student/login" className="card text-center" style={{ width: '280px', padding: '3rem 2rem' }}>
            <div className="mb-lg flex justify-center text-primary">
              <GraduationCap size={64} />
            </div>
            <h3 className="mb-sm">學生</h3>
            <p className="text-sm text-secondary mb-lg">進行英文前後測驗、查看可考考卷</p>
            <span className="btn btn-primary w-full">進入考試</span>
          </Link>
          <Link to={teacher ? "/teacher/overview" : "/teacher/login"} className="card text-center" style={{ width: '280px', padding: '3rem 2rem' }}>
            <div className="mb-lg flex justify-center text-secondary-color">
              <Users size={64} />
            </div>
            <h3 className="mb-sm">老師</h3>
            <p className="text-sm text-secondary mb-lg">考卷管理、成績結算、班級統計</p>
            <span className="btn btn-secondary w-full">{teacher ? "進入管理端" : "管理登入"}</span>
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;
