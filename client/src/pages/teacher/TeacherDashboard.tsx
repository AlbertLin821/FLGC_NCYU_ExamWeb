import React from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import Layout from '../../components/Layout';
import ClassManagement from './ClassManagement';
import ExamManagement from './ExamManagement';
import QuestionManagement from './QuestionManagement';
import ResultsView from './ResultsView';
import AntiCheatMonitor from './AntiCheatMonitor';
import StudentResultDetail from './StudentResultDetail';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList,
  Trophy, 
  ShieldAlert 
} from 'lucide-react';
import { dashboardApi, teachersApi } from '../../api';

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
    <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
      <div className="card" style={{ background: 'var(--color-primary)', color: 'white' }}>
        <h4 style={{ opacity: 0.8 }}>目前活躍考場</h4>
        <div style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0.5rem 0' }}>{stats?.activeExams || 0}</div>
        <p className="text-xs">即時進行中</p>
      </div>
      <div className="card" onClick={() => navigate('/teacher/cheat')} style={{ cursor: 'pointer' }}>
        <h4 className="text-secondary">待處理異常</h4>
        <div style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0.5rem 0', color: 'var(--color-danger)' }}>{stats?.pendingAlerts || 0}</div>
        <p className="text-xs">請見監控面板</p>
      </div>
      <div className="card">
        <h4 className="text-secondary">本週交卷數</h4>
        <div style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0.5rem 0' }}>{stats?.totalSubmissions || 0}</div>
        <p className="text-xs">即時連線數據</p>
      </div>
    </div>
      <div className="card">
        <h3 className="mb-md">系統日誌</h3>
        <p className="text-sm text-secondary">暫無最新日誌</p>
      </div>

      <div className="card mt-lg">
        <h3 className="mb-md">邀請其他教師</h3>
        <p className="text-sm text-secondary mb-md">輸入電子郵件以發送平台加入邀請連結。</p>
        <div className="flex gap-sm">
          <input 
            type="email" 
            className="form-input" 
            placeholder="teacher@nchu.edu.tw"
            id="invite-email"
          />
          <button className="btn btn-primary" onClick={async () => {
            const email = (document.getElementById('invite-email') as HTMLInputElement).value;
            if (!email) return;
            try {
              await teachersApi.invite(email);
              alert('邀請已送出 (請查看後端 Log 模擬發信)');
            } catch { alert('邀請失敗'); }
          }}>發送邀請</button>
        </div>
      </div>
    </div>
  );
};

const TeacherDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  React.useEffect(() => {
    if (!token) navigate('/teacher/login');
  }, [token, navigate]);

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
    { path: '/teacher/overview', label: '儀表板', icon: <LayoutDashboard size={18} /> },
    { path: '/teacher/classes', label: '班級與學生', icon: <Users size={18} /> },
    { path: '/teacher/exams', label: '考卷管理', icon: <ClipboardList size={18} /> },
    { path: '/teacher/results', label: '成績後台', icon: <Trophy size={18} /> },
    { path: '/teacher/cheat', label: '防弊監控', icon: <ShieldAlert size={18} /> },
  ];

  return (
    <Layout>
      <div className="flex gap-lg" style={{ minHeight: '600px' }}>
        {/* Sidebar */}
        <aside style={{ width: '220px', flexShrink: 0 }}>
          <div className="flex flex-col gap-sm">
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

        {/* Main Area */}
        <div style={{ flex: 1 }}>
          <Routes>
            <Route path="overview" element={<DashboardOverview />} />
            <Route path="dashboard" element={<DashboardOverview />} />
            <Route path="classes" element={<ClassManagement />} />
            <Route path="students" element={<ClassManagement />} />
            <Route path="exams" element={<ExamManagement />} />
            <Route path="questions" element={<QuestionManagement />} />
            <Route path="results" element={<ResultsView />} />
            <Route path="result/:studentId" element={<StudentResultDetail />} />
            <Route path="cheat" element={<AntiCheatMonitor />} />
            <Route path="/" element={<DashboardOverview />} />
          </Routes>
        </div>
      </div>
    </Layout>
  );
};

export default TeacherDashboard;
