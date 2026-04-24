/**
 * k6 學生端「驗證學號 → 開始考試 → 逐題作答 → 隨機延遲 → 交卷」
 *
 * ## 為何會出現 EOF / connectex / 50% 失敗？
 * 網域若在 Cloudflare（常見 IP 172.67.x.x），400 個 VU **同一秒** 打 HTTPS，容易：
 * 連線被重置（EOF）、TCP 逾時、或來源站排隊過長。
 * 建議改用 **K6_USE_ARRIVAL_RATE=1**（固定每秒啟動幾場考試），較接近「分批進場」。
 *
 * ## start 全部非 2xx？
 * 常見：考卷未發布、不在 startTime～endTime、該生該卷已交卷。
 * 可設 K6_LOG_START_FAIL=1 看回應 body；或先用 K6_VUS=1 試跑一筆。
 *
 * ## 學號清單
 * K6_STUDENT_CODES_FILE 一行一學號；筆數應 >= 總迭代數（預設等於清單長度）。
 *
 * ## 模式 A：漸進啟動（建議，接近分批進場）
 *   $env:K6_USE_ARRIVAL_RATE="1"
 *   $env:K6_ARRIVAL_PER_SEC="3"
 *   $env:K6_TOTAL_ITERATIONS="400"
 *   可選：K6_AVG_ITER_SEC（預設 120）用於預估併發、提高 preAllocatedVUs，減少 dropped_iterations。
 *
 * ## 模式 B：瞬間 400 VU（易撞 Cloudflare／來源上限，僅對照用）
 *   勿設 K6_USE_ARRIVAL_RATE，並設 K6_VUS
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import exec from 'k6/execution';

const baseRaw = __ENV.K6_BASE_URL || 'https://ncyulanguageexam.com';
const base = baseRaw.length > 0 && baseRaw[baseRaw.length - 1] === '/' ? baseRaw.slice(0, -1) : baseRaw;
const examId = __ENV.K6_EXAM_ID || '';
const vus = Number(__ENV.K6_VUS || 100);
const answerPause = Number(__ENV.K6_ANSWER_PAUSE_SEC || 0.3);
const submitJitterMax = Number(__ENV.K6_SUBMIT_JITTER_MAX_SEC || 60);
const maxDuration = __ENV.K6_MAX_DURATION || '45m';
const useArrival =
  __ENV.K6_USE_ARRIVAL_RATE === '1' || __ENV.K6_USE_ARRIVAL_RATE === 'true';
const arrivalPerSec = Number(__ENV.K6_ARRIVAL_PER_SEC || 2);
const logStartFail = __ENV.K6_LOG_START_FAIL === '1' || __ENV.K6_LOG_START_FAIL === 'true';

function is2xx(status) {
  return status >= 200 && status < 300;
}

const studentCodes = new SharedArray('studentCodes', function () {
  const file = __ENV.K6_STUDENT_CODES_FILE;
  if (file) {
    return open(file).split('\n').map((s) => s.trim()).filter(function (s) { return s.length > 0; });
  }
  const raw = __ENV.K6_STUDENT_CODES || '';
  return raw.split(',').map((s) => s.trim()).filter(function (s) { return s.length > 0; });
});

const listLen = studentCodes.length;
const totalIters = __ENV.K6_TOTAL_ITERATIONS
  ? Number(__ENV.K6_TOTAL_ITERATIONS)
  : listLen;

const injectSeconds = Math.max(1, Math.ceil(totalIters / arrivalPerSec));
const arrivalDurationSec = injectSeconds + 20;

// 長考程（verify/start/逐題/submit + jitter）時，併發需求約為 rate * 平均迭代秒數。
// 僅 preAlloc 80 會讓 constant-arrival-rate 大量 dropped_iterations，完成數低於 K6_TOTAL_ITERATIONS。
const arrivalMaxVUs = Math.min(500, Math.max(totalIters + 150, totalIters));
const avgIterSec = Number(__ENV.K6_AVG_ITER_SEC || 120);
const arrivalPreAlloc = Math.min(
  arrivalMaxVUs,
  Math.max(80, Math.ceil(arrivalPerSec * avgIterSec)),
);

const burstScenario = {
  executor: 'per-vu-iterations',
  vus: vus,
  iterations: 1,
  maxDuration: maxDuration,
};

const arrivalScenario = {
  executor: 'constant-arrival-rate',
  rate: arrivalPerSec,
  timeUnit: '1s',
  duration: arrivalDurationSec + 's',
  preAllocatedVUs: Math.min(arrivalPreAlloc, totalIters),
  maxVUs: arrivalMaxVUs,
  gracefulStop: '40m',
};

export const options = {
  scenarios: {
    student_exam: useArrival ? arrivalScenario : burstScenario,
  },
  thresholds: {
    http_req_failed: ['rate<0.15'],
    http_req_duration: ['p(95)<60000'],
  },
};

function codeForVu(vu) {
  if (listLen === 0) {
    throw new Error('請設定 K6_STUDENT_CODES_FILE 或 K6_STUDENT_CODES');
  }
  const idx = vu - 1;
  if (idx >= listLen) {
    throw new Error(
      'K6_VUS 大於學號筆數；請增加清單或降低 K6_VUS',
    );
  }
  return studentCodes[idx];
}

export default function () {
  if (!examId || isNaN(Number(examId))) {
    throw new Error('請設定 K6_EXAM_ID（數字）');
  }
  if (listLen === 0) {
    throw new Error('請設定 K6_STUDENT_CODES_FILE 或 K6_STUDENT_CODES');
  }

  var studentCode;
  if (useArrival) {
    var iter = exec.scenario.iterationInTest;
    if (iter >= totalIters) {
      return;
    }
    if (iter >= listLen) {
      throw new Error('K6_TOTAL_ITERATIONS 大於學號清單筆數');
    }
    studentCode = studentCodes[iter];
  } else {
    studentCode = codeForVu(__VU);
  }

  const verifyRes = http.post(
    `${base}/api/auth/student/verify`,
    JSON.stringify({ studentId: studentCode }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'StudentVerify' },
      timeout: '90s',
    },
  );

  const verifyOk = check(verifyRes, {
    'verify 2xx': (r) => is2xx(r.status),
    'verify 有 student.id': (r) => {
      try {
        const b = JSON.parse(r.body);
        return b.student && typeof b.student.id === 'number';
      } catch (e) {
        return false;
      }
    },
  });

  if (!verifyOk || !is2xx(verifyRes.status)) {
    return;
  }

  const { student } = JSON.parse(verifyRes.body);
  const internalStudentId = student.id;

  const startRes = http.post(
    `${base}/api/exams/${examId}/start`,
    JSON.stringify({ studentId: internalStudentId }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'ExamStart' },
      timeout: '90s',
    },
  );

  if (logStartFail && !is2xx(startRes.status)) {
    console.error(
      'ExamStart 失敗 status=',
      startRes.status,
      ' body=',
      String(startRes.body).slice(0, 900),
    );
  }

  const startOk = check(startRes, {
    'start 2xx': (r) => is2xx(r.status),
    'start 有 session': (r) => {
      try {
        const b = JSON.parse(r.body);
        return b.session && typeof b.session.id === 'number';
      } catch (e) {
        return false;
      }
    },
  });

  if (!startOk || !is2xx(startRes.status)) {
    return;
  }

  const startBody = JSON.parse(startRes.body);
  const sessionId = startBody.session.id;
  const questions = startBody.questions || [];

  var qi;
  for (qi = 0; qi < questions.length; qi++) {
    const q = questions[qi];
    const answerRes = http.post(
      `${base}/api/exams/sessions/${sessionId}/answer`,
      JSON.stringify({
        questionId: q.id,
        content: 'k6_' + String(__VU) + '_q' + String(q.id) + '_' + String(Date.now()),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'SubmitAnswer' },
        timeout: '90s',
      },
    );
    check(answerRes, {
      'answer 2xx': (r) => is2xx(r.status),
    });
    if (answerPause > 0) {
      sleep(answerPause);
    }
  }

  if (submitJitterMax > 0) {
    sleep(Math.random() * submitJitterMax);
  }

  const submitRes = http.post(
    `${base}/api/exams/sessions/${sessionId}/submit`,
    JSON.stringify({}),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'ExamSubmit' },
      timeout: '90s',
    },
  );

  check(submitRes, {
    'submit 2xx': (r) => is2xx(r.status),
  });
}
