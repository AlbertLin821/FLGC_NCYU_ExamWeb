import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { classesApi, studentsApi } from '../../api';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, Type, ClipboardList } from 'lucide-react';
import { sessionScorePercent } from '../../utils/sessionScore';
import ResizableTableContainer from '../../components/ResizableTableContainer';

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

type StudentImportRow = { studentId: string; name: string; schoolName: string };
type ImportMode = 'text' | 'excel';
type ImportProgress = {
  processed: number;
  total: number;
  batchIndex: number;
  batchCount: number;
};

const IMPORT_BATCH_SIZE = 100;

const STUDENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*\d[A-Za-z0-9_-]*$/;
const SCHOOL_NAME_HINT_PATTERN = /(校|學校|大學|學院|高中|高職|國中|國小|university|college|school|ncyu)/i;

function normalizeImportCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function isStudentIdValue(value: string): boolean {
  return STUDENT_ID_PATTERN.test(value) && value.length >= 4;
}

function isSchoolNameValue(value: string): boolean {
  return SCHOOL_NAME_HINT_PATTERN.test(value);
}

function detectHeaderColumn(value: string): keyof StudentImportRow | null {
  const normalized = value.toLowerCase().replace(/[\s_-]+/g, '');
  if (/校名|學校|school|university|college/.test(normalized)) return 'schoolName';
  if (/學號|studentid|studentno|id/.test(normalized)) return 'studentId';
  if (/姓名|名字|name/.test(normalized)) return 'name';
  return null;
}

function getHeaderMap(row: string[]): Partial<Record<keyof StudentImportRow, number>> | null {
  const map: Partial<Record<keyof StudentImportRow, number>> = {};
  row.forEach((cell, index) => {
    const column = detectHeaderColumn(cell);
    if (column && map[column] === undefined) {
      map[column] = index;
    }
  });

  return map.schoolName !== undefined && map.studentId !== undefined && map.name !== undefined
    ? map
    : null;
}

function rowFromHeader(row: string[], headerMap: Partial<Record<keyof StudentImportRow, number>>): StudentImportRow | null {
  const schoolName = row[headerMap.schoolName ?? -1]?.trim() ?? '';
  const studentId = row[headerMap.studentId ?? -1]?.trim() ?? '';
  const name = row[headerMap.name ?? -1]?.trim() ?? '';
  return schoolName && studentId && name ? { schoolName, studentId, name } : null;
}

function inferStudentImportRow(values: string[]): StudentImportRow | null {
  const cells = values.map(normalizeImportCell).filter(Boolean);
  const studentIdIndex = cells.findIndex(isStudentIdValue);
  if (studentIdIndex < 0 || cells.length < 3) return null;

  const studentId = cells[studentIdIndex]!;
  const before = cells.slice(0, studentIdIndex);
  const after = cells.slice(studentIdIndex + 1);
  let schoolName = '';
  let name = '';

  if (studentIdIndex === 0) {
    const schoolIndex = after.findIndex(isSchoolNameValue);
    if (schoolIndex >= 0) {
      name = after.slice(0, schoolIndex).join(' ');
      schoolName = after.slice(schoolIndex).join(' ');
      if (!name) {
        schoolName = after.slice(0, Math.max(1, after.length - 1)).join(' ');
        name = after.slice(Math.max(1, after.length - 1)).join(' ');
      }
    } else {
      name = after[0] ?? '';
      schoolName = after.slice(1).join(' ');
    }
  } else if (studentIdIndex === cells.length - 1) {
    const schoolIndex = before.findIndex(isSchoolNameValue);
    if (schoolIndex >= 0) {
      name = before.slice(0, schoolIndex).join(' ');
      schoolName = before.slice(schoolIndex).join(' ');
      if (!name) {
        schoolName = before.slice(0, Math.max(1, before.length - 1)).join(' ');
        name = before.slice(Math.max(1, before.length - 1)).join(' ');
      }
    } else {
      schoolName = before[0] ?? '';
      name = before.slice(1).join(' ');
    }
  } else if (before.some(isSchoolNameValue) && after.length > 0) {
    schoolName = before.join(' ');
    name = after.join(' ');
  } else if (after.some(isSchoolNameValue) && before.length > 0) {
    schoolName = after.join(' ');
    name = before.join(' ');
  } else {
    schoolName = before.join(' ');
    name = after.join(' ');
  }

  return schoolName && studentId && name ? { schoolName, studentId, name } : null;
}

