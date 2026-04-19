import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { examsApi, classesApi, scoringApi } from '../../api';
import * as XLSX from 'xlsx';
import { sessionScorePercent } from '../../utils/sessionScore';

const ResultsView: React.FC = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    classesApi.getAll().then(res => {
      setClasses(res.data);
      if (res.data.length > 0) setSelectedClassId(res.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      setLoading(true);
      examsApi.getResults(selectedClassId).then(res => {
        setResults(res.data);
        setLoading(false);
      });
    }
  }, [selectedClassId]);

  const calculateTotal = (answers: any[]) => sessionScorePercent(answers);

  const handleTriggerScoring = async (sessionId: number) => {
    try {
      await scoringApi.scoreSession(sessionId);
      alert('已送出評分請求');
      if (selectedClassId) {
        const res = await examsApi.getResults(selectedClassId);
        setResults(res.data);
      }
    } catch {
      alert('評分失敗');
    }
  };

  const handleExport = () => {
    if (results.length === 0) return;
    const data = results.map(r => ({
      '學號': r.student.studentId,
      '姓名': r.student.name,
      '考試項目': r.exam.title,
      '加權得分': calculateTotal(r.answers),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "成績報表");
    XLSX.writeFile(wb, `成績報表_${new Date().toLocaleDateString()}.xlsx`);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-lg">
        <h3>成績後台</h3>
        <button className="btn btn-secondary" onClick={handleExport} disabled={results.length === 0}>匯出 Excel</button>
      </div>

      <div className="mb-lg">
        <label className="form-label">選擇班級</label>
        <select
          className="form-input"
          style={{ width: '200px' }}
          value={selectedClassId || ''}
          onChange={(e) => setSelectedClassId(Number(e.target.value))}
        >
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="table-container card">
        {loading ? (
          <div className="spinner"></div>
        ) : (
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
                  <td>{r.exam.title}</td>
                  <td>
                    <span className={`badge ${r.status === 'graded' ? 'badge-success' : 'badge-warning'}`}>
                      {r.status === 'graded' ? '已評分' : '待評分'}
                    </span>
                  </td>
                  <td><b>{calculateTotal(r.answers)}</b></td>
                  <td>
                    <div className="flex gap-sm">
                      <button
                        className="btn btn-xs btn-secondary"
                        disabled={typeof r.student?.id !== 'number'}
                        onClick={() => {
                          if (typeof r.student?.id === 'number') {
                            navigate(`/teacher/result/${r.student.id}`);
                          }
                        }}
                      >查看細節</button>
                      {r.status === 'submitted' && (
                        <button
                          className="btn btn-xs btn-primary"
                          onClick={() => handleTriggerScoring(r.id)}
                        >手動評分</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ResultsView;
