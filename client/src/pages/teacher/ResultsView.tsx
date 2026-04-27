import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { examsApi, classesApi, scoringApi } from '../../api';
import { getTeacherRole } from '../../utils/teacherRole';
import * as XLSX from 'xlsx';
import { earnedPointsOnQuestion, sessionScorePercent } from '../../utils/sessionScore';

const ResultsView: React.FC = () => {
  const role = getTeacherRole();
  const isViewer = role === 'viewer';
  const navigate = useNavigate();
  const [results, setResults] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  /** null = 不篩考卷（該班級全部） */
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [batchGrading, setBatchGrading] = useState(false);

  useEffect(() => {
    classesApi.getAll().then(res => {
      setClasses(res.data);
      if (res.data.length > 0) setSelectedClassId(res.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;
    examsApi.getAll(selectedClassId).then((res) => {
      setExams(Array.isArray(res.data) ? res.data : []);
    });
  }, [selectedClassId]);

  useEffect(() => {
    if (!selectedClassId) return;
    setLoading(true);
    examsApi
      .getResults(selectedClassId, selectedExamId ?? undefined)
      .then((res) => {
        setResults(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedClassId, selectedExamId]);

  const calculateTotal = (answers: any[]) => sessionScorePercent(answers);

  const statusLabel = (row: any) => {
    if (row.hasAiGrading) {
      return { text: 'AI 批改中', className: 'badge-warning' };
    }
    if (row.hasPendingReview) {
      return { text: '已評分（待複閱）', className: 'badge-warning' };
    }
    if (row.status === 'graded') {
      return { text: '已評分', className: 'badge-success' };
    }
    return { text: '待評分', className: 'badge-warning' };
  };

  const handleTriggerScoring = async (sessionId: number) => {
    try {
      await scoringApi.scoreSession(sessionId);
      alert('已將該場次送入 AI 批改佇列');
      if (selectedClassId) {
        const res = await examsApi.getResults(selectedClassId, selectedExamId ?? undefined);
        setResults(res.data);
      }
    } catch {
      alert('評分失敗');
    }
  };

  const handleBatchEssayGrade = async () => {
    if (!selectedClassId || !selectedExamId) {
      alert('請先選擇班級與單一考卷');
      return;
    }
    if (!window.confirm('將對此班、此考卷所有「已交卷」學生重新排入 AI 批改佇列，可能耗時較久。確定繼續？')) {
      return;
    }
    setBatchGrading(true);
    try {
      const res = await scoringApi.batchEssayGrade(selectedExamId, selectedClassId);
      const d = res.data as {
        processed?: number;
        skipped?: number;
        failed?: { sessionId: number; reason: string }[];
        message?: string;
      };
      const failed = d.failed?.length ? `\n失敗筆數：${d.failed.length}` : '';
      alert(
        `${d.message ?? '批次完成'}\n已處理：${d.processed ?? 0}、略過：${d.skipped ?? 0}${failed}`,
      );
      const r = await examsApi.getResults(selectedClassId, selectedExamId);
      setResults(r.data);
    } catch {
      alert('集體批閱失敗');
    } finally {
      setBatchGrading(false);
    }
  };

  const handleExport = () => {
    if (results.length === 0) return;
    const sortedAnswers = (answers: any[]) =>
      [...(answers || [])].sort(
        (a, b) => (a.question?.orderNum ?? 0) - (b.question?.orderNum ?? 0),
      );
    const maxQ = Math.max(
      ...results.map((r) => sortedAnswers(r.answers).length),
      0,
    );
    const data = results.map((r) => {
      const sorted = sortedAnswers(r.answers);
      const row: Record<string, string | number> = {
        學號: r.student.studentId,
        姓名: r.student.name,
        考試項目: r.exam.title,
      };
      for (let i = 0; i < maxQ; i++) {
        const a = sorted[i];
        const key = `題${i + 1}`;
        row[key] = a
          ? earnedPointsOnQuestion(a.aiScore, a.question?.maxPoints)
          : '';
      }
      row['加權總分'] = calculateTotal(r.answers);
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '成績報表');
    XLSX.writeFile(wb, `成績報表_${new Date().toLocaleDateString()}.xlsx`);
  };

  if (role === 'teacher') {
    return <Navigate to="/teacher/exams" replace />;
  }

  return (
    <div>
      <div className="page-header">
        <h3>成績後台</h3>
        <div className="toolbar">
          {!isViewer && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={
                batchGrading ||
                !selectedClassId ||
                selectedExamId === null ||
                loading
              }
              onClick={handleBatchEssayGrade}
            >
              {batchGrading ? '排隊中…' : '重新排隊 AI 批改非選擇題'}
            </button>
          )}
          <button className="btn btn-secondary" onClick={handleExport} disabled={results.length === 0}>
            匯出 Excel
          </button>
        </div>
      </div>

      <div className="mb-lg action-group">
        <div className="field-min-sm">
          <label className="form-label">選擇班級</label>
          <select
            className="form-input"
            value={selectedClassId || ''}
            onChange={(e) => {
              setSelectedClassId(Number(e.target.value));
              setSelectedExamId(null);
            }}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field-min-md">
          <label className="form-label">選擇考卷</label>
          <select
            className="form-input"
            value={selectedExamId === null ? '' : String(selectedExamId)}
            onChange={(e) => {
              const v = e.target.value;
              setSelectedExamId(v === '' ? null : Number(v));
            }}
          >
            <option value="">全部考卷</option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card table-card">
        {loading ? (
          <div className="spinner"></div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>學號</th>
                  <th>姓名</th>
                  <th>考試項目</th>
                  <th>狀態</th>
                  <th>加權得分</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id}>
                    <td>{r.student.studentId}</td>
                    <td><b>{r.student.name}</b></td>
                    <td className="cell-wrap-sm">{r.exam.title}</td>
                    <td>
                      <span className={`badge ${statusLabel(r).className}`}>
                        {statusLabel(r).text}
                      </span>
                    </td>
                    <td><b>{calculateTotal(r.answers)}</b></td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="btn btn-xs btn-secondary"
                          disabled={typeof r.student?.id !== 'number'}
                          onClick={() => {
                            if (typeof r.student?.id === 'number') {
                              navigate(`/teacher/result/${r.student.id}`);
                            }
                          }}
                        >查看細節</button>
                        {r.status === 'submitted' && !isViewer && (
                          <button
                            type="button"
                            className="btn btn-xs btn-secondary"
                            title="重新計算客觀題，並將非選擇題送入 AI 批改佇列"
                            onClick={() => handleTriggerScoring(r.id)}
                          >
                            啟動 AI 批改
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsView;
