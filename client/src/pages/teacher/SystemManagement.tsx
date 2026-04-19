import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { studentsApi } from '../../api';
import { getTeacherRole } from '../../utils/teacherRole';

const SystemManagement: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [studentPage, setStudentPage] = useState(1);
  const [studentTotalPages, setStudentTotalPages] = useState(1);
  const [loadingS, setLoadingS] = useState(true);

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

  if (getTeacherRole() !== 'admin') {
    return <Navigate to="/teacher/overview" replace />;
  }

  return (
    <div className="fade-in">
      <div className="mb-lg">
        <h3 className="mb-xs">系統管理</h3>
        <p className="text-sm text-secondary">全校學生帳號總覽。教師帳號請至側邊選單「教師帳號」。</p>
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
                    <th>班級</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td>{s.studentId}</td>
                      <td>{s.name}</td>
                      <td>{s.class?.name ?? s.classId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-md items-center mt-md">
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
