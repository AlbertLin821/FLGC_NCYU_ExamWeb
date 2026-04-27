import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './index.css';
import { StudentLocaleProvider } from './i18n/StudentLocaleContext';
import { useStudentDocumentLang } from './i18n/useStudentDocumentLang';

function DocumentLangBridge() {
  const { pathname } = useLocation();
  useStudentDocumentLang(pathname);
  return null;
}

// Lazy-loaded Pages
const HomePage = lazy(() => import('./pages/HomePage'));
const StudentLogin = lazy(() => import('./pages/student/StudentLogin'));
const StudentExams = lazy(() => import('./pages/student/StudentExams'));
const ExamRoom = lazy(() => import('./pages/student/ExamRoom'));
const ExamResult = lazy(() => import('./pages/student/ExamResult'));
const TeacherLogin = lazy(() => import('./pages/teacher/TeacherLogin'));
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const ForgotPassword = lazy(() => import('./pages/teacher/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/teacher/ResetPassword'));

function App() {
  return (
    <BrowserRouter>
      <StudentLocaleProvider>
        <DocumentLangBridge />
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="spinner"></div></div>}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />

          {/* Student */}
          <Route path="/student/login" element={<StudentLogin />} />
          <Route path="/student/exams" element={<StudentExams />} />
          <Route path="/student/exam/:examId" element={<ExamRoom />} />
          <Route path="/student/result" element={<ExamResult />} />

          {/* Teacher */}
          <Route path="/teacher/login" element={<TeacherLogin />} />
          <Route path="/teacher/forgot-password" element={<ForgotPassword />} />
          <Route path="/teacher/reset-password/:token" element={<ResetPassword />} />
          <Route path="/teacher/*" element={<TeacherDashboard />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </StudentLocaleProvider>
    </BrowserRouter>
  );
}

export default App;
