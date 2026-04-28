import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { authApi } from '../../api';
import TeacherLanguageSwitch from '../../components/TeacherLanguageSwitch';
import { useTeacherLocale } from '../../i18n/TeacherLocaleContext';

const ResetPassword: React.FC = () => {
  const { token: urlToken } = useParams<{ token: string }>();
  const { t } = useTeacherLocale();
  const [token, setToken] = useState(urlToken || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setError(t('reset.mismatch'));
    }
    if (newPassword.length < 6) {
      return setError(t('reset.tooShort'));
    }

    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await authApi.resetPassword(token, newPassword);
      setMessage(response.data.message);
      setTimeout(() => navigate('/teacher/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || t('reset.invalid'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex justify-center">
        <div className="card modal-card modal-card--sm">
          <div className="flex justify-end mb-md">
            <TeacherLanguageSwitch compact />
          </div>
          <div className="text-center mb-xl">
            <h2 className="mb-xs">{t('reset.title')}</h2>
            <p className="text-sm text-secondary">{t('reset.subtitle')}</p>
          </div>

          {!message ? (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">{t('reset.token')}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t('reset.tokenPlaceholder')}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  readOnly={!!urlToken}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('reset.newPassword')}</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder={t('reset.newPasswordPlaceholder')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('reset.confirmPassword')}</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder={t('reset.confirmPasswordPlaceholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {error && <div className="alert alert-danger mb-md">{error}</div>}

              <button
                type="submit"
                className="btn btn-primary btn-lg w-full"
                disabled={loading}
              >
                {loading ? <div className="spinner"></div> : t('reset.submit')}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <div className="alert alert-success mb-lg">{message}</div>
              <p className="text-sm text-secondary">{t('reset.successRedirect')}</p>
              <div className="mt-md">
                <Link to="/teacher/login" className="btn btn-primary w-full">{t('reset.loginNow')}</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ResetPassword;
