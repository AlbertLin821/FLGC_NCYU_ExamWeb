import axios from 'axios';

/**
 * REST 使用 `${origin}/api`，Socket.IO 使用 `${origin}/cheat`。
 * `.env` 可能寫成 `http://localhost:3000` 或誤帶 `/api` 後綴，需正規化避免 `/api/api`。
 */
export function normalizeServerOrigin(raw: string | undefined): string {
  const trimmed = String(raw ?? 'http://localhost:3000')
    .trim()
    .replace(/\/$/, '');
  const withoutApi = trimmed.replace(/\/api\/?$/, '');
  return withoutApi || 'http://localhost:3000';
}

export function getServerOrigin(): string {
  return normalizeServerOrigin(import.meta.env.VITE_API_URL);
}

const api = axios.create({
  baseURL: `${getServerOrigin()}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token for teacher requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    if (status === 403 && window.location.pathname.startsWith('/teacher')) {
      window.location.href = '/teacher/login?reason=forbidden';
      return Promise.reject(err);
    }
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('teacher');
      if (window.location.pathname.startsWith('/teacher')) {
        window.location.href = '/teacher/login?reason=session';
      }
    }
    return Promise.reject(err);
  },
);

// Auth
export const authApi = {
  teacherLogin: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  studentVerify: (studentId: string, name: string) =>
    api.post('/auth/student/verify', { studentId, name }),
  requestPasswordReset: (email: string) =>
    api.post('/auth/request-reset', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),
};

// Teachers
export const teachersApi = {
  getProfile: () => api.get('/teachers/me'),
  getAll: () => api.get('/teachers'),
  invite: (email: string) => api.post('/teachers/invite', { email }),
};

// Classes
export const classesApi = {
  getAll: () => api.get('/classes'),
  getById: (id: number) => api.get(`/classes/${id}`),
  getStats: (id: number) => api.get(`/classes/${id}/stats`),
  create: (data: { name: string; description?: string }) => api.post('/classes', data),
  update: (id: number, data: any) => api.put(`/classes/${id}`, data),
  delete: (id: number) => api.delete(`/classes/${id}`),
  addTeacher: (classId: number, teacherId: number) =>
    api.post(`/classes/${classId}/teachers`, { teacherId }),
};

// Students
export const studentsApi = {
  getByClass: (classId: number) => api.get(`/students`, { params: { classId } }),
  getById: (id: number) => api.get(`/students/${id}`),
  getExams: (id: number) => api.get(`/students/${id}/exams`),
  bulkImport: (students: { studentId: string; name: string }[], classId: number) =>
    api.post('/students/import', { students, classId }),
  create: (data: any) => api.post('/students', data),
  update: (id: number, data: any) => api.put(`/students/${id}`, data),
  delete: (id: number) => api.delete(`/students/${id}`),
};

// Exams
export const examsApi = {
  getAll: (classId?: number) =>
    api.get('/exams', { params: classId ? { classId } : {} }),
  getById: (id: number) => api.get(`/exams/${id}`),
  create: (data: any) => api.post('/exams', data),
  update: (id: number, data: any) => api.put(`/exams/${id}`, data),
  delete: (id: number) => api.delete(`/exams/${id}`),
  publish: (id: number) => api.post(`/exams/${id}/publish`),
  start: (examId: number, studentId: number) =>
    api.post(`/exams/${examId}/start`, { studentId }),
  submitAnswer: (sessionId: number, questionId: number, content: string) =>
    api.post(`/exams/sessions/${sessionId}/answer`, { questionId, content }),
  submit: (sessionId: number) =>
    api.post(`/exams/sessions/${sessionId}/submit`),
  getResults: (classId: number, examId?: number) =>
    api.get(`/exams/results/${classId}`, { params: examId ? { examId } : {} }),
};

// Questions
export const questionsApi = {
  getByExam: (examId: number) => api.get(`/questions/exam/${examId}`),
  create: (examId: number, data: any) => api.post(`/questions/exam/${examId}`, data),
  bulkCreate: (examId: number, questions: any[]) =>
    api.post(`/questions/exam/${examId}/bulk`, { questions }),
  update: (id: number, data: any) => api.put(`/questions/${id}`, data),
  delete: (id: number) => api.delete(`/questions/${id}`),
};

// Scoring
export const scoringApi = {
  scoreSession: (sessionId: number) => api.post(`/scoring/session/${sessionId}`),
};

// Cheat
export const cheatApi = {
  getAlerts: () => api.get('/cheat/alerts'),
  getSessionLogs: (sessionId: number) => api.get(`/cheat/session/${sessionId}`),
  unlock: (logId: number) => api.post(`/cheat/${logId}/unlock`),
  terminate: (logId: number) => api.post(`/cheat/${logId}/terminate`),
};

// Dashboard
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
};

export default api;
