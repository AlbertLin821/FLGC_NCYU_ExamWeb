import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import Layout from '../../components/Layout';
import { studentsApi } from '../../api';
import { useStudentLocale } from '../../i18n/StudentLocaleContext';
import { earnedPointsOnQuestion, sessionScorePercent } from '../../utils/sessionScore';

type AnswerRow = {
  id: number;
  content?: string | null;
  aiScore?: number | null;
  aiFeedback?: string | null;
  aiModel?: string | null;
  writingScore?: number | null;
  cefrLevel?: string | null;
  question?: {
    id: number;
    orderNum: number;
    type: string;
    content?: string | null;
    maxPoints?: number | null;
  } | null;
};

type StudentExamResultPayload = {
  exam: {
    id: number;
    title: string;
    questionCount: number;
    timeLimit: number;
  };
  session: null | {
    id: number;
    status: string;
    submittedAt?: string | null;
    overallFeedbackEn?: string | null;
    overallFeedbackZh?: string | null;
    hasAiQueued: boolean;
    hasAiGrading: boolean;
    hasPendingReview: boolean;
    queueState: {
      state: 'queued' | 'grading' | 'idle';
      position: number | null;
      total: number;
    };
    answers: AnswerRow[];
  };
};

function statusLabel(session: NonNullable<StudentExamResultPayload['session']>, t: (key: string, vars?: Record<string, string | number>) => string) {
  if (session.hasPendingReview) return t('result.statusPendingReview');
  if (session.hasAiGrading || session.queueState.state === 'grading') return t('result.statusGrading');
  if (session.hasAiQueued || session.queueState.state === 'queued' || session.status === 'submitted') return t('result.statusQueued');
  return t('result.statusDone');
}

