/**
 * k6 學生端輕量腳本（每輪：驗證學號 -> 開始考試 -> 只送一題）
 *
 * 若要「驗證 -> 全卷作答 -> 隨機延遲後交卷」請改用同目錄 **student-exam-full.js**（較接近四百人考完交卷情境）。
 *
 * 流程：學號驗證 -> 開始考試（取得 session）-> 若有題目則送出一則作答（可選）
 *
 * 環境變數：
 *   K6_BASE_URL        例如 https://ncyulanguageexam.com（勿結尾斜線）
 *   K6_EXAM_ID         數字，已發布且在考試時間內的考卷 ID
 *   K6_STUDENT_CODES   逗號分隔學號；建議數量 >= VU 數，否則會循環共用學號
 *
 * Windows PowerShell：
 *   $env:K6_BASE_URL="https://ncyulanguageexam.com"
 *   $env:K6_EXAM_ID="1"
 *   $env:K6_STUDENT_CODES="s001,s002,s003"
 *
 * 執行：
 *   k6 run --vus 100 --duration 5m scripts/k6/student-load.js
 *
 * 注意：若所有 VU 共用同一學號，後端仍會 upsert 同一 session，壓力較不像「百人同考」，
 *       但能測 API 與 DB 基本負載；正式模擬請準備足夠多筆測試學號。
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const baseRaw = __ENV.K6_BASE_URL || 'https://ncyulanguageexam.com';
const base = baseRaw.length > 0 && baseRaw[baseRaw.length - 1] === '/' ? baseRaw.slice(0, -1) : baseRaw;
const examId = __ENV.K6_EXAM_ID || '';
const codesRaw = __ENV.K6_STUDENT_CODES || '';

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.10'],
    http_req_duration: ['p(95)<12000'],
  },
};

function parseCodes() {
  return codesRaw
    .split(',')
    .map((s) => s.trim())
    .filter(function (s) { return s.length > 0; });
}

function pickStudentCode(vu) {
  const codes = parseCodes();
  if (codes.length === 0) {
    throw new Error('請設定 K6_STUDENT_CODES（逗號分隔學號）');
  }
  return codes[(vu - 1) % codes.length];
}

export default function () {
  if (!examId || isNaN(Number(examId))) {
    throw new Error('請設定 K6_EXAM_ID（數字）');
  }

  const studentCode = pickStudentCode(__VU);

  const verifyRes = http.post(
    `${base}/api/auth/student/verify`,
    JSON.stringify({ studentId: studentCode }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  const verifyOk = check(verifyRes, {
    'verify 200': (r) => r.status === 200,
    'verify 有 student.id': (r) => {
      try {
        const b = JSON.parse(r.body);
        return b.student && typeof b.student.id === 'number';
      } catch (e) {
        return false;
      }
    },
  });

  if (!verifyOk || verifyRes.status !== 200) {
    sleep(1);
    return;
  }

  const { student } = JSON.parse(verifyRes.body);
  const internalStudentId = student.id;

  const startRes = http.post(
    `${base}/api/exams/${examId}/start`,
    JSON.stringify({ studentId: internalStudentId }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  const startOk = check(startRes, {
    'start 200': (r) => r.status === 200,
    'start 有 session': (r) => {
      try {
        const b = JSON.parse(r.body);
        return b.session && typeof b.session.id === 'number';
      } catch (e) {
        return false;
      }
    },
  });

  if (!startOk || startRes.status !== 200) {
    sleep(1);
    return;
  }

  const startBody = JSON.parse(startRes.body);
  const sessionId = startBody.session.id;
  const questions = startBody.questions || [];

  if (questions.length > 0) {
    const q0 = questions[0];
    const answerRes = http.post(
      `${base}/api/exams/sessions/${sessionId}/answer`,
      JSON.stringify({
        questionId: q0.id,
        content: `k6 load ${__VU} ${Date.now()}`,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
    check(answerRes, {
      'answer 2xx': (r) => r.status >= 200 && r.status < 300,
    });
  }

  sleep(1);
}
