import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { studentsApi } from '../../api';
import { useStudentLocale } from '../../i18n/StudentLocaleContext';
import { getStudentString } from '../../i18n/studentMessages';

interface Exam {
  id: number;
  title: string;
  difficulty: string;
  timeLimit: number;
  questionCount: number;
  startTime: string;
  endTime: string;
  sessionStatus: string;
}

const StudentExams: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { t, locale } = useStudentLocale();

  const studentData = localStorage.getItem('student');
  const student = studentData ? JSON.parse(studentData) : null;

  useEffect(() => {
    if (!student) {
      navigate('/student/login');
      return;
    }

    const fetchExams = async () => {
      try {
        const response = await studentsApi.getExams(student.id);
        setExams(response.data);
      } catch {
        setError(getStudentString(locale, 'exams.errorFetch'));
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, [student, navigate, locale]);

  const handleStartExam = (examId: number) => {
    navigate(`/student/exam/${examId}`);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(locale === 'en' ? 'en-US' : 'zh-TW', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center" style={{ minHeight: '300px' }}>
          <div className="spinner"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-xl">
        <h2 className="mb-xs">{t('exams.greeting', { name: student?.name ?? '' })}</h2>
        <p className="text-secondary text-sm">
          {t('exams.metaSchool')}: {student?.schoolName ?? '—'} | {t('exams.metaClass')}: {student?.className ?? '—'} | {t('exams.metaId')}: {student?.studentId} | {t('exams.metaName')}: {student?.name}
        </p>
        <p className="text-secondary text-sm">{t('exams.intro')}</p>
      </div>

      {error ? (
        <div className="alert alert-danger">{error}</div>
      ) : exams.length === 0 ? (
        <div className="card text-center py-3xl">
          <p className="text-secondary">{t('exams.empty')}</p>
        </div>
      ) : (
        <div className="exam-card-grid">
          {exams.map((exam) => (
            <div key={exam.id} className="card flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center flex-wrap gap-sm mb-md">
                  <span className={`badge ${
                    exam.difficulty === 'hard' ? 'badge-danger' :
                    exam.difficulty === 'medium' ? 'badge-warning' : 'badge-success'
                  }`}>
                    {exam.difficulty === 'hard' ? t('exams.diffHard') :
                     exam.difficulty === 'medium' ? t('exams.diffMedium') : t('exams.diffEasy')}
                  </span>
                  <span className="text-xs text-secondary">
                    {exam.questionCount} {t('exams.questions')} | {exam.timeLimit} {t('exams.minutes')}
                  </span>
                </div>
                <h3 className="mb-sm">{exam.title}</h3>
                <div className="text-xs text-secondary mt-md">
                  <div>{t('exams.opens')}: {formatDate(exam.startTime)}</div>
                  <div>{t('exams.closes')}: {formatDate(exam.endTime)}</div>
                </div>
              </div>

              <div className="mt-xl">
                {exam.sessionStatus === 'submitted' || exam.sessionStatus === 'graded' ? (
                  <button className="btn btn-secondary w-full" disabled>{t('exams.done')}</button>
                ) : (
                  <button
                    className="btn btn-primary w-full"
                    onClick={() => handleStartExam(exam.id)}
                  >
                    {exam.sessionStatus === 'in_progress' ? t('exams.continue') : t('exams.enter')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
};

export default StudentExams;
