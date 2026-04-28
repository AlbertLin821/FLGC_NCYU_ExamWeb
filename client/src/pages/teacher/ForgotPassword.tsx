import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { authApi } from '../../api';
import { useTeacherLocale } from '../../i18n/TeacherLocaleContext';

const ForgotPassword: React.FC = () => {
  const { t } = useTeacherLocale();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(''); // Only for demo/test purposes as we don't have real email

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await authApi.requestPasswordReset(email);
      setMessage(response.data.message);
      if (response.data.token) {
        setToken(response.data.token);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('forgot.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex justify-center">
        <div className="card modal-card modal-card--sm">
          <div className="text-center mb-xl">
            <h2 className="mb-xs">{t('forgot.title')}</h2>
            <p className="text-sm text-secondary">{t('forgot.subtitle')}</p>
          </div>

          {!message ? (
            <form onSubmit={handleSubmit}>
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

              {error && <div className="alert alert-danger mb-md">{error}</div>}

              <button
                type="submit"
                className="btn btn-primary btn-lg w-full"
                disabled={loading}
              >
                {loading ? <div className="spinner"></div> : t('forgot.submit')}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <div className="alert alert-success mb-lg">{message}</div>
              {token && (
                <div className="card bg-light mb-lg p-md text-left">
                  <p className="text-xs text-secondary mb-xs">{t('forgot.testMode')}</p>
                  <code className="text-lg font-bold text-primary">{token}</code>
                  <div className="mt-md">
                    <Link 
                      to={`/teacher/reset-password/${token}`}
                      className="btn btn-outline btn-sm w-full"
                    >
                      {t('forgot.directReset')}
                    </Link>
                  </div>
                </div>
              )}
              <Link to="/teacher/login" className="text-sm text-primary">{t('forgot.back')}</Link>
            </div>
          )}

          <div className="mt-xl text-center">
            <Link to="/teacher/login" className="text-xs text-secondary">{t('forgot.remember')}</Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ForgotPassword;
