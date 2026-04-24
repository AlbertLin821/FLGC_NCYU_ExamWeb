import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';

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

type CachedResponse = AxiosResponse<any>;
type CacheEntry = {
  response?: CachedResponse;
  timestamp: number;
  promise?: Promise<CachedResponse>;
};

const GET_CACHE_TTL_MS = 45_000;
const getCache = new Map<string, CacheEntry>();

function stableParams(params: unknown): string {
  if (!params || typeof params !== 'object') return '';
  const entries = Object.entries(params as Record<string, unknown>)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(entries);
}

function getCacheKey(url: string, config?: AxiosRequestConfig): string {
  const token = localStorage.getItem('token') ?? '';
  return `${token}|${url}|${stableParams(config?.params)}`;
}

function cachedGet(url: string, config?: AxiosRequestConfig, ttlMs = GET_CACHE_TTL_MS) {
  const key = getCacheKey(url, config);
  const cached = getCache.get(key);
  const now = Date.now();

  if (cached?.response && now - cached.timestamp < ttlMs) {
    return Promise.resolve(cached.response);
  }

  if (cached?.promise) {
    return cached.promise;
  }

  const request = api.get(url, config).then((response) => {
    getCache.set(key, { response, timestamp: Date.now() });
    return response;
  }).catch((error) => {
    if (cached?.response) {
      getCache.set(key, { response: cached.response, timestamp: cached.timestamp });
    } else {
      getCache.delete(key);
    }
    throw error;
  });

  getCache.set(key, { ...cached, promise: request, timestamp: cached?.timestamp ?? now });
  return request;
}

function prefetchGet(url: string, config?: AxiosRequestConfig) {
  void cachedGet(url, config).catch(() => {
    /* Prefetch is best-effort; page-level requests still handle errors. */
  });
}

function invalidateGetCache(pathIncludes: string[]) {
  for (const key of getCache.keys()) {
    if (pathIncludes.some((path) => key.includes(path))) {
      getCache.delete(key);
    }
  }
}

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
      const reqUrl = String(err.config?.url ?? '');
      // POST /api/auth/login 的 401 為帳號或密碼錯誤，不可當成 Token 失效，否則會誤導向並顯示「登入已過期或無效」
      if (!reqUrl.includes('auth/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('teacher');
        if (window.location.pathname.startsWith('/teacher')) {
          window.location.href = '/teacher/login?reason=session';
        }
      }
    }
    return Promise.reject(err);
  },
);

// Auth
export const authApi = {
  teacherLogin: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  studentVerify: (studentId: string) =>
    api.post('/auth/student/verify', { studentId }),
  requestPasswordReset: (email: string) =>
    api.post('/auth/request-reset', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),
};

// Teachers
export const teachersApi = {
  getProfile: () => cachedGet('/teachers/me'),
  getAll: () => cachedGet('/teachers'),
  create: (data: { email: string; password: string; name: string; role?: string }) =>
    api.post('/teachers', data).then((res) => {
      invalidateGetCache(['/teachers', '/dashboard']);
      return res;
    }),
  updatePassword: (id: number, password: string) =>
    api.patch(`/teachers/${id}/password`, { password }),
  delete: (id: number) => api.delete(`/teachers/${id}`).then((res) => {
    invalidateGetCache(['/teachers', '/dashboard']);
    return res;
  }),
};

// Classes
export const classesApi = {
  getAll: () => cachedGet('/classes'),
  getById: (id: number) => cachedGet(`/classes/${id}`),
  getStats: (id: number) => cachedGet(`/classes/${id}/stats`),
  create: (data: { name: string; description?: string }) => api.post('/classes', data).then((res) => {
    invalidateGetCache(['/classes', '/students', '/exams', '/dashboard']);
    return res;
  }),
  update: (id: number, data: any) => api.put(`/classes/${id}`, data).then((res) => {
    invalidateGetCache(['/classes', '/students', '/exams', '/dashboard']);
    return res;
  }),
  delete: (id: number) => api.delete(`/classes/${id}`).then((res) => {
    invalidateGetCache(['/classes', '/students', '/exams', '/dashboard']);
    return res;
  }),
  addTeacher: (classId: number, teacherId: number) =>
    api.post(`/classes/${classId}/teachers`, { teacherId }).then((res) => {
      invalidateGetCache(['/classes', '/teachers']);
      return res;
    }),
};

// Students
export const studentsApi = {
  /** 管理員：未帶 classId 時為全校列表（分頁） */
  getAll: (page?: number, limit?: number) =>
    cachedGet('/students', { params: { page, limit } }),
  getByClass: (classId: number) => cachedGet(`/students`, { params: { classId } }),
  getById: (id: number) => cachedGet(`/students/${id}`),
  getExams: (id: number) => cachedGet(`/students/${id}/exams`, undefined, 20_000),
  bulkImport: (students: { studentId: string; name: string; schoolName: string }[], classId: number) =>
    api.post('/students/import', { students, classId }).then((res) => {
      invalidateGetCache(['/students', '/classes', '/dashboard']);
      return res;
    }),
  create: (data: any) => api.post('/students', data).then((res) => {
    invalidateGetCache(['/students', '/classes', '/dashboard']);
    return res;
  }),
  update: (id: number, data: any) => api.put(`/students/${id}`, data).then((res) => {
    invalidateGetCache(['/students', '/classes', '/dashboard']);
    return res;
  }),
  delete: (id: number) => api.delete(`/students/${id}`).then((res) => {
    invalidateGetCache(['/students', '/classes', '/dashboard']);
    return res;
  }),
};

