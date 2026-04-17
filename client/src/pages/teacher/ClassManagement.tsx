import React, { useState, useEffect } from 'react';
import { classesApi, studentsApi } from '../../api';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Type 
} from 'lucide-react';

const ClassManagement: React.FC = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClassModal, setShowClassModal] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', description: '' });
  const [editingClassId, setEditingClassId] = useState<number | null>(null);

  // Drill-down State
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');

  const fetchClasses = async () => {
    try {
      const res = await classesApi.getAll();
      setClasses(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchStudents = async (classId: number) => {
    setStudentsLoading(true);
    try {
      const res = await studentsApi.getByClass(classId);
      setStudents(res.data);
    } catch (err) { console.error(err); }
    finally { setStudentsLoading(false); }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) fetchStudents(selectedClass.id);
  }, [selectedClass]);

  // Class Actions
  const handleClassSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClassId) {
        await classesApi.update(editingClassId, newClass);
      } else {
        await classesApi.create(newClass);
      }
      setShowClassModal(false);
      setNewClass({ name: '', description: '' });
      setEditingClassId(null);
      fetchClasses();
    } catch (err) { alert('操作失敗'); }
  };

  const deleteClass = async (id: number) => {
    if (!confirm('確認刪除此班級？這會影響所屬學生與考卷。')) return;
    try {
      await classesApi.delete(id);
      fetchClasses();
    } catch (err) { alert('刪除失敗'); }
  };

  // Student Actions
  const handleStudentSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStudent.id) {
        await studentsApi.update(editingStudent.id, { name: editingStudent.name });
      } else {
        await studentsApi.create({ ...editingStudent, classId: selectedClass.id });
      }
      setShowStudentModal(false);
      fetchStudents(selectedClass.id);
    } catch (err) { alert('儲存失敗'); }
  };

  const deleteStudent = async (id: number) => {
    if (!confirm('確認刪除此學生？')) return;
    try {
      await studentsApi.delete(id);
      fetchStudents(selectedClass.id);
    } catch (err) { alert('刪除失敗'); }
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClass) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      const studentsToImport = data.slice(1).map(row => ({
        studentId: String(row[0]),
        name: String(row[1])
      })).filter(s => s.studentId && s.name && s.studentId !== 'undefined');

      if (studentsToImport.length === 0) return alert('格式錯誤或無數據');
      studentsApi.bulkImport(studentsToImport, selectedClass.id).then(() => {
        alert(`成功匯入 ${studentsToImport.length} 位學生`);
        fetchStudents(selectedClass.id);
      }).catch(() => alert('匯入失敗'));
    };
    reader.readAsBinaryString(file);
  };

  const handleBulkImportText = async () => {
    const lines = importText.split('\n').filter(l => l.trim());
    const data = lines.map(line => {
      const parts = line.split(/\s+/);
      return { studentId: parts[0], name: parts.slice(1).join(' ') };
    }).filter(s => s.studentId && s.name);

    if (data.length === 0) return alert('數據無效');
    try {
      await studentsApi.bulkImport(data, selectedClass.id);
      setShowImport(false);
      setImportText('');
      fetchStudents(selectedClass.id);
    } catch (err) { alert('匯入失敗'); }
  };

  const getExamStatusEmoji = (sessions: any[]) => {
    if (!sessions || sessions.length === 0) return '未測驗';
    const s = sessions[0];
    const exam = s.exam;
    const now = new Date();
    const isOverdue = exam && new Date(exam.endTime) < now;

    if (s.status === 'graded') return `已評分 (${s.score}分)`;
    if (s.status === 'submitted') return '已繳卷';
    if (s.status === 'in_progress') {
      return isOverdue ? '逾期未交' : '測驗中';
    }
    if (s.status === 'paused') return '暫停中';
    return s.status;
  };

  if (selectedClass) {
    return (
      <div className="fade-in">
        <div className="flex justify-between items-center mb-lg">
          <div className="flex items-center gap-md">
            <button className="btn btn-secondary btn-xs" onClick={() => setSelectedClass(null)}>← 返回班級列表</button>
            <h3>{selectedClass.name} - 學生管理</h3>
          </div>
          <div className="flex gap-md">
            <input type="file" id="st-excel" hidden accept=".xlsx,.xls" onChange={handleExcelUpload} />
            <button className="btn btn-secondary flex items-center gap-xs" onClick={() => document.getElementById('st-excel')?.click()}>
              <FileSpreadsheet size={16} /> Excel 匯入
            </button>
            <button className="btn btn-primary flex items-center gap-xs" onClick={() => setShowImport(true)}>
              <Type size={16} /> 批量匯入 (文字)
            </button>
            <button className="btn btn-primary" onClick={() => { setEditingStudent({ studentId: '', name: '' }); setShowStudentModal(true); }}>
              + 新增學生
            </button>
          </div>
        </div>

        <div className="card">
          {studentsLoading ? <div className="spinner"></div> : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>學號</th>
                    <th>姓名</th>
                    <th>考試狀態</th>
                    <th>卷別 (考卷標題)</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id}>
                      <td><b>{s.studentId}</b></td>
                      <td>{s.name}</td>
                      <td>{getExamStatusEmoji(s.sessions)}</td>
                      <td>{s.sessions?.[0]?.exam?.title || '-'}</td>
                      <td>
                        <div className="flex gap-sm">
                          <button className="btn btn-xs btn-secondary" onClick={() => { setEditingStudent(s); setShowStudentModal(true); }}>編輯</button>
                          <button className="btn btn-xs btn-danger" onClick={() => deleteStudent(s.id)}>刪除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && <tr><td colSpan={5} className="text-center text-secondary">尚無學生數據</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showStudentModal && (
          <div className="modal-overlay">
            <div className="card w-full max-w-sm">
              <h3 className="mb-lg">{editingStudent.id ? '編輯學生' : '新增學生'}</h3>
              <form onSubmit={handleStudentSave}>
                <div className="form-group">
                  <label>學號</label>
                  <input className="form-input" value={editingStudent.studentId} disabled={!!editingStudent.id} 
                    onChange={e => setEditingStudent({...editingStudent, studentId: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>姓名</label>
                  <input className="form-input" value={editingStudent.name} 
                    onChange={e => setEditingStudent({...editingStudent, name: e.target.value})} required />
                </div>
                <div className="flex gap-md justify-end">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowStudentModal(false)}>取消</button>
                  <button type="submit" className="btn btn-primary">儲存</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showImport && (
          <div className="modal-overlay">
            <div className="card w-full max-w-lg">
              <h3 className="mb-md">批量匯入學生</h3>
              <p className="text-sm text-secondary mb-md">每一行格式：學號 姓名</p>
              <textarea className="form-input mb-md" style={{ minHeight: '200px' }} 
                value={importText} onChange={e => setImportText(e.target.value)} placeholder="411001 王小明" />
              <div className="flex gap-md justify-end">
                <button className="btn btn-secondary" onClick={() => setShowImport(false)}>取消</button>
                <button className="btn btn-primary" onClick={handleBulkImportText}>確認匯入</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-lg">
        <h3>班級管理</h3>
        <button className="btn btn-primary" onClick={() => setShowClassModal(true)}>+ 新增班級</button>
      </div>

      {loading ? <div className="spinner"></div> : (
        <div className="grid grid-2">
          {classes.map(c => (
            <div 
              key={c.id} 
              className="card hover-trigger" 
              onClick={() => setSelectedClass(c)}
              style={{ position: 'relative', cursor: 'pointer', minHeight: '140px' }}
            >
              <div 
                className="flex gap-xs" 
                style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}
              >
                <button 
                  className="btn btn-xs btn-secondary" 
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                  onClick={(e) => { e.stopPropagation(); setEditingClassId(c.id); setNewClass({name:c.name, description:c.description||''}); setShowClassModal(true); }}
                >
                  編輯
                </button>
                <button 
                  className="btn btn-xs btn-danger" 
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                  onClick={(e) => { e.stopPropagation(); deleteClass(c.id); }}
                >
                  刪除
                </button>
              </div>

              <div>
                <h4 className="mb-xs" style={{ paddingRight: '120px' }}>{c.name}</h4>
                <p className="text-secondary text-sm" style={{ paddingRight: '120px' }}>
                  {c.description || '暫無說明'}
                </p>
              </div>
              
              <div className="mt-lg pt-md border-t flex justify-between items-center">
                <span className="badge badge-primary">{c._count?.students || 0} 位學生</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showClassModal && (
        <div className="modal-overlay">
          <div className="card w-full max-w-sm">
            <h3 className="mb-lg">{editingClassId ? '編輯班級' : '新增班級'}</h3>
            <form onSubmit={handleClassSave}>
              <div className="form-group">
                <label>班級名稱</label>
                <input className="form-input" value={newClass.name} onChange={e => setNewClass({...newClass, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>說明</label>
                <textarea className="form-input" value={newClass.description} onChange={e => setNewClass({...newClass, description: e.target.value})} />
              </div>
              <div className="flex gap-md justify-end">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowClassModal(false); setEditingClassId(null); setNewClass({name:'', description:''}); }}>取消</button>
                <button type="submit" className="btn btn-primary">儲存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassManagement;