function parseStudentImportRows(rows: unknown[][]): StudentImportRow[] {
  const normalizedRows = rows
    .map((row) => row.map(normalizeImportCell))
    .filter((row) => row.some(Boolean));

  if (normalizedRows.length === 0) return [];

  const headerMap = getHeaderMap(normalizedRows[0]!);
  if (headerMap) {
    return normalizedRows
      .slice(1)
      .map((row) => rowFromHeader(row, headerMap))
      .filter((row): row is StudentImportRow => row !== null);
  }

  return normalizedRows
    .map(inferStudentImportRow)
    .filter((row): row is StudentImportRow => row !== null);
}

function parseBulkStudentImportText(text: string): StudentImportRow[] {
  const rows = text.split('\n').map((line) => line.split(/\s+/));
  return parseStudentImportRows(rows);
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
  const [importMode, setImportMode] = useState<ImportMode | null>(null);
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<StudentImportRow[]>([]);
  const [importError, setImportError] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [importParsing, setImportParsing] = useState(false);
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);

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
        await studentsApi.update(editingStudent.id, {
          name: editingStudent.name,
          schoolName: editingStudent.schoolName,
        });
      } else {
        await studentsApi.create({ ...editingStudent, classId: selectedClass.id });
      }
      setShowStudentModal(false);
      fetchStudents(selectedClass.id);
    } catch (err: any) { alert(err.response?.data?.message || '儲存失敗'); }
  };

  const deleteStudent = async (id: number) => {
    if (!confirm('確認將此學生移出目前班級？若該生已不屬於任何班級，系統會一併刪除學生資料。')) return;
    try {
      await studentsApi.delete(id, selectedClass.id);
      fetchStudents(selectedClass.id);
    } catch { alert('刪除失敗'); }
  };

  const resetImportState = () => {
    setImportMode(null);
    setImportText('');
    setImportPreview([]);
    setImportError('');
    setImportFileName('');
    setImportParsing(false);
    setImportSubmitting(false);
    setImportProgress(null);
  };

  const openImportModal = () => {
    resetImportState();
    setShowImport(true);
  };

  const closeImportModal = () => {
    resetImportState();
    setShowImport(false);
  };

  const selectImportMode = (mode: ImportMode) => {
    setImportMode(mode);
    setImportPreview([]);
    setImportError('');
    setImportFileName('');
  };

  const setPreviewOrError = (rows: StudentImportRow[]) => {
    if (rows.length === 0) {
      setImportPreview([]);
      setImportError('無法辨識資料，請確認至少包含校名、學號、姓名。');
      return;
    }
    setImportError('');
    setImportPreview(rows);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const input = e.target;
    if (!file || !selectedClass) return;
    setImportFileName(file.name);
    setImportError('');
    setImportPreview([]);
    setImportParsing(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      window.setTimeout(() => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
          setPreviewOrError(parseStudentImportRows(data));
        } catch {
          setImportError('Excel 解析失敗，請確認檔案格式。');
        } finally {
          setImportParsing(false);
          input.value = '';
        }
      }, 0);
    };
    reader.onerror = () => {
      setImportParsing(false);
      setImportError('讀取檔案失敗。');
      input.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleTextPreview = () => {
    if (importParsing) return;
    setImportParsing(true);
    setImportError('');
    window.setTimeout(() => {
      try {
        const data = parseBulkStudentImportText(importText).filter((s) => s.studentId && s.name && s.schoolName);
        setPreviewOrError(data);
      } finally {
        setImportParsing(false);
      }
    }, 0);
  };

  const handleConfirmImport = async () => {
    if (importSubmitting || importParsing) return;
    if (importPreview.length === 0) {
      setImportError('請先檢視並確認要匯入的資料。');
      return;
    }
    setImportSubmitting(true);
    setImportProgress({
      processed: 0,
      total: importPreview.length,
      batchIndex: 0,
      batchCount: Math.max(1, Math.ceil(importPreview.length / IMPORT_BATCH_SIZE)),
    });
    try {
      let created = 0;
      let updated = 0;
      const errors: string[] = [];
      const total = importPreview.length;
      const batchCount = Math.max(1, Math.ceil(total / IMPORT_BATCH_SIZE));

      for (let i = 0; i < total; i += IMPORT_BATCH_SIZE) {
        const batch = importPreview.slice(i, i + IMPORT_BATCH_SIZE);
        setImportProgress({
          processed: i,
          total,
          batchIndex: Math.floor(i / IMPORT_BATCH_SIZE) + 1,
          batchCount,
        });
        const res = await studentsApi.bulkImport(batch, selectedClass.id);
        const data = res.data as { created?: number; updated?: number; errors?: string[] };
        created += data.created ?? 0;
        updated += data.updated ?? 0;
        if (Array.isArray(data.errors) && data.errors.length > 0) {
          errors.push(...data.errors);
        }
        setImportProgress({
          processed: Math.min(i + batch.length, total),
          total,
          batchIndex: Math.floor(i / IMPORT_BATCH_SIZE) + 1,
          batchCount,
        });
      }

      if (errors.length > 0) {
        alert(
          `匯入完成：新增 ${created} 位、更新 ${updated} 位。\n失敗 ${errors.length} 筆。\n前 10 筆錯誤：\n${errors.slice(0, 10).join('\n')}`,
        );
      } else {
        alert(`匯入完成：新增 ${created} 位、更新 ${updated} 位。`);
      }
      closeImportModal();
      fetchStudents(selectedClass.id);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      alert(Array.isArray(msg) ? msg.join('；') : msg || '匯入失敗');
    } finally {
      setImportSubmitting(false);
      setImportProgress(null);
    }
  };

  if (selectedClass) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div className="flex items-center gap-md">
            <button className="btn btn-secondary btn-xs" onClick={() => setSelectedClass(null)}>← 返回班級列表</button>
            <h3>{selectedClass.name} - 學生管理</h3>
          </div>
          <div className="toolbar">
            <button className="btn btn-primary flex items-center gap-xs" onClick={openImportModal}>
              <FileSpreadsheet size={16} /> 匯入
            </button>
            <button className="btn btn-primary" onClick={() => { setEditingStudent({ studentId: '', name: '', schoolName: '國立嘉義大學' }); setShowStudentModal(true); }}>
              + 新增學生
            </button>
          </div>
        </div>

        <div className="card table-card">
          {studentsLoading ? <div className="spinner"></div> : (
            <ResizableTableContainer className="scroll-region-y" storageKey="class-management-students">
              <table className="table">
                <thead>
                  <tr>
                    <th>學號</th>
                    <th>姓名</th>
                    <th>校名</th>
                    <th>各場次狀況</th>
                    <th>總分</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id}>
                      <td className="cell-student-id"><b>{s.studentId}</b></td>
                      <td className="cell-nowrap">{s.name}</td>
                      <td className="cell-nowrap">{s.schoolName}</td>
                      <td className="cell-wrap">
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
                      <td className="text-sm cell-wrap-sm">
                        {gradedWeightedSummary(s.sessions)}
                      </td>
                      <td>
                        <div className="table-actions">
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
                  {students.length === 0 && <tr><td colSpan={6} className="text-center text-secondary">尚無學生資料</td></tr>}
                </tbody>
              </table>
            </ResizableTableContainer>
          )}
        </div>

        {showStudentModal && (
          <div className="modal-overlay">
            <div className="card modal-card modal-card--sm">
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
                <div className="form-group">
                  <label>校名</label>
                  <input className="form-input" value={editingStudent.schoolName ?? ''}
                    onChange={e => setEditingStudent({...editingStudent, schoolName: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>班級名稱</label>
                  <input className="form-input" value={selectedClass.name} disabled />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowStudentModal(false)}>取消</button>
                  <button type="submit" className="btn btn-primary">儲存</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showImport && (
          <div className="modal-overlay">
            <div className={`card modal-card modal-card--relative ${importPreview.length > 0 ? 'modal-card--lg' : 'modal-card--sm'}`}>
              {(importSubmitting || importParsing) && (
                <div className="modal-busy" role="status" aria-live="polite">
                  <div className="spinner" />
                  <p className="text-sm text-secondary mt-sm">
                    {importSubmitting ? '匯入中，請勿關閉視窗或重複按鈕…' : '正在解析資料…'}
                  </p>
                  {importSubmitting && importProgress && (
                    <div className="w-full max-w-sm mt-md">
                      <p className="text-sm text-secondary text-center mb-sm">
                        已完成 {importProgress.processed} / {importProgress.total} 筆
                        （第 {importProgress.batchIndex} / {importProgress.batchCount} 批）
                      </p>
                      <div
                        style={{
                          width: '100%',
                          height: '10px',
                          background: 'var(--color-bg-alt)',
                          borderRadius: '999px',
                          overflow: 'hidden',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(100, Math.round((importProgress.processed / Math.max(1, importProgress.total)) * 100))}%`,
                            height: '100%',
                            background: 'var(--color-primary)',
                            transition: 'width 180ms ease',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              {importPreview.length > 0 ? (
                <>
                  <h3 className="mb-md">檢視即將匯入的資料</h3>
                  <p className="text-sm text-secondary mb-md">
                    即將匯入 {importPreview.length} 位學生至「{selectedClass.name}」。
                  </p>
                  <ResizableTableContainer className="modal-scroll mb-lg" storageKey="class-management-import-preview">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>校名</th>
                          <th>學號</th>
                          <th>姓名</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.map((s, index) => (
                          <tr key={`${s.studentId}-${index}`}>
                            <td className="cell-nowrap">{s.schoolName}</td>
                            <td className="cell-student-id"><b>{s.studentId}</b></td>
                            <td className="cell-nowrap">{s.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ResizableTableContainer>
                  <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" disabled={importSubmitting || importParsing} onClick={() => setImportPreview([])}>返回修改</button>
                    <button type="button" className="btn btn-secondary" disabled={importSubmitting} onClick={closeImportModal}>取消</button>
                    <button type="button" className="btn btn-primary" disabled={importSubmitting || importParsing} onClick={handleConfirmImport}>
                      {importSubmitting ? '匯入中…' : '確認匯入'}
                    </button>
                  </div>
                </>
              ) : importMode === null ? (
                <>
                  <h3 className="mb-md">匯入學生</h3>
                  <p className="text-sm text-secondary mb-lg">
                    請選擇匯入方式。班級名稱將使用目前的「{selectedClass.name}」。
                  </p>
                  <div className="action-group mb-lg">
                    <button className="btn btn-secondary btn-sm" onClick={() => selectImportMode('excel')}>
                      <FileSpreadsheet size={16} /> Excel 匯入
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => selectImportMode('text')}>
                      <Type size={16} /> 文字匯入
                    </button>
                  </div>
                  <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={closeImportModal}>取消</button>
                  </div>
                </>
              ) : importMode === 'excel' ? (
                <>
                  <h3 className="mb-md">Excel 匯入</h3>
                  <p className="text-sm text-secondary mb-md">
                    建議欄位順序為：<b>校名、學號、姓名</b>。若有標題列或欄位順序不同，系統會嘗試自動辨識。
                  </p>
                  <div className="form-group">
                    <label className="form-label">選擇 Excel 檔案</label>
                    <input type="file" className="form-input" accept=".xlsx,.xls" disabled={importParsing} onChange={handleExcelUpload} />
                  </div>
                  {importFileName && <p className="text-sm text-secondary mb-md">已選擇：{importFileName}</p>}
                  {importError && <div className="alert alert-danger mb-md">{importError}</div>}
                  <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={() => selectImportMode('text')}>改用文字匯入</button>
                    <button className="btn btn-secondary" onClick={() => setImportMode(null)}>返回</button>
                    <button className="btn btn-secondary" onClick={closeImportModal}>取消</button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="mb-md">文字匯入</h3>
                  <p className="text-sm text-secondary mb-md">
                    建議格式為：<b>校名 學號 姓名</b>（空白分隔）。也可貼上「學號 姓名 校名」等格式，系統會嘗試自動辨識。
                  </p>
                  <textarea className="form-input mb-md" style={{ minHeight: '200px' }}
                    value={importText} onChange={e => setImportText(e.target.value)} disabled={importParsing}
                    placeholder={'國立嘉義大學 111000 王小明\n國立嘉義大學 111001 李小華'} />
                  {importError && <div className="alert alert-danger mb-md">{importError}</div>}
                  <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={() => selectImportMode('excel')}>改用 Excel 匯入</button>
                    <button className="btn btn-secondary" onClick={() => setImportMode(null)}>返回</button>
                    <button className="btn btn-secondary" onClick={closeImportModal}>取消</button>
                    <button type="button" className="btn btn-primary" disabled={importParsing} onClick={handleTextPreview}>
                      {importParsing ? '解析中…' : '檢視資料'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h3>班級管理</h3>
        <button className="btn btn-primary" onClick={() => setShowClassModal(true)}>+ 新增班級</button>
      </div>

      {loading ? <div className="spinner"></div> : (
        <div className="scroll-region-y">
          <div className="grid class-list">
          {classes.map(c => (
            <div 
              key={c.id} 
              className="card class-card hover-trigger" 
              onClick={() => setSelectedClass(c)}
            >
              <div className="class-card__header">
                <div className="class-card__body">
                  <h4 className="mb-xs">{c.name}</h4>
                  <p className="text-secondary text-sm">
                    {c.description || '暫無說明'}
                  </p>
                </div>
                <div className="card-actions">
                  <button 
                    className="btn btn-xs btn-secondary" 
                    onClick={(e) => { e.stopPropagation(); setEditingClassId(c.id); setNewClass({name:c.name, description:c.description||''}); setShowClassModal(true); }}
                  >
                    編輯
                  </button>
                  <button 
                    className="btn btn-xs btn-danger" 
                    onClick={(e) => { e.stopPropagation(); deleteClass(c.id); }}
                  >
                    刪除
                  </button>
                </div>
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
          <div className="card modal-card modal-card--sm">
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
              <div className="modal-actions">
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
