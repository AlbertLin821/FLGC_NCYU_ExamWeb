import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { classesApi, studentsApi } from '../../api';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, Type, ClipboardList } from 'lucide-react';
import { sessionScorePercent } from '../../utils/sessionScore';

/** 單一考試場次之狀態說明（不含總分，總分另欄呈現） */
function sessionStatusLine(session: any): string {
  const ex = session.exam;
  const title = ex?.title ?? '考卷';
  const now = new Date();
  if (!ex) return `${title}（${session.status}）`;
  const end = new Date(ex.endTime);
  const start = new Date(ex.startTime);

  switch (session.status) {
    case 'graded':
      return `${title}：已評分`;
    case 'submitted':
      return `${title}：已繳卷（待評分）`;
    case 'in_progress':
      return now > end ? `${title}：逾期未交` : `${title}：作答中`;
    case 'paused':
      return `${title}：暫停中`;
    case 'pending':
    default:
      if (now < start) return `${title}：尚未開考`;
      if (now > end) return `${title}：未應考（已截止）`;
      return `${title}：可進入應考`;
  }
}

function gradedWeightedSummary(sessions: any[] | undefined): string {
  if (!sessions?.length) return '—';
  const parts = sessions
    .filter((s) => s.status === 'graded')
    .map((s) => `${s.exam?.title ?? '考卷'} ${sessionScorePercent(s.answers)} 分`);
  return parts.length ? parts.join('；') : '—';
}

/** 至少四位純數字視為學號，用於同一行多組「學號 姓名」掃描；非純數字學號（如 TEST001）仍用每行「第一欄 其餘」 */
const NUMERIC_STUDENT_ID = /^\d{4,}$/;

function parseBulkStudentImportText(text: string): { studentId: string; name: string }[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const out: { studentId: string; name: string }[] = [];

  for (const line of lines) {
    const tokens = line.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;

    const lineHasNumericId = tokens.some((t) => NUMERIC_STUDENT_ID.test(t));

    if (lineHasNumericId) {
      let i = 0;
      while (i < tokens.length) {
        const t = tokens[i];
        if (t && NUMERIC_STUDENT_ID.test(t)) {
          const studentId = t;
          i++;
          const nameParts: string[] = [];
          while (i < tokens.length && tokens[i] && !NUMERIC_STUDENT_ID.test(tokens[i])) {
            nameParts.push(tokens[i]!);
            i++;
          }
          const name = nameParts.join(' ').trim();
          if (name) out.push({ studentId, name });
        } else {
          i++;
        }
      }
    } else if (tokens.length >= 2) {
      out.push({ studentId: tokens[0]!, name: tokens.slice(1).join(' ') });
    }
  }

  return out;
}

const ClassManagement: React.FC = () => {
  const navigate = useNavigate();
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
    } catch { alert('操作失敗'); }
  };

  const deleteClass = async (id: number) => {
    if (!confirm('確認刪除此班級？這會影響所屬學生與考卷。')) return;
    try {
      await classesApi.delete(id);
      fetchClasses();
    } catch { alert('刪除失敗'); }
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
    } catch { alert('儲存失敗'); }
  };

  const deleteStudent = async (id: number) => {
    if (!confirm('確認刪除此學生？')) return;
    try {
      await studentsApi.delete(id);
      fetchStudents(selectedClass.id);
    } catch { alert('刪除失敗'); }
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
    const data = parseBulkStudentImportText(importText).filter((s) => s.studentId && s.name);

    if (data.length === 0) return alert('數據無效');
    try {
      await studentsApi.bulkImport(data, selectedClass.id);
      setShowImport(false);
      setImportText('');
      fetchStudents(selectedClass.id);
    } catch { alert('匯入失敗'); }
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
              <Type size={16} /> 文字批量匯入
            </button>
            <button className="btn btn-primary" onClick={() => { setEditingStudent({ studentId: '', name: '' }); setShowStudentModal(true); }}>
              + 新增學生
            </button>
          </div>
        </div>

        <div className="card">
          {studentsLoading ? <div className="spinner"></div> : (
            <div className="table-container scroll-region-y">
              <table className="table">
                <thead>
                  <tr>
                    <th>學號</th>
                    <th>姓名</th>
                    <th>各場次狀況</th>
                    <th>加權得分</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id}>
                      <td><b>{s.studentId}</b></td>
                      <td>{s.name}</td>
                      <td style={{ minWidth: '220px', maxWidth: '360px' }}>
                        {s.sessions?.length ? (
                          <ul style={{ margin: 0, paddingLeft: '1.15rem', fontSize: '0.875rem', lineHeight: 1.5 }}>
                            {s.sessions.map((sess: any) => (
                              <li key={sess.id}>{sessionStatusLine(sess)}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-secondary">尚未有考試紀錄</span>
                        )}
                      </td>
                      <td className="text-sm" style={{ whiteSpace: 'normal', maxWidth: '280px' }}>
                        {gradedWeightedSummary(s.sessions)}
                      </td>
                      <td>
                        <div className="flex gap-sm flex-wrap">
                          <button
                            type="button"
                            className="btn btn-xs btn-primary flex items-center gap-xs"
                            onClick={() => navigate(`/teacher/result/${s.id}`)}
                            title="檢視該生各卷與題目成績"
                          >
                            <ClipboardList size={14} /> 成績與題目
                          </button>
                          <button type="button" className="btn btn-xs btn-secondary" onClick={() => { setEditingStudent(s); setShowStudentModal(true); }}>編輯</button>
                          <button type="button" className="btn btn-xs btn-danger" onClick={() => deleteStudent(s.id)}>刪除</button>
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
              <h3 className="mb-lg">{editingStudent.id ? '編輯' : '新增'}</h3>
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
              <h3 className="mb-md">批量匯入</h3>
              <p className="text-sm text-secondary mb-md">
                格式須為：<b>學號 姓名</b>（空白分隔）。可連續多組；學號須至少四位數字，例如「11245004 王小明 1124505 李小華」。
              </p>
              <textarea className="form-input mb-md" style={{ minHeight: '200px' }} 
                value={importText} onChange={e => setImportText(e.target.value)} placeholder={'111000 王小明 111001 李小華'} />
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
        <div className="scroll-region-y">
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
