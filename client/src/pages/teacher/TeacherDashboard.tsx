import React from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import Layout from '../../components/Layout';
import ClassManagement from './ClassManagement';
import ExamManagement from './ExamManagement';
import QuestionManagement from './QuestionManagement';
import ResultsView from './ResultsView';
import AntiCheatMonitor from './AntiCheatMonitor';
import StudentResultDetail from './StudentResultDetail';
import SystemManagement from './SystemManagement';
import TeacherAccounts from './TeacherAccounts';
import {
  LayoutDashboard,
  Users,
  UserCog,
  ClipboardList,
  Trophy,
  ShieldAlert,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import { dashboardApi, warmTeacherData } from '../../api';
import { getTeacherRole } from '../../utils/teacherRole';

const DashboardOverview = () => {
  const navigate = useNavigate();
  const [stats, setStats] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchStats = () => {
      dashboardApi.getStats().then(res => {
        setStats(res.data);
        setLoading(false);
      }).catch(err => {
          console.error(err);
          setLoading(false);
      });
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="spinner"></div>;

  return (
  <div className="flex flex-col gap-lg">
    <div className="dashboard-grid">
      <div className="card" style={{ background: 'var(--color-primary)', color: 'white' }}>
        <h4 style={{ opacity: 0.8 }}>目前活躍考場</h4>
        <div className="numeric-display">{stats?.activeExams || 0}</div>
        <p className="text-xs">即時進行中</p>
      </div>
      <div className="card" onClick={() => navigate('/teacher/cheat')} style={{ cursor: 'pointer' }}>
        <h4 className="text-secondary">待處理異常</h4>
        <div className="numeric-display text-danger">{stats?.pendingAlerts || 0}</div>
        <p className="text-xs">請見監控面板</p>
      </div>
      <div className="card">
        <h4 className="text-secondary">本週交卷數</h4>
        <div className="numeric-display">{stats?.totalSubmissions || 0}</div>
        <p className="text-xs">即時連線數據</p>
      </div>
      <div
        className="card"
        style={{
          border: (stats?.sessionsAwaitingScore || 0) + (stats?.sessionsPendingReview || 0) > 0
            ? '2px solid var(--color-danger)'
            : undefined,
        }}
      >
        <h4 className="text-secondary">成績未完成</h4>
        <div className="numeric-display text-danger">
          {(stats?.sessionsAwaitingScore || 0) + (stats?.sessionsPendingReview || 0)}
        </div>
        <p className="text-xs text-secondary">
          待評分 {stats?.sessionsAwaitingScore ?? 0}／待複閱 {stats?.sessionsPendingReview ?? 0}
        </p>
      </div>
    </div>
      <div className="card">
        <h3 className="mb-md">系統日誌</h3>
        <p className="text-sm text-secondary">暫無最新日誌</p>
      </div>
    </div>
  );
};

const TeacherDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [teacherMenuOpen, setTeacherMenuOpen] = React.useState(false);
  const role = getTeacherRole();

  React.useEffect(() => {
    if (!token) navigate('/teacher/login');
  }, [token, navigate]);

  React.useEffect(() => {
    setTeacherMenuOpen(false);
  }, [location.pathname]);

  React.useEffect(() => {
    if (token) warmTeacherData(role);
  }, [token, role]);

  if (!token) {
    return (
      <Layout>
        <div className="flex justify-center items-center" style={{ minHeight: '400px' }}>
          <div className="spinner" role="status" aria-label="載入中" />
        </div>
      </Layout>
    );
  }

  const menuItems = [
    { path: '/teacher/overview', label: '儀表板', icon: <LayoutDashboard size={18} />, show: true },
    { path: '/teacher/classes', label: '班級與學生', icon: <Users size={18} />, show: role === 'teacher' || role === 'admin' },
    { path: '/teacher/teachers', label: '教師帳號', icon: <UserCog size={18} />, show: role === 'admin' },
    { path: '/teacher/exams', label: '考卷管理', icon: <ClipboardList size={18} />, show: role === 'teacher' || role === 'admin' },
    { path: '/teacher/results', label: '成績後台', icon: <Trophy size={18} />, show: role === 'admin' || role === 'viewer' },
    { path: '/teacher/cheat', label: '防弊監控', icon: <ShieldAlert size={18} />, show: role === 'teacher' || role === 'admin' || role === 'viewer' },
    { path: '/teacher/system', label: '系統管理', icon: <Settings size={18} />, show: role === 'admin' },
  ].filter((i) => i.show);
  const activeItem = menuItems.find(
    (item) =>
      location.pathname.startsWith(item.path) ||
      (item.path === '/teacher/overview' && location.pathname === '/teacher/dashboard'),
  );

  return (
    <Layout>
      <div className="teacher-layout">
        <aside className="teacher-layout__nav">
          <button
            type="button"
            className="btn teacher-nav-toggle"
            onClick={() => setTeacherMenuOpen((open) => !open)}
            aria-expanded={teacherMenuOpen}
            aria-controls="teacher-dashboard-menu"
          >
            <span className="flex items-center gap-sm">
              {activeItem?.icon}
              {activeItem?.label ?? '功能選單'}
            </span>
            {teacherMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div
            id="teacher-dashboard-menu"
            className={`teacher-menu ${teacherMenuOpen ? 'teacher-menu--open' : ''}`}
          >
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`btn btn-secondary w-full justify-start`}
                style={{
                  border: '1px solid var(--color-border)',
                  background: location.pathname.startsWith(item.path) || (item.path === '/teacher/overview' && location.pathname === '/teacher/dashboard') ? 'var(--color-primary-light)' : 'transparent',
                  color: location.pathname.startsWith(item.path) || (item.path === '/teacher/overview' && location.pathname === '/teacher/dashboard') ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1rem'
                }}
              >
                <span style={{ marginRight: '0.5rem' }}>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </aside>

        <div className="teacher-layout__main">
          <Routes>
            <Route path="overview" element={<DashboardOverview />} />
            <Route path="dashboard" element={<DashboardOverview />} />
            <Route path="classes" element={<ClassManagement />} />
            <Route path="students" element={<ClassManagement />} />
            <Route path="teachers" element={<TeacherAccounts />} />
            <Route path="exams" element={<ExamManagement />} />
            <Route path="questions" element={<QuestionManagement />} />
            <Route path="results" element={<ResultsView />} />
            <Route path="result/:studentId" element={<StudentResultDetail />} />
            <Route path="cheat" element={<AntiCheatMonitor />} />
            <Route path="system" element={<SystemManagement />} />
            <Route path="/" element={<DashboardOverview />} />
          </Routes>
        </div>
      </div>
    </Layout>
  );
};

export default TeacherDashboard;