const ExamResult: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { t, locale } = useStudentLocale();
  const [result, setResult] = React.useState<StudentExamResultPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const studentData = localStorage.getItem('student');
  const student = studentData ? JSON.parse(studentData) : null;

  const fetchResult = React.useCallback(async () => {
    if (!student?.id || !examId) return;
    try {
      const response = await studentsApi.getExamResult(student.id, Number(examId));
      if (!response.data) {
        setError(t('result.error'));
        return;
      }
      setResult(response.data);
      setError('');
    } catch {
      setError(t('result.error'));
    } finally {
      setLoading(false);
    }
  }, [examId, student?.id, t]);

  React.useEffect(() => {
    if (!student) {
      navigate('/student/login');
      return;
    }
    if (!examId) {
      navigate('/student/exams');
      return;
    }
    void fetchResult();
  }, [student, examId, navigate, fetchResult]);

  React.useEffect(() => {
    if (!result?.session) return;
    const shouldPoll =
      result.session.status === 'submitted' ||
      result.session.hasAiQueued ||
      result.session.hasAiGrading;
    if (!shouldPoll) return;

    const timer = window.setInterval(() => {
      void fetchResult();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [result, fetchResult]);

  const sortedAnswers = React.useMemo(
    () =>
      [...(result?.session?.answers || [])].sort(
        (a, b) => (a.question?.orderNum ?? 0) - (b.question?.orderNum ?? 0),
      ),
    [result?.session?.answers],
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center" style={{ minHeight: '300px' }}>
          <div className="spinner" />
          <span className="text-secondary text-sm ml-sm">{t('result.loading')}</span>
        </div>
      </Layout>
    );
  }

  if (error || !result?.exam || !result.session) {
    return (
      <Layout>
        <div className="card text-center py-3xl">
          <p className="text-danger">{error || t('result.error')}</p>
          <div className="card-actions justify-center">
            <Link to="/student/exams" className="btn btn-primary">{t('result.backList')}</Link>
          </div>
        </div>
      </Layout>
    );
  }

  const session = result.session;
  const showQueueBlock =
    session.status === 'submitted' ||
    session.hasAiQueued ||
    session.hasAiGrading;
  const isFullyGraded = session.status === 'graded' && !session.hasAiQueued && !session.hasAiGrading;
  const totalScore = sessionScorePercent(
    sortedAnswers.map((answer) => ({
      aiScore: answer.aiScore,
      question: answer.question ? { maxPoints: answer.question.maxPoints } : undefined,
    })),
  );

  return (
    <Layout>
      <div className="flex flex-col gap-lg">
        <div className="card">
          <div className="flex justify-center text-success mb-lg">
            <CheckCircle size={64} />
          </div>
          <h2 className="mb-sm text-center">{t('result.title')}</h2>
          <p className="text-secondary text-center mb-lg">{t('result.note')}</p>

          <div className="flex flex-col gap-sm text-sm mb-lg">
            <div><span className="font-bold">{t('result.examTitle')}：</span>{result.exam.title}</div>
            <div>
              <span className="font-bold">{t('result.submittedAt')}：</span>
              {result.session.submittedAt
                ? new Date(result.session.submittedAt).toLocaleString(locale === 'en' ? 'en-US' : 'zh-TW')
                : '—'}
            </div>
            <div><span className="font-bold">{t('result.currentStatus')}：</span>{statusLabel(result.session, t)}</div>
          </div>

          {showQueueBlock ? (
            <div className="card mb-lg" style={{ background: 'var(--color-bg-alt)' }}>
              <h3 className="mb-sm">{t('result.queueTitle')}</h3>
              {session.queueState.position && session.queueState.total ? (
                <p className="text-lg font-bold mb-xs">
                  {t('result.queueRank', {
                    n: session.queueState.position,
                    m: session.queueState.total,
                  })}
                </p>
              ) : (
                <p className="text-lg font-bold mb-xs">
                  {session.hasAiGrading ? t('result.queueGrading') : t('result.queueNoPosition')}
                </p>
              )}
              <p className="text-secondary mb-0">
                {session.hasAiGrading ? t('result.queueGrading') : t('result.queuePending')}
              </p>
              <p className="text-secondary text-sm mt-sm mb-0">{t('result.waitingHint')}</p>
            </div>
          ) : null}

          <div className="card mb-lg">
            <div className="flex justify-between items-center gap-md flex-wrap">
              <span className="font-bold">{t('result.scoreLabel')}</span>
              <span className="text-2xl font-bold text-primary">
                {isFullyGraded ? `${totalScore}` : '—'}
              </span>
            </div>
          </div>

          {(session.overallFeedbackZh || session.overallFeedbackEn) && (
            <div className="card mb-lg">
              <h3 className="mb-sm">{t('result.overallFeedback')}</h3>
              {session.overallFeedbackZh ? (
                <p className="mb-sm" style={{ whiteSpace: 'pre-wrap' }}>
                  {session.overallFeedbackZh}
                </p>
              ) : null}
              {session.overallFeedbackEn ? (
                <p className="text-secondary mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                  {session.overallFeedbackEn}
                </p>
              ) : null}
            </div>
          )}

          <div className="flex flex-col gap-md">
            {sortedAnswers.map((answer, index) => {
              const maxPoints = Math.max(1, Number(answer.question?.maxPoints) || 100);
              const hasScore = answer.aiScore !== null && answer.aiScore !== undefined;
              const earned = hasScore ? earnedPointsOnQuestion(answer.aiScore, answer.question?.maxPoints) : null;
              return (
                <div key={answer.id} className="card" style={{ background: 'var(--color-bg-alt)' }}>
                  <div className="flex justify-between items-start gap-md flex-wrap mb-sm">
                    <div>
                      <h4 className="mb-xs">{t('result.question', { n: answer.question?.orderNum ?? index + 1 })}</h4>
                      <div className="text-secondary text-sm" style={{ whiteSpace: 'pre-wrap' }}>
                        {answer.question?.content || '—'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">
                        {hasScore && earned !== null ? `${earned} / ${maxPoints}` : statusLabel(session, t)}
                      </div>
                      <div className="text-secondary text-sm">
                        {hasScore ? `${t('result.ratio')} ${Number(answer.aiScore)}%` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm mb-sm" style={{ whiteSpace: 'pre-wrap' }}>
                    <span className="font-bold">{locale === 'en' ? 'Answer' : '你的作答'}：</span>
                    {answer.content?.trim() || (locale === 'en' ? 'No answer' : '未作答')}
                  </div>

                  {answer.question?.type === 'paragraph_writing' &&
                  (answer.writingScore !== null || answer.cefrLevel) ? (
                    <div className="text-sm text-secondary mb-sm">
                      {answer.writingScore !== null && answer.writingScore !== undefined ? (
                        <span className="mr-md">0-5: {Number(answer.writingScore)} / 5</span>
                      ) : null}
                      {answer.cefrLevel ? <span>CEFR: {answer.cefrLevel}</span> : null}
                    </div>
                  ) : null}

                  <div className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>
                    <span className="font-bold">{t('result.answerFeedback')}：</span>
                    {answer.aiFeedback?.trim() || (locale === 'en' ? 'Pending AI grading.' : '等待 AI 批改中。')}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card-actions justify-center mt-xl">
            <Link to="/student/exams" className="btn btn-primary">{t('result.backList')}</Link>
            <Link to="/" className="btn btn-secondary">{t('result.home')}</Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ExamResult;
