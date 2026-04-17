import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { questionsApi, examsApi } from '../../api';

interface Question {
  id: number;
  type: string;
  content?: string;
  options?: any;
  answer?: string;
  orderNum: number;
}

interface Exam {
  id: number;
  title: string;
  class?: { id: number; name: string };
  _count?: { questions: number };
}

const QuestionManagement: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [qLoading, setQLoading] = useState(false);

  // Add / edit states
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [type, setType] = useState('multiple_choice');
  const [content, setContent] = useState('');
  const [options, setOptions] = useState(['', '', '', '']); // For MC
  const [answer, setAnswer] = useState('');

  useEffect(() => {
    const examIdParam = searchParams.get('examId');
    examsApi.getAll().then((res) => {
      setExams(res.data);
      setLoading(false);
      if (examIdParam) {
        const id = Number(examIdParam);
        setSelectedExamId(id);
        fetchQuestions(id);
      }
    });
  }, [searchParams]);

  const fetchQuestions = async (examId: number) => {
    setQLoading(true);
    try {
      const res = await questionsApi.getByExam(examId);
      setQuestions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setQLoading(false);
    }
  };

  const selectExam = (id: number) => {
    setSelectedExamId(id);
    fetchQuestions(id);
    setShowAdd(false);
    setEditingId(null);
  };

  const resetForm = () => {
    setType('multiple_choice');
    setContent('');
    setOptions(['', '', '', '']);
    setAnswer('');
    setShowAdd(false);
    setEditingId(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId) return;
    try {
      const payload: any = { type, orderNum: questions.length + 1 };
      if (type === 'multiple_choice' || type === 'multiple_selection') {
        payload.content = content;
        payload.options = options.filter(o => o.trim());
        payload.answer = answer;
      } else {
        payload.content = content;
      }

      await questionsApi.create(selectedExamId, payload);
      resetForm();
      fetchQuestions(selectedExamId);
    } catch {
      alert('新增題目失敗');
    }
  };

  const handleEdit = async (id: number) => {
    try {
      const payload: any = { type, content, answer };
      if (type === 'multiple_choice' || type === 'multiple_selection') {
        payload.options = options.filter(o => o.trim());
      }
      await questionsApi.update(id, payload);
      setEditingId(null);
      if (selectedExamId) fetchQuestions(selectedExamId);
    } catch {
      alert('更新題目失敗');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('確認刪除此題目？')) return;
    try {
      await questionsApi.delete(id);
      if (selectedExamId) fetchQuestions(selectedExamId);
    } catch {
      alert('刪除失敗');
    }
  };

  const startEdit = (q: Question) => {
    setEditingId(q.id);
    setType(q.type);
    setContent(q.content || '');
    setAnswer(q.answer || '');
    setOptions(q.options && Array.isArray(q.options) ? [...q.options, '', '', ''].slice(0, 4) : ['', '', '', '']);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-lg">
        <div className="flex items-center gap-md">
          <button className="btn btn-secondary btn-xs btn-square" onClick={() => navigate('/teacher/exams')}>
            <ArrowLeft size={16} /> 返回考卷列表
          </button>
          <h3 style={{ margin: 0 }}>
            {searchParams.get('examId') && exams.find(ex => ex.id === selectedExamId) 
              ? `題目管理: ${exams.find(ex => ex.id === selectedExamId)?.title}` 
              : '題目管理'}
          </h3>
        </div>
        {selectedExamId && (
          <div className="flex gap-sm">
            <button className="btn btn-primary btn-square" onClick={() => { setShowAdd(true); }}>+ 新增單題</button>
          </div>
        )}
      </div>

      {/* Exam selector - only show if no examId in URL */}
      {loading ? (
        <div className="spinner"></div>
      ) : !searchParams.get('examId') && (
        <div className="mb-lg">
          <label className="form-label">選擇考卷</label>
          <select
            className="form-input"
            style={{ maxWidth: '400px' }}
            value={selectedExamId || ''}
            onChange={(e) => selectExam(Number(e.target.value))}
          >
            <option value="" disabled>— 請選擇考卷 —</option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title}{ex.class ? ` (${ex.class.name})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Add single question form */}
      {showAdd && (
        <div className="card mb-lg" style={{ background: 'var(--color-bg-alt)' }}>
          <h4 className="mb-md">新增題目</h4>
          <form onSubmit={handleAdd}>
            <div className="mb-md">
              <label className="form-label">題目類型</label>
              <select className="form-input" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="multiple_choice">選擇題 (單選)</option>
                <option value="multiple_selection">選擇題 (複選)</option>
                <option value="essay">問答題 / 自由造句</option>
              </select>
            </div>

            {(type === 'multiple_choice' || type === 'multiple_selection' || type === 'essay') && (
              <div className="form-group mb-md">
                <label className="form-label">題目內容</label>
                <textarea className="form-input" placeholder="請輸入題目敘述" value={content} onChange={(e) => setContent(e.target.value)} required />
              </div>
            )}

            {(type === 'multiple_choice' || type === 'multiple_selection') && (
              <div className="mb-md">
                <label className="form-label">選項 (每行一個選項，或填入下方空格)</label>
                <div className="grid grid-cols-2 gap-sm">
                  {options.map((opt, i) => (
                    <input
                      key={i}
                      className="form-input"
                      placeholder={`選項 ${String.fromCharCode(65 + i)}`}
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[i] = e.target.value;
                        setOptions(newOpts);
                      }}
                    />
                  ))}
                </div>
                <div className="mt-sm">
                  <label className="form-label text-sm">正確答案 (單選填 A, B... | 複選填 A,B...)</label>
                  <input className="form-input" placeholder="例: A" value={answer} onChange={(e) => setAnswer(e.target.value)} required />
                </div>
              </div>
            )}

            <div className="flex gap-sm justify-end">
              <button type="button" className="btn btn-secondary btn-square" onClick={() => setShowAdd(false)}>取消</button>
              <button type="submit" className="btn btn-primary btn-square">確認新增</button>
            </div>
          </form>
        </div>
      )}

      {/* Question list */}
      {selectedExamId && (
        <div className="card">
          {qLoading ? (
            <div className="spinner"></div>
          ) : questions.length === 0 ? (
            <div className="text-center py-3xl text-secondary">
              <div className="flex justify-center mb-md">
                <FileText size={48} />
              </div>
              <p>此考卷尚無題目，請點擊上方按鈕新增</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>序號</th>
                    <th style={{ width: '100px' }}>類型</th>
                    <th>內容</th>
                    <th style={{ width: '150px' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q) => (
                    <tr key={q.id}>
                      <td>{q.orderNum}</td>
                      <td>
                        <span className="text-xs text-secondary">
                          {q.type === 'multiple_choice' ? '單選' : q.type === 'multiple_selection' ? '複選' : '問答'}
                        </span>
                      </td>
                      {editingId === q.id ? (
                        <td colSpan={2}>
                          <div className="p-sm bg-alt border-radius flex flex-col gap-sm">
                            <select className="form-input text-sm" value={type} onChange={(e) => setType(e.target.value)}>
                              <option value="multiple_choice">單選</option>
                              <option value="multiple_selection">複選</option>
                              <option value="essay">問答</option>
                            </select>
                            <textarea className="form-input" value={content} onChange={(e) => setContent(e.target.value)} />
                            <div className="flex gap-sm mt-sm">
                              <button className="btn btn-xs btn-square btn-primary" onClick={() => handleEdit(q.id)}>儲存</button>
                              <button className="btn btn-xs btn-square btn-secondary" onClick={() => setEditingId(null)}>取消</button>
                            </div>
                          </div>
                        </td>
                      ) : (
                        <>
                          <td>
                            <div className="text-sm truncate" style={{ maxWidth: '400px' }}>{q.content}</div>
                          </td>
                          <td>
                            <div className="flex gap-sm">
                              <button className="btn btn-xs btn-ghost btn-square btn-ghost-secondary" onClick={() => startEdit(q)}>編輯</button>
                              <button className="btn btn-xs btn-ghost btn-square btn-ghost-danger" onClick={() => handleDelete(q.id)}>刪除</button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestionManagement;
