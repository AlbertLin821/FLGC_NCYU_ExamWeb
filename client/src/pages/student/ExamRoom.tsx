import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { cheatApi, examsApi, getServerOrigin } from '../../api';
import { useCheatSocketStatus } from '../../hooks/useCheatSocketStatus';
import { useStudentLocale } from '../../i18n/StudentLocaleContext';
import { getStudentExamSocketLine, getStudentString } from '../../i18n/studentMessages';

interface Question {
  id: number;
  type: string;
  content?: string;
  options?: any;
  orderNum: number;
}

function isWritingQuestion(type: string | undefined): boolean {
  return type === 'essay' || type === 'paragraph_writing';
}

function countEnglishWords(input: string): number {
  const matches = String(input || '').trim().match(/[A-Za-z]+(?:[-'][A-Za-z]+)*/g);
  return matches ? matches.length : 0;
}

function hasGrammarExtensionArtifacts(): boolean {
  if (typeof document === 'undefined') return false;
  const root = document.documentElement;
  if (
    root.hasAttribute('data-new-gr-c-s-check-loaded') ||
    root.hasAttribute('data-gr-ext-installed')
  ) {
    return true;
  }
  return Boolean(
    document.querySelector(
      'grammarly-extension, grammarly-popups, [data-grammarly-shadow-root], [data-grammarly-part], [id^="grammarly"], [class*="grammarly"]',
    ),
  );
}

const ExamRoom: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { locale, t } = useStudentLocale();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [session, setSession] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseMessage, setPauseMessage] = useState('');

  const socketRef = useRef<Socket | null>(null);
  const [examSocket, setExamSocket] = useState<Socket | null>(null);
  const wsStatus = useCheatSocketStatus(examSocket);
  const hasSubmittedRef = useRef(false);
  const initExamStartedRef = useRef(false);
  /** 進入考場後短暫忽略 visibility/blur，避免重新整理或分頁還原時誤判作弊而暫停 */
  const cheatGuardReadyRef = useRef(false);
  /** 僅在「曾進入全螢幕後又退出」時通報，避免載入時預設非全螢幕誤判 */
  const hadFullscreenRef = useRef(false);
  /** 重新整理／關閉分頁時會觸發 blur，不應記為作弊（否則 reload 後 session 被後端設為 paused） */
  const pageLeaveRef = useRef(false);
  /** 問答題週期性自動儲存：不早於 45 秒重複寫入同一草稿 */
  const lastEssaySavedContentRef = useRef<string>('');
  const userAnswerRef = useRef(userAnswer);
  const cheatReportedRef = useRef(false);
  const questionEnteredAtRef = useRef(Date.now());
  const student = JSON.parse(localStorage.getItem('student') || '{}');

  const applyExamState = useCallback((payload: any) => {
    const nextSession = payload?.session;
    const nextQuestions = payload?.questions;
    if (Array.isArray(nextQuestions) && nextQuestions.length > 0) {
      setQuestions(nextQuestions);
    }
    if (nextSession) {
      setSession(nextSession);
      if (nextSession.status === 'paused') {
        setIsPaused(true);
        setPauseMessage(getStudentString(locale, 'exam.pauseWaitTeacher'));
      } else {
        setIsPaused(false);
        setPauseMessage('');
      }
    }
    if (typeof payload?.timeRemainingSeconds === 'number') {
      setTimeLeft(payload.timeRemainingSeconds);
    } else if (typeof payload?.timeLimit === 'number') {
      setTimeLeft(payload.timeLimit * 60);
    }
  }, [locale]);

  const syncExamState = useCallback(async () => {
    if (!examId || !student.id) return;
    const response = await examsApi.start(Number(examId), student.id);
    applyExamState(response.data);
  }, [applyExamState, examId, student.id]);

  // Anti-cheat: Fullscreen, Visibility, Blur
  const reportCheat = useCallback((type: string, details?: any) => {
    if (!session || cheatReportedRef.current) return;
    cheatReportedRef.current = true;
    const payload = {
      sessionId: session.id,
      eventType: type,
      details,
    };
    if (socketRef.current?.connected) {
      socketRef.current.emit('cheat:report', payload);
    }
    void cheatApi.report(payload.sessionId, payload.eventType, payload.details).catch(() => {
      /* WebSocket 已盡量即時送出；HTTP fallback 失敗時保留暫停畫面，待重新同步 */
    });
    setSession((prev: any) => (prev ? { ...prev, status: 'paused' } : prev));
    setIsPaused(true);
    setPauseMessage(
      type === 'grammar_extension'
        ? getStudentString(locale, 'exam.pauseGrammarExtension')
        : getStudentString(locale, 'exam.pauseForced'),
    );
  }, [session, locale]);

  useEffect(() => {
    userAnswerRef.current = userAnswer;
  }, [userAnswer]);

  const handleVisibilityChange = useCallback(() => {
    if (!cheatGuardReadyRef.current) return;
    if (pageLeaveRef.current) return;
    if (document.hidden && session && !isPaused) {
      reportCheat('tab_switch');
    }
  }, [session, isPaused, reportCheat]);

  const handleBlur = useCallback(() => {
    if (!cheatGuardReadyRef.current) return;
    if (pageLeaveRef.current) return;
    if (session && !isPaused) {
      reportCheat('window_blur');
    }
  }, [session, isPaused, reportCheat]);

  useEffect(() => {
    const onPageHide = () => {
      pageLeaveRef.current = true;
    };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, []);

  useEffect(() => {
    // Anti-cheat: Fullscreen & Disable shortcuts
    const handleContext = (e: MouseEvent) => e.preventDefault();
    const handleCopy = (e: ClipboardEvent) => e.preventDefault();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContext);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('keydown', handleKey);

    // Prompt for fullscreen if not already
    if (!document.fullscreenElement) {
        // Most browsers require user interaction for this, so we add a listener to the first click
        const reqFS = () => {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => {});
            }
            document.removeEventListener('click', reqFS);
        };
        document.addEventListener('click', reqFS);
    }
    
    return () => {
      document.removeEventListener('contextmenu', handleContext);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('keydown', handleKey);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (!session || isPaused) return;
    if (hasGrammarExtensionArtifacts()) {
      reportCheat('grammar_extension', { source: 'detected_on_mount' });
      return;
    }

    const observer = new MutationObserver(() => {
      if (hasGrammarExtensionArtifacts()) {
        observer.disconnect();
        reportCheat('grammar_extension', { source: 'mutation_observer' });
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['data-new-gr-c-s-check-loaded', 'data-gr-ext-installed', 'class', 'id'],
    });

    return () => observer.disconnect();
  }, [session, isPaused, reportCheat]);

  useEffect(() => {
    initExamStartedRef.current = false;
  }, [examId]);

  useEffect(() => {
    if (!session?.id) return;
    cheatReportedRef.current = false;
  }, [session?.id]);

  useEffect(() => {
    if (!student.id) {
      navigate('/student/login');
      return;
    }
    if (initExamStartedRef.current) {
      return;
    }
    initExamStartedRef.current = true;

    const initExam = async () => {
      try {
        const response = await examsApi.start(Number(examId), student.id);
        const { session } = response.data;
        applyExamState(response.data);

        // Setup WebSocket（namespace /cheat 掛在 HTTP origin，非 /api 底下）
        const origin = getServerOrigin();
        const socket = io(`${origin}/cheat`, { 
          withCredentials: true,
          reconnectionAttempts: 5,
        });
        socketRef.current = socket;
        setExamSocket(socket);

        socket.on('connect_error', () => {
          /* 狀態由 useCheatSocketStatus 顯示於 UI */
        });

        socket.on(`session:${session.id}:resume`, (data) => {
          cheatReportedRef.current = false;
          setIsPaused(false);
          setPauseMessage('');
          setSession((prev: any) => (prev ? { ...prev, status: 'in_progress' } : prev));
          alert(data.message);
        });

        socket.on(`session:${session.id}:terminated`, (data) => {
          setSession((prev: any) => (prev ? { ...prev, status: 'submitted' } : prev));
          alert(data.message);
          navigate('/student/exams');
        });

        socket.on('exam:paused', (data) => {
          setSession((prev: any) => (prev ? { ...prev, status: 'paused' } : prev));
          setIsPaused(true);
          setPauseMessage(data.message);
        });

      } catch (err: any) {
        if (err?.response?.status !== 404) {
          console.error('initExam error:', err);
        }
        alert(err.response?.data?.message || getStudentString(locale, 'exam.alertEnterFail'));
        navigate('/student/exams');
      } finally {
        setLoading(false);
      }
    };

    initExam();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      setExamSocket(null);
    };
  }, [applyExamState, examId, student.id, navigate, locale]);

  useEffect(() => {
    if (!session?.id) return;

    const handlePageShow = () => {
      pageLeaveRef.current = false;
      void syncExamState().catch(() => {
        /* 狀態同步失敗時，維持既有畫面並交由後續請求處理 */
      });
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [session?.id, syncExamState]);

  useEffect(() => {
    if (!session?.id) return;

    window.history.pushState({ examRoom: true }, '', window.location.href);
    const handlePopState = () => {
      if (!hasSubmittedRef.current && session.status !== 'submitted' && session.status !== 'graded') {
        reportCheat('browser_back');
        window.history.pushState({ examRoom: true }, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [reportCheat, session]);

  const handleFullscreenChange = useCallback(() => {
    const nowFs = !!document.fullscreenElement;
    const wasFs = hadFullscreenRef.current;
    hadFullscreenRef.current = nowFs;
    if (!cheatGuardReadyRef.current) return;
    if (wasFs && !nowFs && session && !isPaused) {
      reportCheat('exit_fullscreen');
    }
  }, [session, isPaused, reportCheat]);

  useEffect(() => {
    if (!session) {
      cheatGuardReadyRef.current = false;
      return;
    }
    cheatGuardReadyRef.current = false;
    const t = window.setTimeout(() => {
      cheatGuardReadyRef.current = true;
    }, 2500);
    return () => window.clearTimeout(t);
  }, [session]);

  useEffect(() => {
    if (!session || isPaused) return;

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [session, isPaused, handleVisibilityChange, handleBlur, handleFullscreenChange]);

  useEffect(() => {
    lastEssaySavedContentRef.current = '';
    questionEnteredAtRef.current = Date.now();
  }, [currentIdx, questions[currentIdx]?.id]);

  const currentWritingMetrics = useCallback((text: string) => {
    return {
      writingDurationSeconds: Math.max(0, Math.round((Date.now() - questionEnteredAtRef.current) / 1000)),
      wordCount: countEnglishWords(text),
    };
  }, []);

  useEffect(() => {
    if (!session?.id || isPaused || loading) return;
    const q = questions[currentIdx];
    if (!isWritingQuestion(q?.type)) return;

    const id = window.setInterval(() => {
      if (hasSubmittedRef.current) return;
      const draft = userAnswerRef.current;
      if (draft === lastEssaySavedContentRef.current) return;
      if (!String(draft).trim()) return;
      void (async () => {
        try {
          await examsApi.submitAnswer(session.id, q.id, draft, currentWritingMetrics(draft));
          lastEssaySavedContentRef.current = draft;
        } catch {
          // 週期儲存失敗時不阻斷作答；下一題或下次 interval 可再試
        }
      })();
    }, 45_000);

    return () => clearInterval(id);
  }, [session, session?.id, isPaused, loading, currentIdx, questions, currentWritingMetrics]);

  const handleSubmitExam = useCallback(async () => {
    if (!session?.id || hasSubmittedRef.current) return;
    if (isPaused || session.status === 'paused') {
      setIsPaused(true);
      setPauseMessage(getStudentString(locale, 'exam.pauseWaitTeacher'));
      return;
    }
    hasSubmittedRef.current = true;
    setSubmitting(true);
    try {
      const q = questions[currentIdx];
      if (q) {
        await examsApi.submitAnswer(
          session.id,
          q.id,
          userAnswer,
          isWritingQuestion(q.type) ? currentWritingMetrics(userAnswer) : undefined,
        );
      }
      await examsApi.submit(session.id);
      try {
        sessionStorage.setItem(
          'examSubmitMeta',
          JSON.stringify({ submittedAt: Date.now(), grading: 'async' }),
        );
      } catch {
        /* ignore storage errors */
      }
      navigate(`/student/result/${examId}`);
    } catch {
      hasSubmittedRef.current = false;
      alert(getStudentString(locale, 'exam.alertSubmitFail'));
    } finally {
      setSubmitting(false);
    }
  }, [session, isPaused, questions, currentIdx, userAnswer, navigate, locale, currentWritingMetrics]);

  // Timer：每秒遞減（與後端 timeRemainingSeconds 對齊後，仍以本地倒數顯示；重新進入頁面會再向後端取剩餘時間）
  useEffect(() => {
    if (timeLeft <= 0 || isPaused || loading || !session) return;
    const timer = setTimeout(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, isPaused, loading, session]);

  useEffect(() => {
    if (timeLeft !== 0 || !session || loading || isPaused || hasSubmittedRef.current) return;
    void handleSubmitExam();
  }, [timeLeft, session, loading, isPaused, handleSubmitExam]);

  const handleNext = async () => {
    if (isPaused || session?.status === 'paused') {
      setIsPaused(true);
      setPauseMessage(getStudentString(locale, 'exam.pauseWaitTeacher'));
      return;
    }
    const q = questions[currentIdx];
    const isWriting = isWritingQuestion(q?.type);
    if (!isWriting && !userAnswer.trim()) {
      alert(getStudentString(locale, 'exam.alertAnswerFirst'));
      return;
    }

    setSubmitting(true);
    try {
      await examsApi.submitAnswer(
        session.id,
        q.id,
        userAnswer,
        isWriting ? currentWritingMetrics(userAnswer) : undefined,
      );
      if (isWriting) {
        lastEssaySavedContentRef.current = userAnswer;
      }
      if (currentIdx < questions.length - 1) {
        setCurrentIdx(currentIdx + 1);
        setUserAnswer('');
      } else {
        await handleSubmitExam();
      }
    } catch {
      alert(getStudentString(locale, 'exam.alertSaveFail'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectionChange = (val: string, multi: boolean) => {
    if (multi) {
      const current = userAnswer ? userAnswer.split(',') : [];
      const updated = current.includes(val) 
        ? current.filter(v => v !== val) 
        : [...current, val];
      setUserAnswer(updated.sort().join(','));
    } else {
      setUserAnswer(val);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-md">
        <div className="spinner" />
        <span className="text-secondary text-sm">{t('exam.loading')}</span>
      </div>
    );
  }

  if (isPaused) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-alt">
        <div className="card modal-card modal-card--md text-center">
          <div className="flex justify-center text-warning mb-lg">
            <AlertTriangle size={64} />
          </div>
          <h2 className="mb-md">{t('exam.pausedTitle')}</h2>
          <p className="mb-lg text-secondary">{pauseMessage || t('exam.pauseDefault')}</p>
          <div className="alert alert-warning">{t('exam.pauseKeepOpen')}</div>
        </div>
      </div>
    );
  }

  const q = questions[currentIdx];

  return (
    <div className="page bg-alt">
      <div className="container" style={{ paddingTop: '0.5rem' }}>
        <div
          role="status"
          data-testid="exam-ws-status"
          className={`text-sm ${wsStatus === 'connected' ? 'text-secondary' : 'alert alert-warning'}`}
        >
          {getStudentExamSocketLine(locale, wsStatus)}
        </div>
      </div>
      <div className="header" style={{ position: 'relative' }}>
        <div className="container header-inner exam-room-bar">
          <div className="flex items-center gap-lg min-w-0">
            <span className="badge badge-primary">{t('exam.inProgress')}</span>
            {session ? (
              <span className="min-w-0" style={{ fontWeight: 600, lineHeight: 1.35 }}>
                {session.exam?.title || t('exam.loading')}
              </span>
            ) : (
              <span style={{ fontWeight: 600 }}>{t('exam.loading')}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-md shrink-0">
            <div className={`text-lg font-bold ${timeLeft < 60 ? 'text-danger' : ''}`}>
              {t('exam.timeLeft')}: {formatTime(timeLeft)}
            </div>
            <div className="text-secondary text-sm">
              {t('exam.progress')}: {currentIdx + 1} / {questions.length}
            </div>
          </div>
        </div>
      </div>

      <div className="container content py-xl" style={{ paddingBottom: 'max(var(--space-xl), env(safe-area-inset-bottom, 0px))' }}>
        <div className="card mx-auto w-full exam-panel">
          <div className="mb-2xl">
            <h3 className="mb-lg">{t('exam.question', { n: currentIdx + 1 })}</h3>
            
            <div className="mb-xl text-lg font-medium text-pre-wrap">
              {q?.content}
            </div>
          </div>

          <div className="form-group mb-2xl">
            {q?.type === 'multiple_choice' || q?.type === 'multiple_selection' ? (
              <div className="flex flex-col gap-md">
                {q.options?.map((opt: string, i: number) => {
                  const label = String.fromCharCode(65 + i);
                  const isSelected = q.type === 'multiple_selection' 
                    ? userAnswer.split(',').includes(label)
                    : userAnswer === label;
                  
                  return (
                    <div 
                      key={i} 
                      className={`card p-md pointer choice-card flex items-center gap-md border-2 transition-all ${isSelected ? 'border-primary bg-primary-light bg-opacity-10' : 'hover:border-secondary'}`}
                      onClick={() => handleSelectionChange(label, q.type === 'multiple_selection')}
                      style={{ border: isSelected ? '2px solid var(--color-primary)' : '2px solid transparent', background: isSelected ? 'var(--color-primary-light)' : 'white' }}
                    >
                      <div className={`option-marker flex items-center justify-center rounded-full font-bold ${isSelected ? 'bg-primary text-white' : 'bg-alt text-secondary'}`} style={{ background: isSelected ? 'var(--color-primary)' : '#f0f4f8', color: isSelected ? 'white' : '#64748b' }}>
                        {label}
                      </div>
                      <div className="text-md min-w-0">{opt}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                <textarea
                  className="form-input answer-textarea"
                  placeholder={
                    q?.type === 'paragraph_writing'
                      ? t('exam.paragraphPlaceholder')
                      : t('exam.essayPlaceholder')
                  }
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  disabled={submitting}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  data-gramm="false"
                  data-gramm_editor="false"
                  data-enable-grammarly="false"
                />
                {q?.type === 'paragraph_writing' && (
                  <div className="text-xs text-secondary mt-xs">
                    {t('exam.wordCount')}: {countEnglishWords(userAnswer)}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex flex-col-reverse gap-md sm:flex-row sm:flex-wrap justify-between items-stretch sm:items-center">
            <div className="text-xs text-secondary self-center sm:self-auto text-center sm:text-left">
              {isWritingQuestion(q?.type) ? t('exam.hintEssay') : t('exam.hintChoice')}
            </div>
            <button
              className="btn btn-primary btn-lg w-full sm:w-auto shrink-0"
              onClick={handleNext}
              disabled={submitting}
            >
              {submitting ? <div className="spinner"></div> : currentIdx === questions.length - 1 ? t('exam.submit') : t('exam.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamRoom;
