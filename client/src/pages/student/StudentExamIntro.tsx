import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { studentsApi } from '../../api';
import { useStudentLocale } from '../../i18n/StudentLocaleContext';

type ExamPreview = {
  id: number;
  title: string;
  instructions?: string | null;
  difficulty?: string | null;
  timeLimit: number;
  questionCount: number;
  startTime: string;
  endTime: string;
  sessionStatus: string;
};

const StudentExamIntro: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { t, locale } = useStudentLocale();
  const [exam, setExam] = useState<ExamPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const studentData = localStorage.getItem('student');
  const student = studentData ? JSON.parse(studentData) : null;

  useEffect(() => {
    if (!student) {
      navigate('/student/login');
      return;
    }
    if (!examId) {
      navigate('/student/exams');
      return;
    }

    const fetchExam = async () => {
      try {
        const response = await studentsApi.getExamPreview(student.id, Number(examId));
        if (!response.data) {
          setError(t('examIntro.error'));
          return;
        }
        setExam(response.data);
      } catch {
        setError(t('examIntro.error'));
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [examId, navigate, student, t]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString(locale === 'en' ? 'en-US' : 'zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleProceed = () => {
    navigate(`/student/exam/${examId}`);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center" style={{ minHeight: '300px' }}>
          <div className="spinner" />
          <span className="text-secondary text-sm ml-sm">{t('examIntro.loading')}</span>
        </div>
      </Layout>
    );
  }

  if (error || !exam) {
    return (
      <Layout>
        <div className="card text-center py-3xl">
          <p className="text-danger">{error || t('examIntro.error')}</p>
          <button className="btn btn-secondary mt-lg" onClick={() => navigate('/student/exams')}>
            {t('examIntro.back')}
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col gap-lg">
        <div className="card">
          <div className="mb-lg">
            <h2 className="mb-xs">{exam.title}</h2>
            <p className="text-secondary">{t('examIntro.subtitle')}</p>
          </div>

          <div className="mb-xl">
            <h3 className="mb-sm">{t('examIntro.instructions')}</h3>
            <div className="text-pre-wrap text-secondary" style={{ lineHeight: 1.75 }}>
              {exam.instructions?.trim() || t('examIntro.noInstructions')}
            </div>
          </div>

          <div className="card" style={{ background: 'var(--color-bg-alt)' }}>
            <h4 className="mb-sm">{t('examIntro.examInfo')}</h4>
            <div className="flex flex-col gap-xs text-sm text-secondary">
              <div>{t('examIntro.questions')}: {exam.questionCount}</div>
              <div>{t('examIntro.duration')}: {exam.timeLimit} {t('examIntro.minutes')}</div>
              <div>{t('examIntro.opens')}: {formatDate(exam.startTime)}</div>
              <div>{t('examIntro.closes')}: {formatDate(exam.endTime)}</div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-between gap-md mt-xl">
            <button className="btn btn-secondary" onClick={() => navigate('/student/exams')}>
              {t('examIntro.back')}
            </button>
            <button className="btn btn-primary" onClick={handleProceed}>
              {exam.sessionStatus === 'in_progress' ? t('examIntro.continue') : t('examIntro.start')}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default StudentExamIntro;
