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
import { dashboardApi, teachersApi, warmTeacherData } from '../../api';
import { getTeacherRole } from '../../utils/teacherRole';
import TeacherLanguageSwitch from '../../components/TeacherLanguageSwitch';
import { useTeacherLocale } from '../../i18n/TeacherLocaleContext';

const DashboardOverview = () => {
  const navigate = useNavigate();
  const role = getTeacherRole();
  const { t } = useTeacherLocale();
  const [stats, setStats] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [savingPassword, setSavingPassword] = React.useState(false);

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.trim().length < 8) {
      alert(t('dashboard.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      alert(t('dashboard.passwordMismatch'));
      return;
    }
    setSavingPassword(true);
    try {
      await teachersApi.updateOwnPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      alert(t('dashboard.passwordUpdated'));
    } catch (err: any) {
      const msg = err.response?.data?.message;
      alert(Array.isArray(msg) ? msg.join('；') : msg || t('dashboard.passwordUpdateFailed'));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
  <div className="flex flex-col gap-lg">
    {role === 'teacher' && (
      <div className="flex justify-end">
        <TeacherLanguageSwitch compact />
      </div>
    )}
    <div className="dashboard-grid">
      <div className="card" style={{ background: 'var(--color-primary)', color: 'white' }}>
        <h4 style={{ opacity: 0.8 }}>{role === 'teacher' ? t('dashboard.activeSessions') : '目前作答人數'}</h4>
        <div className="numeric-display">{stats?.activeSessions || 0}</div>
        <p className="text-xs">{role === 'teacher' ? t('dashboard.activeSessionsHint') : '正在作答中的學生場次'}</p>
      </div>
      <div className="card" onClick={() => navigate('/teacher/cheat')} style={{ cursor: 'pointer' }}>
        <h4 className="text-secondary">{role === 'teacher' ? t('dashboard.pendingAlerts') : '待處理異常'}</h4>
        <div className="numeric-display text-danger">{stats?.pendingAlerts || 0}</div>
        <p className="text-xs">{role === 'teacher' ? t('dashboard.pendingAlertsHint') : '請見監控面板'}</p>
      </div>
      <div className="card">
        <h4 className="text-secondary">{role === 'teacher' ? t('dashboard.submissions') : '本週交卷數'}</h4>
        <div className="numeric-display">{stats?.totalSubmissions || 0}</div>
        <p className="text-xs">{role === 'teacher' ? t('dashboard.submissionsHint') : '即時連線數據'}</p>
      </div>
      <div
        className="card"
        style={{
          border: (stats?.sessionsAwaitingScore || 0) + (stats?.sessionsPendingReview || 0) > 0
            ? '2px solid var(--color-danger)'
            : undefined,
        }}
      >
        <h4 className="text-secondary">{role === 'teacher' ? t('dashboard.incompleteScores') : '成績未完成'}</h4>
        <div className="numeric-display text-danger">
          {(stats?.sessionsAwaitingScore || 0) + (stats?.sessionsPendingReview || 0)}
        </div>
        <p className="text-xs text-secondary">
          {role === 'teacher'
            ? t('dashboard.incompleteScoresHint', {
                awaiting: stats?.sessionsAwaitingScore ?? 0,
                review: stats?.sessionsPendingReview ?? 0,
              })
            : `待評分 ${stats?.sessionsAwaitingScore ?? 0}／待複閱 ${stats?.sessionsPendingReview ?? 0}`}
        </p>
      </div>
    </div>
      <div className="card">
        <h3 className="mb-md">{role === 'teacher' ? t('dashboard.logs') : '系統日誌'}</h3>
        <p className="text-sm text-secondary">{role === 'teacher' ? t('dashboard.logsEmpty') : '暫無最新日誌'}</p>
      </div>
      <div className="card">
        <h3 className="mb-md">{role === 'teacher' ? t('dashboard.changePassword') : '修改我的密碼'}</h3>
        <form className="flex flex-col gap-md max-w-md" onSubmit={handleChangePassword}>
          <div>
            <label className="form-label">{role === 'teacher' ? t('dashboard.currentPassword') : '目前密碼'}</label>
            <input className="form-input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </div>
          <div>
            <label className="form-label">{role === 'teacher' ? t('dashboard.newPassword') : '新密碼'}</label>
            <input className="form-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </div>
          <div>
            <label className="form-label">{role === 'teacher' ? t('dashboard.confirmPassword') : '確認新密碼'}</label>
            <input className="form-input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          <div className="action-group">
            <button type="submit" className="btn btn-primary" disabled={savingPassword}>
              {savingPassword
                ? (role === 'teacher' ? t('dashboard.savingPassword') : '更新中…')
                : (role === 'teacher' ? t('dashboard.savePassword') : '更新密碼')}
            </button>
          </div>
        </form>
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
  const { locale, t } = useTeacherLocale();

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
          <div className="spinner" role="status" aria-label={role === 'teacher' && locale === 'en' ? 'Loading' : '載入中'} />
        </div>
      </Layout>
    );
  }

  const menuItems = [
    { path: '/teacher/overview', label: role === 'teacher' ? t('nav.overview') : '儀表板', icon: <LayoutDashboard size={18} />, show: true },
    { path: '/teacher/classes', label: '班級與學生', icon: <Users size={18} />, show: role === 'admin' },
    { path: '/teacher/teachers', label: '教師帳號', icon: <UserCog size={18} />, show: role === 'admin' },
    { path: '/teacher/exams', label: '考卷管理', icon: <ClipboardList size={18} />, show: role === 'admin' },
    { path: '/teacher/results', label: '成績後台', icon: <Trophy size={18} />, show: role === 'admin' || role === 'viewer' },
    { path: '/teacher/cheat', label: role === 'teacher' ? t('nav.cheat') : '防弊監控', icon: <ShieldAlert size={18} />, show: role === 'teacher' || role === 'admin' || role === 'viewer' },
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
              {activeItem?.label ?? (role === 'teacher' ? t('nav.menu') : '功能選單')}
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
            <Route path="classes" element={role === 'admin' ? <ClassManagement /> : <DashboardOverview />} />
            <Route path="students" element={role === 'admin' ? <ClassManagement /> : <DashboardOverview />} />
            <Route path="teachers" element={<TeacherAccounts />} />
            <Route path="exams" element={role === 'admin' ? <ExamManagement /> : <DashboardOverview />} />
            <Route path="questions" element={role === 'admin' ? <QuestionManagement /> : <DashboardOverview />} />
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
