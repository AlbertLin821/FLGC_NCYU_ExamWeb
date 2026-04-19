import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { authApi } from '../../api';

const ForgotPassword: React.FC = () => {
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
      setError(err.response?.data?.message || '發生錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex justify-center">
        <div className="card w-full" style={{ maxWidth: '400px' }}>
          <div className="text-center mb-xl">
            <h2 className="mb-xs">忘記密碼</h2>
            <p className="text-sm text-secondary">請輸入您的註冊信箱以獲取重設驗證碼</p>
          </div>

          {!message ? (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">電子郵件 (Email)</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="example@ncyu.edu.tw"
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
                {loading ? <div className="spinner"></div> : '發送驗證碼'}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <div className="alert alert-success mb-lg">{message}</div>
              {token && (
                <div className="card bg-light mb-lg p-md text-left">
                  <p className="text-xs text-secondary mb-xs">測試模式：您的驗證碼為</p>
                  <code className="text-lg font-bold text-primary">{token}</code>
                  <div className="mt-md">
                    <Link 
                      to={`/teacher/reset-password/${token}`}
                      className="btn btn-outline btn-sm w-full"
                    >
                      直接前往重設頁面
                    </Link>
                  </div>
                </div>
              )}
              <Link to="/teacher/login" className="text-sm text-primary">返回登入</Link>
            </div>
          )}

          <div className="mt-xl text-center">
            <Link to="/teacher/login" className="text-xs text-secondary">想起來了？返回登入</Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ForgotPassword;
