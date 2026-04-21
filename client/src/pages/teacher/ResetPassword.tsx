import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { authApi } from '../../api';

const ResetPassword: React.FC = () => {
  const { token: urlToken } = useParams<{ token: string }>();
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
      return setError('兩次輸入的密碼不一致');
    }
    if (newPassword.length < 6) {
      return setError('密碼長度至少需要 6 個字元');
    }

    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await authApi.resetPassword(token, newPassword);
      setMessage(response.data.message);
      setTimeout(() => navigate('/teacher/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || '驗證碼無效或已過期');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex justify-center">
        <div className="card modal-card modal-card--sm">
          <div className="text-center mb-xl">
            <h2 className="mb-xs">重設密碼</h2>
            <p className="text-sm text-secondary">請輸入您的驗證碼與新密碼</p>
          </div>

          {!message ? (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">驗證碼 (Token)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="輸入 6 位數驗證碼"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  readOnly={!!urlToken}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">新密碼 (New Password)</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="至少 6 個字元"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">確認新密碼</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="再次輸入新密碼"
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
                {loading ? <div className="spinner"></div> : '更新密碼'}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <div className="alert alert-success mb-lg">{message}</div>
              <p className="text-sm text-secondary">即將在 3 秒後跳轉至登入頁面...</p>
              <div className="mt-md">
                <Link to="/teacher/login" className="btn btn-primary w-full">立即登入</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ResetPassword;
