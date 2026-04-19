import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { authApi } from '../../api';

const TeacherLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');
  let reasonNotice = '';
  if (reason === 'session') {
    reasonNotice = '登入已過期或無效，請重新登入。';
  } else if (reason === 'forbidden') {
    reasonNotice = '目前帳號權限不足，請使用具教師或管理員身分之帳號登入。';
  }

  React.useEffect(() => {
    if (localStorage.getItem('token')) navigate('/teacher/dashboard');
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.teacherLogin(email, password);
      localStorage.setItem('token', response.data.accessToken);
      localStorage.setItem('teacher', JSON.stringify(response.data.teacher));
      navigate('/teacher/overview');
    } catch (err: any) {
      setError(err.response?.data?.message || '帳號或密碼錯誤');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex justify-center">
        <div className="card w-full" style={{ maxWidth: '400px' }}>
          <div className="text-center mb-xl">
            <h2 className="mb-xs">老師/管理端登入</h2>
            <p className="text-sm text-secondary">請輸入您的教育帳號與密碼</p>
          </div>

          {reasonNotice ? (
            <div className="alert alert-warning mb-md" role="status">
              {reasonNotice}
            </div>
          ) : null}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">電子郵件 (Email)</label>
              <input
                type="email"
                className="form-input"
                placeholder="example@nchu.edu.tw"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">密碼 (Password)</label>
              <input
                type="password"
                className="form-input"
                placeholder="請輸入密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <div className="alert alert-danger mb-md">{error}</div>}

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
            >
              {loading ? <div className="spinner"></div> : '登入後台管理'}
            </button>
          </form>

          <footer className="mt-xl text-center">
            <Link to="/teacher/forgot-password" title="忘記密碼" className="text-xs text-secondary">忘記密碼？</Link>
          </footer>
        </div>
      </div>
    </Layout>
  );
};

export default TeacherLogin;
