import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { authApi } from '../../api';
import { useTeacherLocale } from '../../i18n/TeacherLocaleContext';

const TeacherLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTeacherLocale();
  const reason = searchParams.get('reason');
  let reasonNotice = '';
  if (reason === 'session') {
    reasonNotice = t('login.sessionExpired');
  } else if (reason === 'forbidden') {
    reasonNotice = t('login.forbidden');
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
      setError(err.response?.data?.message || t('login.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex justify-center">
        <div className="card modal-card modal-card--sm">
          <div className="text-center mb-xl">
            <h2 className="mb-xs">{t('login.title')}</h2>
            <p className="text-sm text-secondary">{t('login.subtitle')}</p>
          </div>

          {reasonNotice ? (
            <div className="alert alert-warning mb-md" role="status">
              {reasonNotice}
            </div>
          ) : null}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">{t('login.email')}</label>
              <input
                type="email"
                className="form-input"
                placeholder={t('login.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('login.password')}</label>
              <input
                type="password"
                className="form-input"
                placeholder={t('login.passwordPlaceholder')}
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
              {loading ? <div className="spinner"></div> : t('login.submit')}
            </button>
          </form>

          <div className="mt-xl text-center">
            <Link to="/teacher/forgot-password" title={t('login.forgot')} className="text-xs text-secondary">{t('login.forgot')}</Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TeacherLogin;
