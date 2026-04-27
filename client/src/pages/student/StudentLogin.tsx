import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { authApi } from '../../api';
import { useStudentLocale } from '../../i18n/StudentLocaleContext';

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
  const { t } = useStudentLocale();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.studentVerify(studentId.trim());
      setVerifiedStudent(response.data.student);
    } catch (err: any) {
      setError(err.response?.data?.message || t('login.errorNotFound'));
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
            <h2 className="mb-xs">{t('login.title')}</h2>
            <p className="text-sm text-secondary">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">{t('login.label')}</label>
              <input
                type="text"
                className="form-input"
                placeholder={t('login.placeholder')}
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
              {loading ? <div className="spinner"></div> : t('login.query')}
            </button>
          </form>

          <p className="text-center text-xs text-secondary mt-lg">
            {t('login.footer')}
          </p>
        </div>
      </div>

      {verifiedStudent && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="student-confirm-title">
          <div className="card modal-card modal-card--sm">
            <h3 id="student-confirm-title" className="mb-md">{t('login.confirmTitle')}</h3>
            <div className="student-confirm-list mb-lg">
              <div>
                <span className="text-sm text-secondary">{t('login.school')}</span>
                <strong>{verifiedStudent.schoolName}</strong>
              </div>
              <div>
                <span className="text-sm text-secondary">{t('login.classLabel')}</span>
                <strong>{verifiedStudent.className}</strong>
              </div>
              <div>
                <span className="text-sm text-secondary">{t('login.studentId')}</span>
                <strong>{verifiedStudent.studentId}</strong>
              </div>
              <div>
                <span className="text-sm text-secondary">{t('login.name')}</span>
                <strong>{verifiedStudent.name}</strong>
              </div>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setVerifiedStudent(null)}
              >
                {t('login.backEdit')}
              </button>
              <button type="button" className="btn btn-primary" onClick={confirmStudent}>
                {t('login.confirmEnter')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default StudentLogin;
