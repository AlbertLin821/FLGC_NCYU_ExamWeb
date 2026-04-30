import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { teachersApi } from '../../api';
import { getTeacherRole } from '../../utils/teacherRole';
import ResizableTableContainer from '../../components/ResizableTableContainer';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, Type } from 'lucide-react';

type TeacherImportRow = {
  email: string;
  name: string;
  password: string;
  role: string;
};

type ImportMode = 'text' | 'excel';

function roleLabel(role: string): string {
  switch (role) {
    case 'admin':
      return '管理員';
    case 'viewer':
      return '檢視';
    case 'teacher':
      return '教師';
    default:
      return role;
  }
}

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function detectTeacherImportColumn(value: string): keyof TeacherImportRow | null {
  const normalized = value.toLowerCase().replace(/[\s_-]+/g, '');
  if (/email|mail|電子郵件/.test(normalized)) return 'email';
  if (/name|姓名|名字/.test(normalized)) return 'name';
  if (/password|密碼|passwd|pwd/.test(normalized)) return 'password';
  if (/role|角色/.test(normalized)) return 'role';
  return null;
}

function normalizeRole(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (['admin', '管理員'].includes(normalized)) return 'admin';
  if (['viewer', '檢視', '檢視者'].includes(normalized)) return 'viewer';
  return 'teacher';
}

function parseTeacherImportRows(rows: unknown[][]): TeacherImportRow[] {
  const normalizedRows = rows
    .map((row) => row.map(normalizeCell))
    .filter((row) => row.some(Boolean));

  if (normalizedRows.length === 0) return [];

  const headerMap: Partial<Record<keyof TeacherImportRow, number>> = {};
  normalizedRows[0]?.forEach((cell, index) => {
    const column = detectTeacherImportColumn(cell);
    if (column && headerMap[column] === undefined) {
      headerMap[column] = index;
    }
  });

  const hasHeader =
    headerMap.email !== undefined &&
    headerMap.name !== undefined &&
    headerMap.password !== undefined;

  const sourceRows = hasHeader ? normalizedRows.slice(1) : normalizedRows;

  return sourceRows
    .map((row) => {
      const email = hasHeader
        ? row[headerMap.email ?? -1] ?? ''
        : row[0] ?? '';
      const name = hasHeader
        ? row[headerMap.name ?? -1] ?? ''
        : row[1] ?? '';
      const password = hasHeader
        ? row[headerMap.password ?? -1] ?? ''
        : row[2] ?? '';
      const roleRaw = hasHeader
        ? row[headerMap.role ?? -1] ?? ''
        : row[3] ?? '';

      if (!email || !name || !password) return null;
      return {
        email: email.toLowerCase(),
        name,
        password,
        role: normalizeRole(roleRaw || 'teacher'),
      };
    })
    .filter((row): row is TeacherImportRow => row !== null);
}

function parseTeacherImportText(text: string): TeacherImportRow[] {
  const rows = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      line
        .split(/\t|,|\s{2,}/)
        .map((part) => part.trim())
        .filter(Boolean),
    );
  return parseTeacherImportRows(rows);
}

