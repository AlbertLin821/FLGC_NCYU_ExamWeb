import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { teachersApi } from '../../api';
import { getTeacherRole } from '../../utils/teacherRole';
import ResizableTableContainer from '../../components/ResizableTableContainer';

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

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacher.email || !newTeacher.password || !newTeacher.name) return;
    const createdRoleName = roleLabel(newTeacher.role);
    try {
      await teachersApi.create(newTeacher);
      closeCreateModal();
      loadTeachers();
      alert(`已新增角色「${createdRoleName}」`);
    } catch {
      alert('新增失敗，請確認電子郵件是否已被使用');
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
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            + 新增教師
          </button>
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
    </div>
  );
};

export default TeacherAccounts;
