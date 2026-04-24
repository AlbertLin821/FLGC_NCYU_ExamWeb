/**
 * k6 教師端負載腳本
 *
 * 預設模式（建議）：setup() 只登入一次並共用 JWT，反覆打 /api/exams 與 /api/dashboard/stats。
 * 原因：每次 iteration 都打 /api/auth/login 會觸發 bcrypt，高 VU 在 2 vCPU 單一 Node 上易塞車。
 *
 * 注意：NestJS 的 @Post 預設回傳 201 Created（不是 200）。本腳本以「2xx 即成功」判斷登入。
 *
 * 環境變數（Windows PowerShell）：
 *   $env:K6_BASE_URL="https://ncyulanguageexam.com"
 *   $env:K6_TEACHER_EMAIL="your@email.edu.tw"
 *   $env:K6_TEACHER_PASSWORD="your-password"
 *
 * 若曾設定「每輪登入」，請先關閉（否則只會狂打 login、不打列表）：
 *   Remove-Item Env:K6_LOGIN_EACH_ITER -ErrorAction SilentlyContinue
 *
 * 可選：每輪都登入（僅供小 VU 測登入尖峰，建議 VU<=10）：
 *   $env:K6_LOGIN_EACH_ITER="1"
 *
 * 執行：
 *   k6 run --vus 100 --duration 5m scripts/k6/teacher-load.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const baseRaw = __ENV.K6_BASE_URL || 'https://ncyulanguageexam.com';
const base = baseRaw.length > 0 && baseRaw[baseRaw.length - 1] === '/' ? baseRaw.slice(0, -1) : baseRaw;
const email = __ENV.K6_TEACHER_EMAIL || '';
const password = __ENV.K6_TEACHER_PASSWORD || '';
const loginEachIter = __ENV.K6_LOGIN_EACH_ITER === '1' || __ENV.K6_LOGIN_EACH_ITER === 'true';

function is2xx(status) {
  return status >= 200 && status < 300;
}

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<8000'],
  },
  setupTimeout: '120s',
};

function mustEnv() {
  if (!email || !password) {
    throw new Error('請設定 K6_TEACHER_EMAIL 與 K6_TEACHER_PASSWORD');
  }
}

export function setup() {
  mustEnv();
  const loginRes = http.post(
    `${base}/api/auth/login`,
    JSON.stringify({ email, password }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'LoginSetup' },
      timeout: '120s',
    },
  );
  const ok = check(loginRes, {
    'setup login 2xx': (r) => is2xx(r.status),
    'setup 有 token': (r) => {
      try {
        const b = JSON.parse(r.body);
        return typeof b.accessToken === 'string' && b.accessToken.length > 10;
      } catch (e) {
        return false;
      }
    },
  });
  if (!ok || !is2xx(loginRes.status)) {
    throw new Error(`setup 登入失敗 status=${loginRes.status} body=${String(loginRes.body).slice(0, 200)}`);
  }
  const { accessToken } = JSON.parse(loginRes.body);
  return { accessToken, base };
}

function doAuthenticatedReads(accessToken) {
  const auth = {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: '60s',
  };

  const examsRes = http.get(`${base}/api/exams`, { ...auth, tags: { name: 'Exams' } });
  check(examsRes, {
    'exams 2xx': (r) => is2xx(r.status),
  });

  const dashRes = http.get(`${base}/api/dashboard/stats`, { ...auth, tags: { name: 'Dashboard' } });
  check(dashRes, {
    'dashboard 2xx': (r) => is2xx(r.status),
  });
}

export default function (data) {
  mustEnv();

  if (loginEachIter) {
    const loginRes = http.post(
      `${base}/api/auth/login`,
      JSON.stringify({ email, password }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'Login' },
        timeout: '60s',
      },
    );

    check(loginRes, {
      'login 2xx': (r) => is2xx(r.status),
      'login 有 token': (r) => {
        try {
          const b = JSON.parse(r.body);
          return typeof b.accessToken === 'string' && b.accessToken.length > 10;
        } catch (e) {
          return false;
        }
      },
    });

    if (!is2xx(loginRes.status)) {
      sleep(1);
      return;
    }

    let accessToken;
    try {
      accessToken = JSON.parse(loginRes.body).accessToken;
    } catch (e) {
      sleep(1);
      return;
    }
    if (!accessToken) {
      sleep(1);
      return;
    }
    doAuthenticatedReads(accessToken);
  } else {
    if (!data || !data.accessToken) {
      throw new Error('缺少 setup token：請確認未停用 setup，且未在僅 VU 模式下錯誤執行');
    }
    doAuthenticatedReads(data.accessToken);
  }

  sleep(1);
}