const TeacherAccounts: React.FC = () => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [myId, setMyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTeacher, setNewTeacher] = useState({
    email: '',
    password: '',
    name: '',
    role: 'teacher',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [resetId, setResetId] = useState<number | null>(null);
  const [resetPass, setResetPass] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode | null>(null);
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<TeacherImportRow[]>([]);
  const [importError, setImportError] = useState('');
  const [importParsing, setImportParsing] = useState(false);
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [importFileName, setImportFileName] = useState('');

  const loadTeachers = () => {
    setLoading(true);
    teachersApi
      .getAll()
      .then((res) => {
        setTeachers(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadTeachers();
    teachersApi
      .getProfile()
      .then((res) => setMyId(res.data?.id ?? null))
      .catch(() => setMyId(null));
  }, []);

  if (getTeacherRole() !== 'admin') {
    return <Navigate to="/teacher/overview" replace />;
  }

  const resetCreateForm = () => {
    setNewTeacher({ email: '', password: '', name: '', role: 'teacher' });
  };

  const closeCreateModal = () => {
    resetCreateForm();
    setShowCreateModal(false);
  };

  const resetImportState = () => {
    setImportMode(null);
    setImportText('');
    setImportPreview([]);
    setImportError('');
    setImportParsing(false);
    setImportSubmitting(false);
    setImportFileName('');
  };

  const closeImportModal = () => {
    resetImportState();
    setShowImportModal(false);
  };

  const setImportPreviewOrError = (rows: TeacherImportRow[]) => {
    if (rows.length === 0) {
      setImportPreview([]);
      setImportError('無法辨識資料，請確認至少包含電子郵件、姓名、密碼。');
      return;
    }
    const emails = new Set<string>();
    const duplicates = new Set<string>();
    for (const row of rows) {
      if (emails.has(row.email)) {
        duplicates.add(row.email);
      }
      emails.add(row.email);
    }
    setImportPreview(
      [...rows].sort((a, b) => a.email.localeCompare(b.email, 'en', { sensitivity: 'base' })),
    );
    setImportError(
      duplicates.size > 0
        ? `發現重複電子郵件：${[...duplicates].join('、')}`
        : '',
    );
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacher.email || !newTeacher.password || !newTeacher.name) return;
    const createdRoleName = roleLabel(newTeacher.role);
    try {
      await teachersApi.create(newTeacher);
      closeCreateModal();
      loadTeachers();
      alert(`已新增角色「${createdRoleName}」`);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[] } } };
      const msg = ax.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join('；') : msg || '新增失敗';
      alert(text);
    }
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const input = e.target;
    if (!file) return;
    setImportParsing(true);
    setImportError('');
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      window.setTimeout(() => {
        try {
          const wb = XLSX.read(evt.target?.result, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
          setImportPreviewOrError(parseTeacherImportRows(data));
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
        setImportPreviewOrError(parseTeacherImportText(importText));
      } finally {
        setImportParsing(false);
      }
    }, 0);
  };

  const handleConfirmImport = async () => {
    if (importSubmitting || importPreview.length === 0 || importError) return;
    setImportSubmitting(true);
    try {
      const res = await teachersApi.bulkImport(importPreview);
      const { created = 0, updated = 0, errors = [] } = res.data ?? {};
      if (Array.isArray(errors) && errors.length > 0) {
        alert(
          `匯入完成：新增 ${created} 位、更新 ${updated} 位。\n失敗 ${errors.length} 筆。\n前 10 筆錯誤：\n${errors
            .slice(0, 10)
            .join('\n')}`,
        );
      } else {
        alert(`匯入完成：新增 ${created} 位、更新 ${updated} 位。`);
      }
      closeImportModal();
      loadTeachers();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[] } } };
      const msg = ax.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join('；') : msg || '匯入失敗';
      alert(text);
    } finally {
      setImportSubmitting(false);
    }
  };

  const handleResetPassword = async (id: number) => {
    if (!resetPass) return;
    if (resetPass.trim().length < 8) {
      alert('密碼至少須 8 個字元');
      return;
    }
    try {
      await teachersApi.updatePassword(id, resetPass);
      setResetId(null);
      setResetPass('');
      alert('已更新密碼');
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[] } } };
      const msg = ax.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join('；') : msg || '更新失敗';
      alert(text);
    }
  };

  const handleDeleteTeacher = async (id: number, email: string) => {
    if (!window.confirm(`確定刪除帳號「${email}」？此動作無法復原。`)) return;
    try {
      await teachersApi.delete(id);
      loadTeachers();
      alert('已刪除帳號');
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[] } } };
      const msg = ax.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join('；') : msg || '刪除失敗';
      alert(text);
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h3 className="mb-xs">教師帳號</h3>
          <p className="text-sm text-secondary">檢視與維護系統內所有教師帳號，與班級／學生管理分開操作。</p>
        </div>
      </div>

      <div className="card">
        <div className="flex justify-between items-center flex-wrap gap-md mb-md">
          <h4>目前教師列表</h4>
          <div className="action-group">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                resetImportState();
                setShowImportModal(true);
              }}
            >
              匯入教師
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              + 新增教師
            </button>
          </div>
        </div>
        {loading ? (
          <div className="spinner" />
        ) : (
          <ResizableTableContainer className="scroll-region-y" storageKey="teacher-accounts-list">
            <table className="table table--sticky-header">
              <thead>
                <tr>
                  <th>電子郵件</th>
                  <th>姓名</th>
                  <th>角色</th>
                  <th>建立時間</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t) => (
                  <tr key={t.id}>
                    <td>{t.email}</td>
                    <td>{t.name}</td>
                    <td>{roleLabel(t.role)}</td>
                    <td className="text-sm text-secondary">
                      {t.createdAt ? new Date(t.createdAt).toLocaleString('zh-TW') : '—'}
                    </td>
                    <td>
                      <div className="table-actions">
                        {resetId === t.id ? (
                          <>
                            <input
                              type="password"
                              className="form-input field-min-sm"
                              placeholder="新密碼"
                              value={resetPass}
                              onChange={(e) => setResetPass(e.target.value)}
                            />
                            <button type="button" className="btn btn-xs btn-primary" onClick={() => handleResetPassword(t.id)}>
                              確認
                            </button>
                            <button type="button" className="btn btn-xs btn-secondary" onClick={() => setResetId(null)}>
                              取消
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="btn btn-xs btn-secondary" onClick={() => setResetId(t.id)}>
                              重設密碼
                            </button>
                            <button
                              type="button"
                              className="btn btn-xs btn-danger"
                              disabled={myId !== null && t.id === myId}
                              title={myId !== null && t.id === myId ? '無法刪除自己的帳號' : undefined}
                              onClick={() => handleDeleteTeacher(t.id, t.email)}
                            >
                              刪除
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {teachers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-secondary">
                      尚無教師資料
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ResizableTableContainer>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="card modal-card modal-card--sm">
            <h3 className="mb-lg">新增教師</h3>
            <form onSubmit={handleCreateTeacher} className="flex flex-col gap-md">
              <div>
                <label className="form-label">電子郵件</label>
                <input
                  className="form-input w-full"
                  type="email"
                  value={newTeacher.email}
                  onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="form-label">姓名</label>
                <input
                  className="form-input w-full"
                  value={newTeacher.name}
                  onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="form-label">密碼</label>
                <input
                  className="form-input w-full"
                  type="password"
                  value={newTeacher.password}
                  onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="form-label">角色</label>
                <select
                  className="form-input w-full"
                  value={newTeacher.role}
                  onChange={(e) => setNewTeacher({ ...newTeacher, role: e.target.value })}
                >
                  <option value="teacher">教師</option>
                  <option value="admin">管理員</option>
                  <option value="viewer">檢視</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeCreateModal}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  新增帳號
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="modal-overlay">
          <div className={`card modal-card modal-card--relative ${importPreview.length > 0 ? 'modal-card--lg' : 'modal-card--sm'}`}>
            {importPreview.length > 0 ? (
              <>
                <h3 className="mb-md">檢視即將匯入的教師帳號</h3>
                <p className="text-sm text-secondary mb-md">
                  即將匯入 {importPreview.length} 筆教師帳號；相同電子郵件會直接更新姓名、角色與密碼。
                </p>
                <ResizableTableContainer className="modal-scroll mb-lg" storageKey="teacher-import-preview">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>電子郵件</th>
                        <th>姓名</th>
                        <th>角色</th>
                        <th>密碼</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((row, index) => (
                        <tr key={`${row.email}-${index}`}>
                          <td>{row.email}</td>
                          <td>{row.name}</td>
                          <td>{roleLabel(row.role)}</td>
                          <td>{row.password}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ResizableTableContainer>
                {importError && <div className="alert alert-danger mb-md">{importError}</div>}
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" disabled={importSubmitting} onClick={() => setImportPreview([])}>
                    返回修改
                  </button>
                  <button type="button" className="btn btn-secondary" disabled={importSubmitting} onClick={closeImportModal}>
                    取消
                  </button>
                  <button type="button" className="btn btn-primary" disabled={importSubmitting || !!importError} onClick={handleConfirmImport}>
                    {importSubmitting ? '匯入中…' : '確認匯入'}
                  </button>
                </div>
              </>
            ) : importMode === null ? (
              <>
                <h3 className="mb-md">匯入教師帳號</h3>
                <p className="text-sm text-secondary mb-lg">
                  可批次新增或更新教師帳號。欄位建議為：電子郵件、姓名、密碼、角色。
                </p>
                <div className="action-group mb-lg">
                  <button className="btn btn-secondary btn-sm" onClick={() => setImportMode('excel')}>
                    <FileSpreadsheet size={16} /> Excel 匯入
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setImportMode('text')}>
                    <Type size={16} /> 文字匯入
                  </button>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeImportModal}>
                    取消
                  </button>
                </div>
              </>
            ) : importMode === 'excel' ? (
              <>
                <h3 className="mb-md">Excel 匯入教師帳號</h3>
                <p className="text-sm text-secondary mb-md">
                  建議欄位順序：<b>電子郵件、姓名、密碼、角色</b>；角色可填 <b>teacher / admin / viewer</b>。
                </p>
                <div className="form-group">
                  <label className="form-label">選擇 Excel 檔案</label>
                  <input type="file" className="form-input" accept=".xlsx,.xls" disabled={importParsing} onChange={handleExcelUpload} />
                </div>
                {importFileName && <p className="text-sm text-secondary mb-md">已選擇：{importFileName}</p>}
                {importError && <div className="alert alert-danger mb-md">{importError}</div>}
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setImportMode('text')}>
                    改用文字匯入
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setImportMode(null)}>
                    返回
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={closeImportModal}>
                    取消
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="mb-md">文字匯入教師帳號</h3>
                <p className="text-sm text-secondary mb-md">
                  一行一筆，建議格式：<b>電子郵件,姓名,密碼,角色</b>。角色未填時預設為 teacher。
                </p>
                <textarea
                  className="form-input mb-md"
                  style={{ minHeight: '220px' }}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  disabled={importParsing}
                  placeholder={'teacher1@example.com,王老師,Password123,teacher\nadmin@example.com,管理員,Password123,admin'}
                />
                {importError && <div className="alert alert-danger mb-md">{importError}</div>}
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setImportMode('excel')}>
                    改用 Excel 匯入
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setImportMode(null)}>
                    返回
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={closeImportModal}>
                    取消
                  </button>
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
};

export default TeacherAccounts;
