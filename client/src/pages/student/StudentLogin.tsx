import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { authApi } from '../../api';

type VerifiedStudent = {
  id: number;
  studentId: string;
  name: string;
  schoolName: string;
  classIds: number[];
  classNames: string[];
  className: string;
};

const StudentLogin: React.FC = () => {
  const [studentId, setStudentId] = useState('');
  const [verifiedStudent, setVerifiedStudent] = useState<VerifiedStudent | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.studentVerify(studentId.trim());
      setVerifiedStudent(response.data.student);
    } catch (err: any) {
      setError(err.response?.data?.message || '查無此學號，請重新輸入');
    } finally {
      setLoading(false);
    }
  };

  const confirmStudent = () => {
    if (!verifiedStudent) return;
    localStorage.setItem('student', JSON.stringify(verifiedStudent));
    navigate('/student/exams');
  };

  return (
    <Layout>
      <div className="flex justify-center">
        <div className="card modal-card modal-card--md">
          <div className="text-center mb-xl">
            <h2 className="mb-xs">學生身分驗證</h2>
            <p className="text-sm text-secondary">請輸入學號以確認身分並進入測驗</p>
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

            {error && <div className="alert alert-danger mb-md">{error}</div>}

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
            >
              {loading ? <div className="spinner"></div> : '查詢學生資料'}
            </button>
          </form>

          <p className="text-center text-xs text-secondary mt-lg">
            如有任何技術問題，請聯繫語言中心。
          </p>
        </div>
      </div>

      {verifiedStudent && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="student-confirm-title">
          <div className="card modal-card modal-card--sm">
            <h3 id="student-confirm-title" className="mb-md">確認學生資料</h3>
            <div className="student-confirm-list mb-lg">
              <div>
                <span className="text-sm text-secondary">校名</span>
                <strong>{verifiedStudent.schoolName}</strong>
              </div>
              <div>
                <span className="text-sm text-secondary">所屬班級</span>
                <strong>{verifiedStudent.className}</strong>
              </div>
              <div>
                <span className="text-sm text-secondary">學號</span>
                <strong>{verifiedStudent.studentId}</strong>
              </div>
              <div>
                <span className="text-sm text-secondary">姓名</span>
                <strong>{verifiedStudent.name}</strong>
              </div>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setVerifiedStudent(null)}
              >
                返回修改
              </button>
              <button type="button" className="btn btn-primary" onClick={confirmStudent}>
                確認進入考試
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default StudentLogin;
