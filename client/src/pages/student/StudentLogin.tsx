import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { authApi } from '../../api';

const StudentLogin: React.FC = () => {
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.studentVerify(studentId, name);
      localStorage.setItem('student', JSON.stringify(response.data.student));
      navigate('/student/exams');
    } catch (err: any) {
      setError(err.response?.data?.message || '學號或姓名錯誤，請重新輸入');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex justify-center">
        <div className="card w-full" style={{ maxWidth: '450px' }}>
          <div className="text-center mb-xl">
            <h2 className="mb-xs">學生身分驗證</h2>
            <p className="text-sm text-secondary">請輸入學號與姓名以繼續測試</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">學號 (Student ID)</label>
              <input
                type="text"
                className="form-input"
                placeholder="例如: 411200000"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">姓名 (Name)</label>
              <input
                type="text"
                className="form-input"
                placeholder="您的真實姓名"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {error && <div className="alert alert-danger mb-md">{error}</div>}

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
            >
              {loading ? <div className="spinner"></div> : '進入測驗系統'}
            </button>
          </form>

          <p className="text-center text-xs text-secondary mt-lg">
            * 提醒：驗證失敗 3 次後帳號將暫時鎖定 10 分鐘。<br />
            如有任何技術問題，請聯繫語言中心。
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default StudentLogin;
