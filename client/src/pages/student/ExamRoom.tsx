import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { examsApi } from '../../api';

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

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden && session && !isPaused) {
      reportCheat('tab_switch');
    }
  }, [session, isPaused, reportCheat]);

  const handleBlur = useCallback(() => {
    if (session && !isPaused) {
      reportCheat('window_blur');
    }
  }, [session, isPaused, reportCheat]);

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
    if (!student.id) {
      navigate('/student/login');
      return;
    }

    const initExam = async () => {
      try {
        const response = await examsApi.start(Number(examId), student.id);
        const { session, questions, timeLimit } = response.data;
        setQuestions(questions);
        setSession(session);
        setTimeLeft(timeLimit * 60);

        // Resume if already in progress
        if (session.status === 'paused') {
          setIsPaused(true);
          setPauseMessage('測驗暫停中，請帶老師處理');
        }

        // Setup WebSocket
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        console.log('Connecting to socket at:', `${API_BASE}/cheat`);
        const socket = io(`${API_BASE}/cheat`, { 
          withCredentials: true,
          reconnectionAttempts: 5,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('Socket connected:', socket.id);
        });

        socket.on('connect_error', (err) => {
          console.error('Socket connection error:', err);
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
        console.error('initExam error:', err);
        alert(err.response?.data?.message || '進入考場失敗');
        navigate('/student/exams');
      } finally {
        setLoading(false);
      }
    };

    initExam();

    return () => {
      if (socketRef.current) {
        console.log('Disconnecting socket');
        socketRef.current.disconnect();
      }
    };
  }, [examId, student.id, navigate]);

  const handleFullscreenChange = useCallback(() => {
    if (!document.fullscreenElement && session && !isPaused) {
      reportCheat('exit_fullscreen');
    }
  }, [session, isPaused, reportCheat]);

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

  // Timer
  useEffect(() => {
    if (timeLeft > 0 && !isPaused && !loading) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && session && !loading) {
      handleSubmitExam();
    }
  }, [timeLeft, isPaused, loading, session]);

  const handleNext = async () => {
    if (!userAnswer.trim()) {
      alert('請先填寫答案');
      return;
    }

    setSubmitting(true);
    try {
      await examsApi.submitAnswer(session.id, questions[currentIdx].id, userAnswer);
      if (currentIdx < questions.length - 1) {
        setCurrentIdx(currentIdx + 1);
        setUserAnswer('');
      } else {
        handleSubmitExam();
      }
    } catch (err) {
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

  const handleSubmitExam = async () => {
    try {
      await examsApi.submit(session.id);
      navigate('/student/result');
    } catch (err) {
      alert('交卷失敗，請聯繫監考老師');
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
        <div className="card text-center" style={{ maxWidth: '500px' }}>
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
      <div className="header" style={{ position: 'relative' }}>
        <div className="container header-inner">
          <div className="flex items-center gap-lg">
            <span className="badge badge-primary">正在測驗</span>
            {session ? (
              <span style={{ fontWeight: 600 }}>{session.exam?.title || '載入中...'}</span>
            ) : (
              <span style={{ fontWeight: 600 }}>載入中...</span>
            )}
          </div>
          <div className="flex items-center gap-xl">
            <div className={`text-lg font-bold ${timeLeft < 60 ? 'text-danger' : ''}`}>
              剩餘時間: {formatTime(timeLeft)}
            </div>
            <div className="text-secondary text-sm">
              進度: {currentIdx + 1} / {questions.length}
            </div>
          </div>
        </div>
      </div>

      <div className="container content py-3xl">
        <div className="card mx-auto" style={{ maxWidth: '800px' }}>
          <div className="mb-2xl">
            <h3 className="mb-lg">第 {currentIdx + 1} 題</h3>
            
            <div className="mb-xl text-lg font-medium" style={{ whiteSpace: 'pre-wrap' }}>
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
                      className={`card p-md pointer flex items-center gap-md border-2 transition-all ${isSelected ? 'border-primary bg-primary-light bg-opacity-10' : 'hover:border-secondary'}`}
                      onClick={() => handleSelectionChange(label, q.type === 'multiple_selection')}
                      style={{ cursor: 'pointer', border: isSelected ? '2px solid var(--color-primary)' : '2px solid transparent', background: isSelected ? 'rgba(var(--color-primary-rgb), 0.05)' : 'white' }}
                    >
                      <div className={`flex items-center justify-center rounded-full font-bold ${isSelected ? 'bg-primary text-white' : 'bg-alt text-secondary'}`} style={{ width: '32px', height: '32px', background: isSelected ? 'var(--color-primary)' : '#f0f4f8', color: isSelected ? 'white' : '#64748b' }}>
                        {label}
                      </div>
                      <div className="text-md">{opt}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <textarea
                className="form-input"
                style={{ fontSize: '1.2rem', minHeight: '150px' }}
                placeholder="在這邊輸入您的答案..."
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                disabled={submitting}
              />
            )}
          </div>

          <div className="flex justify-between items-center">
            <div className="text-xs text-secondary">
              * 系統會自動儲存您的作答進度
            </div>
            <button
              className="btn btn-primary btn-lg"
              style={{ minWidth: '150px' }}
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
