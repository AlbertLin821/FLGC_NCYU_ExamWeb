import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { studentsApi } from '../../api';

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
        setError('無法取得考卷列表，請檢查網路連線或稍後再試。');
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, [student, navigate]);

  const handleStartExam = (examId: number) => {
    navigate(`/student/exam/${examId}`);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-TW', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
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
        <h2 className="mb-xs">Hi，{student?.name}</h2>
        <p className="text-secondary text-sm">
          校名: {student?.schoolName ?? '—'} | 所屬班級: {student?.className ?? '—'} | 學號: {student?.studentId} | 姓名: {student?.name}
        </p>
        <p className="text-secondary text-sm">以下是目前可參加的測驗</p>
      </div>

      {error ? (
        <div className="alert alert-danger">{error}</div>
      ) : exams.length === 0 ? (
        <div className="card text-center py-3xl">
          <p className="text-secondary">目前沒有可考的考卷</p>
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
                    {exam.difficulty === 'hard' ? '進階' :
                     exam.difficulty === 'medium' ? '中級' : '初級'}
                  </span>
                  <span className="text-xs text-secondary">
                    {exam.questionCount} 題 | {exam.timeLimit} 分鐘
                  </span>
                </div>
                <h3 className="mb-sm">{exam.title}</h3>
                <div className="text-xs text-secondary mt-md">
                  <div>開放時間: {formatDate(exam.startTime)}</div>
                  <div>截止時間: {formatDate(exam.endTime)}</div>
                </div>
              </div>

              <div className="mt-xl">
                {exam.sessionStatus === 'submitted' || exam.sessionStatus === 'graded' ? (
                  <button className="btn btn-secondary w-full" disabled>已完成測驗</button>
                ) : (
                  <button
                    className="btn btn-primary w-full"
                    onClick={() => handleStartExam(exam.id)}
                  >
                    {exam.sessionStatus === 'in_progress' ? '繼續測驗' : '進入考場'}
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
