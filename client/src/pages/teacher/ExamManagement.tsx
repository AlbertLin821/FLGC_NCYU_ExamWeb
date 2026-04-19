import React, { useState, useEffect, useRef } from 'react';
import { examsApi, classesApi } from '../../api';

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 依開放時間 + 作答分鐘數得到截止時間（datetime-local 字串），無效則回傳 null */
function computeEndFromStartAndLimit(startTime: string, timeLimitMinutes: number): string | null {
  if (!startTime || !Number.isFinite(timeLimitMinutes) || timeLimitMinutes <= 0) return null;
  const start = new Date(startTime);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + timeLimitMinutes * 60_000);
  return toDatetimeLocalValue(end);
}

const ExamManagement: React.FC = () => {
  const [exams, setExams] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newExam, setNewExam] = useState<any>({
    title: '', classIds: [] as number[], difficulty: 'medium', timeLimit: 30,
    startTime: '', endTime: ''
  });
  const [editingExamId, setEditingExamId] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const [classMenuOpen, setClassMenuOpen] = useState(false);
  const classMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!classMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (classMenuRef.current && !classMenuRef.current.contains(e.target as Node)) {
        setClassMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [classMenuOpen]);

  useEffect(() => {
    if (!showModal) setClassMenuOpen(false);
  }, [showModal]);

  const toggleClassId = (id: number) => {
    setNewExam((prev: any) => {
      const ids = [...(prev.classIds as number[])];
      const i = ids.indexOf(id);
      if (i >= 0) ids.splice(i, 1);
      else ids.push(id);
      return { ...prev, classIds: ids };
    });
  };

  const fetchExams = async () => {
    try {
      const res = await examsApi.getAll();
      setExams(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openCreateModal = () => {
    setEditingExamId(null);
    setNewExam({
      title: '', classIds: classes[0]?.id ? [classes[0].id] : [], difficulty: 'medium', timeLimit: 30,
      startTime: '', endTime: ''
    });
    setShowModal(true);
  };

  const openEditModal = (exam: any) => {
    setEditingExamId(exam.id);
    const ids = exam.examClasses?.map((ec: { classId: number }) => ec.classId) ?? [];
    setNewExam({
      title: exam.title,
      classIds: ids.length ? ids : (classes[0]?.id ? [classes[0].id] : []),
      difficulty: exam.difficulty || 'medium',
      timeLimit: exam.timeLimit,
      startTime: exam.startTime.substring(0, 16),
      endTime: exam.endTime.substring(0, 16)
    });
    setShowModal(true);
  };

  useEffect(() => {
    fetchExams();
    classesApi.getAll().then(res => {
      setClasses(res.data);
      if (res.data.length > 0) {
        setNewExam((prev: any) => ({
          ...prev,
          classIds: prev.classIds?.length ? prev.classIds : [res.data[0].id],
        }));
      }
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Logic: Deadline - Release Time >= Duration
    const start = new Date(newExam.startTime).getTime();
    const end = new Date(newExam.endTime).getTime();
    const limit = newExam.timeLimit * 60000;
    
    if (end - start < limit) {
      alert('發放時間到截止時間的間隔不應小於作答時間！');
      return;
    }

    if (!newExam.classIds?.length) {
      alert('請至少選擇一個適用班級');
      return;
    }

    const payload = {
      title: newExam.title,
      classIds: newExam.classIds as number[],
      difficulty: newExam.difficulty,
      timeLimit: newExam.timeLimit,
      startTime: newExam.startTime,
      endTime: newExam.endTime,
    };

    try {
      if (editingExamId) {
        await examsApi.update(editingExamId, payload);
      } else {
        await examsApi.create(payload);
      }
      setShowModal(false);
      fetchExams();
    } catch { alert(editingExamId ? '更新失敗' : '建立失敗'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('確認移除此考卷？學生已提交的成績與作答紀錄會保留在成績後台；考卷將自管理列表隱藏，且學生端不再顯示此測驗。')) return;
    try {
      await examsApi.delete(id);
      fetchExams();
    } catch { alert('刪除失敗'); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-lg">
        <h3>考卷管理</h3>
        <button className="btn btn-primary" onClick={openCreateModal}>+ 新增考卷</button>
      </div>

      <div className="table-container card">
        {loading ? <div className="spinner"></div> : (
          <table className="table">
            <thead>
              <tr>
                <th>名稱</th>
                <th>適用班級</th>
                <th>狀態</th>
                <th>難度</th>
                <th>時限</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {exams.map(e => (
                <tr key={e.id}>
                  <td><b>{e.title}</b></td>
                  <td>{e.examClasses?.map((ec: { class: { name: string } }) => ec.class?.name).filter(Boolean).join('、') || '—'}</td>
                  <td>
                    {(() => {
                      if (e.status !== 'published') return <span className="badge badge-warning">草稿</span>;
                      const now = new Date().getTime();
                      const start = new Date(e.startTime).getTime();
                      const end = new Date(e.endTime).getTime();
                      if (now > end) return <span className="badge badge-danger">已結束</span>;
                      if (now < start) return <span className="badge badge-secondary" style={{ background: '#e9ecef', color: '#6c757d' }}>未開始</span>;
                      return <span className="badge badge-success">進行中</span>;
                    })()}
                  </td>
                  <td>{e.difficulty}</td>
                  <td>{e.timeLimit} 分</td>
                  <td>
                    <div className="flex gap-sm">
                      <button className="btn btn-xs btn-primary" onClick={() => window.location.href = `/teacher/questions?examId=${e.id}`}>題目管理</button>
                      <button className="btn btn-xs btn-secondary" onClick={() => openEditModal(e)}>編輯</button>
                      {e.status === 'draft' && <button className="btn btn-xs btn-primary" onClick={async () => {
                        await examsApi.publish(e.id);
                        fetchExams();
                      }}>發放</button>}
                      <button className="btn btn-xs btn-danger" onClick={() => handleDelete(e.id)}>刪除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card w-full" style={{ maxWidth: '500px' }}>
            <h3 className="mb-lg">{editingExamId ? '編輯考卷' : '建立新考卷'}</h3>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">考卷標題</label>
                <input className="form-input" value={newExam.title} onChange={e => setNewExam({ ...newExam, title: e.target.value })} required />
              </div>
              <div className="flex gap-md mb-md">
                <div className="form-group w-full" ref={classMenuRef} style={{ position: 'relative' }}>
                  <label className="form-label">適用班級</label>
                  <button
                    type="button"
                    className="form-input"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      background: 'var(--color-bg)',
                    }}
                    onClick={() => setClassMenuOpen((o) => !o)}
                    aria-expanded={classMenuOpen}
                    aria-haspopup="listbox"
                  >
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        color: newExam.classIds?.length ? 'var(--color-text)' : 'var(--color-text-light)',
                      }}
                    >
                      {newExam.classIds?.length
                        ? classes
                            .filter((c) => newExam.classIds.includes(c.id))
                            .map((c) => c.name)
                            .join('、')
                        : '點此選擇班級（可複選）'}
                    </span>
                    <span style={{ flexShrink: 0, fontSize: '0.75rem', color: 'var(--color-text-secondary)' }} aria-hidden>
                      {classMenuOpen ? '▲' : '▼'}
                    </span>
                  </button>
                  {classMenuOpen && (
                    <div
                      role="listbox"
                      aria-multiselectable
                      className="form-input"
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: '100%',
                        marginTop: 4,
                        zIndex: 1001,
                        maxHeight: 220,
                        overflowY: 'auto',
                        padding: 'var(--space-sm)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {classes.map((c) => {
                        const checked = newExam.classIds?.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            className="flex items-center gap-sm"
                            style={{
                              padding: '6px 4px',
                              cursor: 'pointer',
                              borderRadius: 'var(--radius-sm)',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleClassId(c.id)}
                            />
                            <span className="text-sm">{c.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-sm text-secondary mt-xs">已選 {newExam.classIds?.length ?? 0} 個班級</p>
                </div>
                <div className="form-group w-full">
                  <label className="form-label">難度</label>
                  <select className="form-input" value={newExam.difficulty} onChange={e => setNewExam({ ...newExam, difficulty: e.target.value })}>
                    <option value="easy">初級</option>
                    <option value="medium">中級</option>
                    <option value="hard">進階</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">作答時間 (分鐘)</label>
                <input
                  type="number"
                  min={1}
                  className="form-input"
                  value={newExam.timeLimit}
                  onChange={(e) => {
                    const timeLimit = Number(e.target.value);
                    setNewExam((prev: any) => {
                      const next = { ...prev, timeLimit };
                      if (!editingExamId && prev.startTime && Number.isFinite(timeLimit) && timeLimit > 0) {
                        const end = computeEndFromStartAndLimit(prev.startTime, timeLimit);
                        if (end) next.endTime = end;
                      }
                      return next;
                    });
                  }}
                />
              </div>
              <div className="flex flex-col gap-md">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">開放時間</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={newExam.startTime}
                    onChange={(e) => {
                      const startTime = e.target.value;
                      setNewExam((prev: any) => {
                        const next = { ...prev, startTime };
                        if (!editingExamId && prev.timeLimit > 0) {
                          const end = computeEndFromStartAndLimit(startTime, prev.timeLimit);
                          if (end) next.endTime = end;
                        }
                        return next;
                      });
                    }}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">截止時間</label>
                  <input type="datetime-local" className="form-input" value={newExam.endTime} onChange={e => setNewExam({ ...newExam, endTime: e.target.value })} required />
                </div>
              </div>
              <div className="flex gap-md justify-end mt-lg">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary">{editingExamId ? '儲存變更' : '確認'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamManagement;
