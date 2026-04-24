import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { examsApi, getServerOrigin } from '../../api';
import { cheatSocketStatusMessage, useCheatSocketStatus } from '../../hooks/useCheatSocketStatus';

interface Question {
  id: number;
  type: string;
  content?: string;
  options?: any;
  orderNum: number;
}

const ExamRoom: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

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
  const student = JSON.parse(localStorage.getItem('student') || '{}');

  // Anti-cheat: Fullscreen, Visibility, Blur
  const reportCheat = useCallback((type: string, details?: any) => {
    if (socketRef.current && session) {
      socketRef.current.emit('cheat:report', {
        sessionId: session.id,
        eventType: type,
        details
      });
      setIsPaused(true);
    }
  }, [session]);

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
    initExamStartedRef.current = false;
  }, [examId]);

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
        const { session, questions, timeLimit, timeRemainingSeconds } = response.data;
        setQuestions(questions);
        setSession(session);
        const initialSeconds =
          typeof timeRemainingSeconds === 'number'
            ? timeRemainingSeconds
            : timeLimit * 60;
        setTimeLeft(initialSeconds);

        // Resume if already in progress
        if (session.status === 'paused') {
          setIsPaused(true);
          setPauseMessage('測驗暫停中，請帶老師處理');
        }

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
          setIsPaused(false);
          alert(data.message);
        });

        socket.on(`session:${session.id}:terminated`, (data) => {
          alert(data.message);
          navigate('/student/exams');
        });

        socket.on('exam:paused', (data) => {
          setIsPaused(true);
          setPauseMessage(data.message);
        });

      } catch (err: any) {
        if (err?.response?.status !== 404) {
          console.error('initExam error:', err);
        }
        alert(err.response?.data?.message || '進入考場失敗');
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
  }, [examId, student.id, navigate]);

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
  }, [currentIdx, questions[currentIdx]?.id]);

  useEffect(() => {
    if (!session?.id || isPaused || loading) return;
    const q = questions[currentIdx];
    if (q?.type !== 'essay') return;

    const id = window.setInterval(() => {
      if (hasSubmittedRef.current) return;
      const draft = userAnswerRef.current;
      if (draft === lastEssaySavedContentRef.current) return;
      if (!String(draft).trim()) return;
      void (async () => {
        try {
          await examsApi.submitAnswer(session.id, q.id, draft);
          lastEssaySavedContentRef.current = draft;
        } catch {
          // 週期儲存失敗時不阻斷作答；下一題或下次 interval 可再試
        }
      })();
    }, 45_000);

    return () => clearInterval(id);
  }, [session, session?.id, isPaused, loading, currentIdx, questions]);

  const handleSubmitExam = useCallback(async () => {
    if (!session?.id || hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    setSubmitting(true);
    try {
      const q = questions[currentIdx];
      if (q) {
        await examsApi.submitAnswer(session.id, q.id, userAnswer);
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
      navigate('/student/result');
    } catch {
      hasSubmittedRef.current = false;
      alert('交卷失敗，請聯繫監考老師');
    } finally {
      setSubmitting(false);
    }
  }, [session, questions, currentIdx, userAnswer, navigate]);

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
    const q = questions[currentIdx];
    const isEssay = q?.type === 'essay';
    if (!isEssay && !userAnswer.trim()) {
      alert('請先選擇或填寫答案');
      return;
    }

    setSubmitting(true);
    try {
      await examsApi.submitAnswer(session.id, q.id, userAnswer);
      if (q.type === 'essay') {
        lastEssaySavedContentRef.current = userAnswer;
      }
      if (currentIdx < questions.length - 1) {
        setCurrentIdx(currentIdx + 1);
        setUserAnswer('');
      } else {
        await handleSubmitExam();
      }
    } catch {
      alert('儲存答案失敗，請檢查網路');
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

  if (loading) return <div className="spinner"></div>;

  if (isPaused) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-alt">
        <div className="card modal-card modal-card--md text-center">
          <div className="flex justify-center text-warning mb-lg">
            <AlertTriangle size={64} />
          </div>
          <h2 className="mb-md">測驗已暫停</h2>
          <p className="mb-lg text-secondary">{pauseMessage || '系統偵測到異常操作，請等待老師解除鎖定'}</p>
          <div className="alert alert-warning">請保持本頁面開啟，不要關閉</div>
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
          {cheatSocketStatusMessage(wsStatus, 'exam')}
        </div>
      </div>
      <div className="header" style={{ position: 'relative' }}>
        <div className="container header-inner exam-room-bar">
          <div className="flex items-center gap-lg min-w-0">
            <span className="badge badge-primary">正在測驗</span>
            {session ? (
              <span className="min-w-0" style={{ fontWeight: 600, lineHeight: 1.35 }}>
                {session.exam?.title || '載入中...'}
              </span>
            ) : (
              <span style={{ fontWeight: 600 }}>載入中...</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-md shrink-0">
            <div className={`text-lg font-bold ${timeLeft < 60 ? 'text-danger' : ''}`}>
              剩餘時間: {formatTime(timeLeft)}
            </div>
            <div className="text-secondary text-sm">
              進度: {currentIdx + 1} / {questions.length}
            </div>
          </div>
        </div>
      </div>

      <div className="container content py-xl" style={{ paddingBottom: 'max(var(--space-xl), env(safe-area-inset-bottom, 0px))' }}>
        <div className="card mx-auto w-full exam-panel">
          <div className="mb-2xl">
            <h3 className="mb-lg">第 {currentIdx + 1} 題</h3>
            
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
              <textarea
                className="form-input answer-textarea"
                placeholder="在這邊輸入您的答案（問答題可留白，按下一題即視為不作答）"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                disabled={submitting}
              />
            )}
          </div>

          <div className="flex flex-col-reverse gap-md sm:flex-row sm:flex-wrap justify-between items-stretch sm:items-center">
            <div className="text-xs text-secondary self-center sm:self-auto text-center sm:text-left">
              {q?.type === 'essay'
                ? '* 選擇／多選於按「下一題」時儲存；問答題另約每 45 秒自動儲存一次（內容有變更時才寫入）'
                : '* 按「下一題」時儲存該題答案'}
            </div>
            <button
              className="btn btn-primary btn-lg w-full sm:w-auto shrink-0"
              onClick={handleNext}
              disabled={submitting}
            >
              {submitting ? <div className="spinner"></div> : currentIdx === questions.length - 1 ? '確認交卷' : '下一題'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamRoom;
