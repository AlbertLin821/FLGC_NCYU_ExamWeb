import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navigate, useParams, useNavigate } from 'react-router-dom';
import { studentsApi, scoringApi } from '../../api';
import { earnedPointsOnQuestion, sessionScorePercent } from '../../utils/sessionScore';
import { describeAnswerScoring, questionTypeLabel } from '../../utils/answerModelLabel';
import { getTeacherRole } from '../../utils/teacherRole';

function sortSessionAnswers(answers: any[] | undefined) {
  return [...(answers || [])].sort(
    (a: any, b: any) => (a.question?.orderNum ?? 0) - (b.question?.orderNum ?? 0),
  );
}

function formatQuestionOptions(options: unknown): string | null {
  if (!options || !Array.isArray(options)) return null;
  const lines = options
    .map((o: any) => {
      if (o && typeof o === 'object' && ('label' in o || 'text' in o)) {
        const label = o.label != null ? String(o.label) : '';
        const text = o.text != null ? String(o.text) : '';
        return label ? `${label}. ${text}`.trim() : text;
      }
      return String(o);
    })
    .filter(Boolean);
  return lines.length ? lines.join('\n') : null;
}

function formatDuration(seconds: unknown): string {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m} 分 ${s} 秒`;
}

const AnswerCard: React.FC<{
  ans: any;
  idx: number;
  isViewer: boolean;
  savingAnswerId: number | null;
  onSave: (answerId: number, aiScore: number, aiFeedback: string) => Promise<void>;
}> = ({ ans, idx, isViewer, savingAnswerId, onSave }) => {
  const pending = ans.aiModel === 'pending_review';
  const aiGrading = ans.aiModel === 'ai_grading';
  const teacherManual = ans.aiModel === 'teacher_manual';
  const [scoreIn, setScoreIn] = useState('');
  const [fbIn, setFbIn] = useState('');

  useEffect(() => {
    setScoreIn(
      ans.aiScore !== null && ans.aiScore !== undefined ? String(Number(ans.aiScore)) : '',
    );
    setFbIn(ans.aiFeedback ? String(ans.aiFeedback) : '');
  }, [ans.id, ans.aiScore, ans.aiFeedback, ans.aiModel]);

  const hasScore = ans.aiScore !== null && ans.aiScore !== undefined;
  const maxPts = Math.max(1, Number(ans.question?.maxPoints) || 100);
  const qn = ans.question?.orderNum ?? idx + 1;
  const qType = questionTypeLabel(ans.question?.type);
  const promptText = (ans.question?.content && String(ans.question.content).trim()) || '（無題目文字）';
  const optionsText = formatQuestionOptions(ans.question?.options);
  const studentText = (ans.content && String(ans.content).trim()) || '（未作答）';
  const scoring = describeAnswerScoring(ans.aiModel);

  const submitManual = async () => {
    const v = parseFloat(scoreIn.replace(',', '.'));
    if (!Number.isFinite(v) || v < 0 || v > 100) {
      alert('請輸入 0 到 100 的百分制得分');
      return;
    }
    await onSave(ans.id, v, fbIn.trim());
  };

  return (
    <article
      className="rounded-lg overflow-hidden"
      style={{
        border: '1px solid var(--color-border)',
        borderLeft: '4px solid var(--color-primary)',
        boxShadow: 'var(--shadow-sm)',
        background: 'var(--color-bg-card)',
      }}
    >
      <header
        className="flex flex-wrap justify-between gap-sm items-start p-md"
        style={{
          background: 'var(--color-bg-alt)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div className="flex flex-wrap items-center gap-sm">
          <span className="badge badge-secondary">{qType}</span>
          <span className="font-bold" style={{ color: 'var(--color-text)' }}>
            第 {qn} 題
          </span>
          <span className="text-xs text-secondary">配分 {maxPts} 分</span>
        </div>
        <div className="flex flex-wrap gap-xs items-center justify-end">
          {hasScore && (
            <span className="badge badge-primary">
              {teacherManual ? '教師評分 ' : ''}
              得分 {earnedPointsOnQuestion(ans.aiScore, ans.question?.maxPoints)} / {maxPts} 分
              <span className="ml-xs opacity-90">（百分制 {Number(ans.aiScore)}）</span>
            </span>
          )}
          {pending && <span className="badge badge-warning">待教師複閱</span>}
          {aiGrading && <span className="badge badge-warning">AI 批改中</span>}
          {!hasScore && !pending && !aiGrading && <span className="badge badge-secondary">未評分</span>}
        </div>
      </header>

      <div className="p-md flex flex-col gap-md">
        <section>
          <h5 className="text-xs font-bold text-secondary uppercase tracking-wide mb-xs">題目敘述</h5>
          <div
            className="p-md rounded-md text-sm"
            style={{
              background: 'var(--color-bg-alt)',
              color: 'var(--color-text)',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.65,
            }}
          >
            {promptText}
          </div>
          {optionsText && (
            <div className="mt-sm">
              <h5 className="text-xs font-bold text-secondary mb-xs">選項</h5>
              <pre
                className="p-sm rounded-md text-sm"
                style={{
                  background: 'var(--color-bg)',
                  border: '1px dashed var(--color-border)',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                  margin: 0,
                }}
              >
                {optionsText}
              </pre>
            </div>
          )}
        </section>

        <section>
          <h5 className="text-xs font-bold text-secondary uppercase tracking-wide mb-xs">學生作答</h5>
          <div
            className="p-md rounded-md text-sm"
            style={{
              border: '1px solid var(--color-border)',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.65,
            }}
          >
            {studentText}
          </div>
        </section>

        <div
          className="text-xs flex flex-wrap gap-x-lg gap-y-xs py-sm px-md rounded-md"
          style={{ background: '#f1f5f9', color: 'var(--color-text-secondary)' }}
        >
          <span>
            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
              評分來源：
            </span>
            {scoring.source}
          </span>
          {scoring.model && (
            <span>
              <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                模型：
              </span>
              {scoring.model}
            </span>
          )}
        </div>

        {(ans.question?.type === 'essay' || ans.question?.type === 'paragraph_writing') && (
          <div
            className="text-xs flex flex-wrap gap-x-lg gap-y-xs py-sm px-md rounded-md"
            style={{ background: '#f8fafc', color: 'var(--color-text-secondary)' }}
          >
            <span>
              <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                寫作時間：
              </span>
              {formatDuration(ans.writingDurationSeconds)}
            </span>
            <span>
              <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                寫作字數：
              </span>
              {Number(ans.wordCount) || 0}
            </span>
            {ans.question?.type === 'paragraph_writing' && ans.writingScore !== null && ans.writingScore !== undefined && (
              <span>
                <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                  TOEFL 分數：
                </span>
                {Number(ans.writingScore)} / 5
              </span>
            )}
            {ans.cefrLevel && (
              <span>
                <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                  CEFR：
                </span>
                {ans.cefrLevel}
              </span>
            )}
          </div>
        )}

        {ans.aiFeedback && (
          <div
            className="text-sm p-md rounded-md"
            style={{
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
            }}
          >
            <span className="font-bold">{pending || aiGrading ? '系統訊息' : '評語與回饋'}</span>
            <p className="mt-xs mb-0" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
              {ans.aiFeedback}
            </p>
          </div>
        )}

        {false && pending && !isViewer && (
          <div
            className="p-md rounded-md border border-dashed"
            style={{ borderColor: '#94a3b8', background: 'var(--color-bg)' }}
          >
            <div className="flex flex-col gap-md sm:flex-row sm:flex-wrap sm:items-end">
              <div className="flex flex-col gap-xs w-full sm:w-[8rem] sm:shrink-0">
                <label htmlFor={`teacher-score-${ans.id}`} className="text-sm leading-snug">
                  百分制得分
                </label>
                <input
                  id={`teacher-score-${ans.id}`}
                  type="number"
                  className="form-input w-full"
                  min={0}
                  max={100}
                  step={0.5}
                  value={scoreIn}
                  onChange={(e) => setScoreIn(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-xs flex-1 min-w-0 w-full sm:min-w-[12rem]">
                <label htmlFor={`teacher-fb-${ans.id}`} className="text-sm leading-snug">
                  回饋
                </label>
                <input
                  id={`teacher-fb-${ans.id}`}
                  type="text"
                  className="form-input w-full"
                  value={fbIn}
                  onChange={(e) => setFbIn(e.target.value)}
                  placeholder="例如：文法尚可，字數不足"
                />
              </div>
              <div className="flex sm:shrink-0 sm:self-end">
                <button
                  type="button"
                  className="btn btn-primary w-full sm:w-auto"
                  disabled={savingAnswerId === ans.id}
                  onClick={() => void submitManual()}
                >
                  {savingAnswerId === ans.id ? '儲存中…' : '儲存教師評分'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </article>
  );
};

const StudentResultDetail: React.FC = () => {
  const role = getTeacherRole();
  const isViewer = role === 'viewer';
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingAnswerId, setSavingAnswerId] = useState<number | null>(null);

  useEffect(() => {
    const id = studentId ? Number(studentId) : NaN;
    if (!studentId || !Number.isFinite(id) || id <= 0) {
      alert('無效的學生編號');
      navigate('/teacher/results');
      return;
    }
    studentsApi
      .getById(id)
      .then((res) => {
        setStudent(res.data);
        setLoading(false);
      })
      .catch(() => {
        alert('找不到學生資料');
        navigate('/teacher/results');
      });
  }, [studentId, navigate]);

  const reloadStudent = useCallback(() => {
    const id = studentId ? Number(studentId) : NaN;
    if (!Number.isFinite(id) || id <= 0) return;
    studentsApi.getById(id).then((res) => setStudent(res.data));
  }, [studentId]);

  const sortedSessions = useMemo(() => {
    if (!student?.sessions?.length) return [];
    return [...student.sessions].sort(
      (a: any, b: any) =>
        new Date(b.exam?.endTime ?? 0).getTime() - new Date(a.exam?.endTime ?? 0).getTime(),
    );
  }, [student]);

  if (role === 'teacher') {
    return <Navigate to="/teacher/exams" replace />;
  }

  if (loading || !student) return <div className="spinner"></div>;

  return (
    <div className="fade-in">
      <div className="page-header mb-xl">
        <div>
          <h3 className="mb-xs">{student.name}</h3>
          <p className="text-secondary text-sm mb-0">
            學號 {student.studentId} — 考試歷程與題目成績
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
          返回
        </button>
      </div>

      {student.sessions.length === 0 ? (
        <div className="card text-center py-3xl text-secondary">尚無考試紀錄</div>
      ) : (
        <div className="flex flex-col gap-xl">
          {sortedSessions.map((session: any) => {
            const answersSorted = sortSessionAnswers(session.answers);
            const showWeightedBlock =
              (session.status === 'graded' || session.status === 'submitted') &&
              answersSorted.length > 0;

            return (
              <div key={session.id} className="card">
                <div className="flex flex-col gap-md lg:flex-row lg:justify-between lg:items-start mb-lg">
                  <div className="min-w-0 flex-1">
                    <h4 className="mb-xs" style={{ fontSize: 'var(--font-size-xl)' }}>
                      {session.exam?.title ?? '（已下架考卷）'}
                    </h4>
                    <p className="text-sm text-secondary mb-0">
                      提交時間：
                      {session.submittedAt
                        ? new Date(session.submittedAt).toLocaleString('zh-TW')
                        : '未提交'}
                    </p>
                  </div>
                  <div className="flex flex-col items-start lg:items-end gap-sm shrink-0">
                    <span
                      className={`badge ${session.status === 'graded' ? 'badge-success' : 'badge-warning'}`}
                    >
                      {session.status === 'graded' ? '評分完成' : '待處理'}
                    </span>
                    {showWeightedBlock && (
                      <div
                        className="text-2xl font-bold text-primary tabular-nums"
                      >
                        加權得分 {sessionScorePercent(session.answers)} 分
                      </div>
                    )}
                  </div>
                </div>

                {showWeightedBlock && (
                  <div className="table-container mb-lg">
                    <table className="table table--compact" style={{ fontSize: 'var(--font-size-sm)' }}>
                      <thead>
                        <tr>
                          <th>題號</th>
                          <th>題型</th>
                          <th>得分</th>
                          <th>百分制</th>
                        </tr>
                      </thead>
                      <tbody>
                        {answersSorted.map((ans: any, idx: number) => {
                          const qn = ans.question?.orderNum ?? idx + 1;
                          const maxPts = Math.max(1, Number(ans.question?.maxPoints) || 100);
                          const hasScore = ans.aiScore !== null && ans.aiScore !== undefined;
                          const pct = hasScore ? Number(ans.aiScore) : null;
                          const earned = hasScore
                            ? earnedPointsOnQuestion(ans.aiScore, ans.question?.maxPoints)
                            : null;
                          return (
                            <tr key={`sum-${ans.id}`}>
                              <td className="font-medium">第 {qn} 題</td>
                              <td className="text-secondary">{questionTypeLabel(ans.question?.type)}</td>
                              <td>
                                {hasScore && earned !== null ? `${earned} / ${maxPts} 分` : '—'}
                              </td>
                              <td className="text-secondary">
                                {pct !== null && Number.isFinite(pct) ? `${pct} 分` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {(session.overallFeedbackZh || session.overallFeedbackEn) && (
                  <div
                    className="p-md mb-lg rounded-md text-sm"
                    style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}
                  >
                    <div className="font-bold mb-xs">整卷總評（集體批閱）</div>
                    {session.overallFeedbackZh && (
                      <p className="mb-xs" style={{ whiteSpace: 'pre-wrap' }}>
                        {session.overallFeedbackZh}
                      </p>
                    )}
                    {session.overallFeedbackEn && (
                      <p className="text-secondary mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                        {session.overallFeedbackEn}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-lg">
                  {answersSorted.map((ans: any, idx: number) => (
                    <AnswerCard
                      key={ans.id}
                      ans={ans}
                      idx={idx}
                      isViewer={isViewer}
                      savingAnswerId={savingAnswerId}
                      onSave={async (answerId, aiScore, aiFeedback) => {
                        setSavingAnswerId(answerId);
                        try {
                          await scoringApi.manualGradeAnswer(answerId, {
                            aiScore,
                            aiFeedback,
                          });
                          reloadStudent();
                        } catch {
                          alert('儲存失敗，請稍後再試');
                        } finally {
                          setSavingAnswerId(null);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentResultDetail;
