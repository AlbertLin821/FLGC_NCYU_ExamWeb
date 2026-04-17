import React, { useState, useEffect } from 'react';
import { examsApi, classesApi } from '../../api';

const ExamManagement: React.FC = () => {
  const [exams, setExams] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newExam, setNewExam] = useState<any>({
    title: '', classId: 0, difficulty: 'medium', timeLimit: 30,
    startTime: '', endTime: ''
  });
  const [editingExamId, setEditingExamId] = useState<number | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

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
      title: '', classId: classes[0]?.id || 0, difficulty: 'medium', timeLimit: 30,
      startTime: '', endTime: ''
    });
    setShowModal(true);
  };

  const openEditModal = (exam: any) => {
    setEditingExamId(exam.id);
    setNewExam({
      title: exam.title,
      classId: exam.classId,
      difficulty: exam.difficulty || 'medium',
      timeLimit: exam.timeLimit,
      startTime: exam.startTime.substring(0, 16), // Format for datetime-local
      endTime: exam.endTime.substring(0, 16)
    });
    setShowModal(true);
  };

  useEffect(() => {
    fetchExams();
    classesApi.getAll().then(res => {
      setClasses(res.data);
      if (res.data.length > 0) setNewExam((prev: any) => ({ ...prev, classId: res.data[0].id }));
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

    try {
      if (editingExamId) {
        await examsApi.update(editingExamId, newExam);
      } else {
        await examsApi.create(newExam);
      }
      setShowModal(false);
      fetchExams();
    } catch (err) { alert(editingExamId ? '更新失敗' : '建立失敗'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('確認刪除此考卷與所有題目？此操作無法復原。')) return;
    try {
      await examsApi.delete(id);
      fetchExams();
    } catch (err) { alert('刪除失敗'); }
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
                  <td>{e.class?.name}</td>
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
                <div className="form-group w-full">
                  <label className="form-label">適用班級</label>
                  <select className="form-input" value={newExam.classId} onChange={e => setNewExam({ ...newExam, classId: Number(e.target.value) })}>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
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
                <input type="number" className="form-input" value={newExam.timeLimit} onChange={e => setNewExam({ ...newExam, timeLimit: Number(e.target.value) })} />
              </div>
              <div className="flex flex-col gap-md">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">開放時間</label>
                  <input type="datetime-local" className="form-input" value={newExam.startTime} onChange={e => setNewExam({ ...newExam, startTime: e.target.value })} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">截止時間</label>
                  <input type="datetime-local" className="form-input" value={newExam.endTime} onChange={e => setNewExam({ ...newExam, endTime: e.target.value })} required />
                </div>
              </div>
              <div className="flex gap-md justify-end mt-lg">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary">{editingExamId ? '儲存變更' : '確認建立'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamManagement;