// Exams
export const examsApi = {
  getAll: (classId?: number) =>
    cachedGet('/exams', { params: classId ? { classId } : {} }),
  getById: (id: number) => cachedGet(`/exams/${id}`),
  create: (data: any) => api.post('/exams', data).then((res) => {
    invalidateGetCache(['/exams', '/classes', '/students', '/dashboard']);
    return res;
  }),
  update: (id: number, data: any) => api.put(`/exams/${id}`, data).then((res) => {
    invalidateGetCache(['/exams', '/classes', '/students', '/dashboard']);
    return res;
  }),
  delete: (id: number) => api.delete(`/exams/${id}`).then((res) => {
    invalidateGetCache(['/exams', '/classes', '/students', '/dashboard']);
    return res;
  }),
  publish: (id: number) => api.post(`/exams/${id}/publish`).then((res) => {
    invalidateGetCache(['/exams', '/students', '/dashboard']);
    return res;
  }),
  unpublish: (id: number) => api.post(`/exams/${id}/unpublish`).then((res) => {
    invalidateGetCache(['/exams', '/students', '/dashboard']);
    return res;
  }),
  start: (examId: number, studentId: number) =>
    api.post(`/exams/${examId}/start`, { studentId }).then((res) => {
      invalidateGetCache(['/students', '/exams/results', '/dashboard']);
      return res;
    }),
  submitAnswer: (sessionId: number, questionId: number, content: string) =>
    api.post(`/exams/sessions/${sessionId}/answer`, { questionId, content }),
  submit: (sessionId: number) =>
    api.post(`/exams/sessions/${sessionId}/submit`).then((res) => {
      invalidateGetCache(['/students', '/exams/results', '/dashboard']);
      return res;
    }),
  getResults: (classId: number, examId?: number) =>
    cachedGet(`/exams/results/${classId}`, { params: examId ? { examId } : {} }, 20_000),
};

// Questions
export const questionsApi = {
  getByExam: (examId: number) => cachedGet(`/questions/exam/${examId}`),
  create: (examId: number, data: any) => api.post(`/questions/exam/${examId}`, data).then((res) => {
    invalidateGetCache(['/questions', '/exams']);
    return res;
  }),
  bulkCreate: (examId: number, questions: any[]) =>
    api.post(`/questions/exam/${examId}/bulk`, { questions }).then((res) => {
      invalidateGetCache(['/questions', '/exams']);
      return res;
    }),
  update: (id: number, data: any) => api.put(`/questions/${id}`, data).then((res) => {
    invalidateGetCache(['/questions', '/exams']);
    return res;
  }),
  delete: (id: number) => api.delete(`/questions/${id}`).then((res) => {
    invalidateGetCache(['/questions', '/exams']);
    return res;
  }),
};

// Scoring
export const scoringApi = {
  scoreSession: (sessionId: number) => api.post(`/scoring/session/${sessionId}`).then((res) => {
    invalidateGetCache(['/students', '/exams/results', '/dashboard']);
    return res;
  }),
  batchEssayGrade: (examId: number, classId: number) =>
    api.post(`/scoring/exams/${examId}/batch-essay-grade`, { classId }).then((res) => {
      invalidateGetCache(['/students', '/exams/results', '/dashboard']);
      return res;
    }),
  manualGradeAnswer: (answerId: number, body: { aiScore: number; aiFeedback?: string }) =>
    api.patch(`/scoring/answers/${answerId}`, body).then((res) => {
      invalidateGetCache(['/students', '/exams/results', '/dashboard']);
      return res;
    }),
};

// Cheat
export const cheatApi = {
  getAlerts: () => cachedGet('/cheat/alerts', undefined, 10_000),
  getSessionLogs: (sessionId: number) => cachedGet(`/cheat/session/${sessionId}`, undefined, 10_000),
  unlock: (logId: number) => api.post(`/cheat/${logId}/unlock`).then((res) => {
    invalidateGetCache(['/cheat', '/dashboard']);
    return res;
  }),
  terminate: (logId: number) => api.post(`/cheat/${logId}/terminate`).then((res) => {
    invalidateGetCache(['/cheat', '/dashboard']);
    return res;
  }),
};

// Dashboard
export const dashboardApi = {
  getStats: () => cachedGet('/dashboard/stats', undefined, 15_000),
};

export function warmTeacherData(role: string | null) {
  const run = () => {
    prefetchGet('/dashboard/stats', undefined);
    prefetchGet('/exams', { params: {} });
    prefetchGet('/cheat/alerts', undefined);
    if (role !== 'viewer') {
      prefetchGet('/classes', undefined);
    }
    if (role === 'admin') {
      prefetchGet('/teachers', undefined);
      prefetchGet('/teachers/me', undefined);
    }
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 1500 });
  } else {
    globalThis.setTimeout(run, 250);
  }
}

export default api;
