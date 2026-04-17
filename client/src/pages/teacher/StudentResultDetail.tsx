import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentsApi } from '../../api';
import Layout from '../../components/Layout';

const StudentResultDetail: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studentId) {
      studentsApi.getById(Number(studentId)).then(res => {
        setStudent(res.data);
        setLoading(false);
      }).catch(() => {
        alert('找不到學生資料');
        navigate('/teacher/results');
      });
    }
  }, [studentId, navigate]);

  if (loading) return <div className="spinner"></div>;

  return (
    <Layout>
      <div className="container py-xl">
        <div className="flex justify-between items-center mb-xl">
          <div>
            <h3>{student.name} ({student.studentId}) — 考試歷程</h3>
            <p className="text-secondary">查看該學生的所有考試明細與 AI 評分回饋</p>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>返回列表</button>
        </div>

        {student.sessions.length === 0 ? (
          <div className="card text-center py-3xl text-secondary">尚無考試紀錄</div>
        ) : (
          <div className="flex flex-col gap-xl">
            {student.sessions.map((session: any) => (
              <div key={session.id} className="card">
                <div className="flex justify-between items-start mb-lg">
                  <div>
                    <h4 className="mb-xs">{session.exam.title}</h4>
                    <p className="text-sm text-secondary">
                      提交時間：{session.submittedAt ? new Date(session.submittedAt).toLocaleString() : '未提交'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`badge ${session.status === 'graded' ? 'badge-success' : 'badge-warning'}`}>
                      {session.status === 'graded' ? '評分完成' : '待處理'}
                    </span>
                    {session.status === 'graded' && (
                      <div className="mt-xs text-2xl font-bold text-primary">
                        平均：{Math.round(session.answers.reduce((acc: number, cur: any) => acc + Number(cur.aiScore || 0), 0) / session.answers.length)} 分
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-md">
                  {session.answers.map((ans: any, idx: number) => (
                    <div key={ans.id} className="p-md bg-alt rounded-md" style={{ border: '1px solid #e2e8f0' }}>
                      <div className="flex justify-between mb-sm">
                        <span className="font-bold">題目 {idx + 1}</span>
                        {ans.aiScore !== null && (
                          <span className="badge badge-primary">{Number(ans.aiScore)} 分</span>
                        )}
                      </div>
                      <p className="mb-md" style={{ fontStyle: 'italic', fontSize: '1.1rem' }}>
                        「{ans.content || '(未作答)'}」
                      </p>
                      {ans.aiFeedback && (
                        <div className="text-sm p-sm bg-white rounded-sm" style={{ borderLeft: '3px solid var(--color-primary)' }}>
                          <b>AI 回饋：</b> {ans.aiFeedback}
                          <div className="text-xs text-secondary mt-xs">模型：{ans.aiModel}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default StudentResultDetail;
