export function getTeacherRole(): 'admin' | 'teacher' | 'viewer' | string {
  try {
    const raw = localStorage.getItem('teacher');
    if (!raw) return 'teacher';
    const t = JSON.parse(raw) as { role?: string };
    return t.role || 'teacher';
  } catch {
    return 'teacher';
  }
}
