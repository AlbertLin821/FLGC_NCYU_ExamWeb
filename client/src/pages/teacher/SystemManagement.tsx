import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { studentsApi, teachersApi } from '../../api';
import { getTeacherRole } from '../../utils/teacherRole';

const FORCE_DELETE_EMAIL = 'albertlin94821@gmail.com';
const FORCE_DELETE_NAME = 'Albert Lin';
const FORCE_DELETE_CONFIRM_TEXT = '立即清除';

const forceDeleteOptions = [
  { value: 'classes', label: '刪除全部班級', warning: '會移除所有班級與班級關聯。' },
  { value: 'students', label: '刪除全部學生', warning: '會移除所有學生、作答紀錄與相關防弊紀錄。' },
  { value: 'exams', label: '刪除全部考卷', warning: '會硬刪所有考卷、題目、作答與成績資料。' },
  { value: 'teachers', label: '刪除其他教師帳號', warning: '會保留目前登入帳號，其餘教師與管理員帳號都會刪除。' },
  { value: 'all', label: '刪除全部資料', warning: '會清空班級、學生、考卷與其他教師帳號，僅保留目前登入帳號。' },
] as const;

type ForceDeleteTarget = typeof forceDeleteOptions[number]['value'];

const SystemManagement: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [studentPage, setStudentPage] = useState(1);
  const [studentTotalPages, setStudentTotalPages] = useState(1);
  const [loadingS, setLoadingS] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<ForceDeleteTarget>('classes');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);

  const loadStudents = (page: number) => {
    setLoadingS(true);
    studentsApi
      .getAll(page, 20)
      .then((res) => {
        const d = res.data;
        if (d.items) {
          setStudents(d.items);
          setStudentTotalPages(d.totalPages || 1);
        } else {
          setStudents(Array.isArray(d) ? d : []);
        }
        setLoadingS(false);
      })
      .catch(() => setLoadingS(false));
  };

  useEffect(() => {
    loadStudents(studentPage);
  }, [studentPage]);

  useEffect(() => {
    teachersApi.getProfile().then((res) => setProfile(res.data)).catch(() => setProfile(null));
  }, []);

  if (getTeacherRole() !== 'admin') {
    return <Navigate to="/teacher/overview" replace />;
  }

  const classNames = (student: any) =>
    student.classes?.map((row: any) => row.class?.name).filter(Boolean).join('、') || '—';

  const isForceDeleteAdmin =
    profile?.email === FORCE_DELETE_EMAIL && profile?.name === FORCE_DELETE_NAME;

  const selectedOption =
    forceDeleteOptions.find((option) => option.value === selectedTarget) ?? forceDeleteOptions[0];

  const handleForceDelete = async () => {
    if (!isForceDeleteAdmin) return;
    if (confirmText.trim() !== FORCE_DELETE_CONFIRM_TEXT) {
      alert(`請先輸入「${FORCE_DELETE_CONFIRM_TEXT}」後再執行。`);
      return;
    }
    if (
      !window.confirm(
        `確定要執行「${selectedOption.label}」？\n${selectedOption.warning}\n此動作無法復原。`,
      )
    ) {
      return;
    }

    setBusy(true);
    try {
      const res = await teachersApi.forceDelete(selectedTarget);
      const deleted = res.data?.deleted ?? {};
      alert(
        `強制清除完成：班級 ${deleted.classes ?? 0}、學生 ${deleted.students ?? 0}、考卷 ${deleted.exams ?? 0}、帳號 ${deleted.teachers ?? 0}`,
      );
      setConfirmText('');
      setStudentPage(1);
      loadStudents(1);
    } catch (err: any) {
      alert(err.response?.data?.message || '強制清除失敗');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="mb-lg">
        <h3 className="mb-xs">系統管理</h3>
        <p className="text-sm text-secondary">全校學生帳號總覽。教師帳號請至側邊選單「教師帳號」。</p>
      </div>

      <div className="card mb-lg">
        <h4 className="mb-sm">強制資料清除</h4>
        {isForceDeleteAdmin ? (
          <>
            <p className="text-sm text-secondary mb-sm">
              僅限指定管理員帳號使用。請先選擇要清除的資料類型，再輸入確認文字後執行。
            </p>
            <div className="form-group">
              <label>清除項目</label>
              <select
                className="input"
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value as ForceDeleteTarget)}
                disabled={busy}
              >
                {forceDeleteOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm text-secondary mb-sm">{selectedOption.warning}</p>
            <div className="form-group">
              <label>確認文字</label>
              <input
                className="input"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`請輸入「${FORCE_DELETE_CONFIRM_TEXT}」`}
                disabled={busy}
              />
            </div>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleForceDelete}
              disabled={busy}
            >
              {busy ? '清除中...' : selectedOption.label}
            </button>
          </>
        ) : (
          <p className="text-sm text-secondary">
            強制資料清除功能僅提供指定管理員帳號（Albert Lin）使用。
          </p>
        )}
      </div>

      <div className="card">
        <h4 className="mb-md">學生帳號（全校）</h4>
        {loadingS ? (
          <div className="spinner" />
        ) : (
          <>
            <div className="table-container scroll-region-y">
              <table className="table">
                <thead>
                  <tr>
                    <th>學號</th>
                    <th>姓名</th>
                    <th>校名</th>
                    <th>班級</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td className="cell-student-id">{s.studentId}</td>
                      <td>{s.name}</td>
                      <td>{s.schoolName}</td>
                      <td>{classNames(s)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="action-group mt-md">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={studentPage <= 1}
                onClick={() => setStudentPage((p) => Math.max(1, p - 1))}
              >
                上一頁
              </button>
              <span className="text-sm text-secondary">
                第 {studentPage} / {studentTotalPages} 頁
              </span>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={studentPage >= studentTotalPages}
                onClick={() => setStudentPage((p) => p + 1)}
              >
                下一頁
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SystemManagement;
