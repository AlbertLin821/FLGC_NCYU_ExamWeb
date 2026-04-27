export type StudentLocale = 'zh-TW' | 'en';

export const STUDENT_LOCALE_STORAGE_KEY = 'ncyu-student-locale';

export const studentMessages = {
  'zh-TW': {
    header: {
      home: '首頁',
      teacherLogin: '老師登入',
    },
    home: {
      chooseRole: '選擇身分類別進入平台。',
      studentTitle: '學生',
      studentTitleEn: 'STUDENT',
      studentDesc: '進行 AI 英文寫作評測、查看可考考卷',
      studentCta: '進入考試',
      teacherTitle: '老師',
      teacherTitleEn: 'TEACHER',
      teacherAdmin: '/ 管理端',
      teacherDesc: '出題管理、批改流程、班級與評測統計',
      teacherCtaEnter: '進入管理端',
      teacherCtaLogin: '管理登入',
    },
    login: {
      title: '學生身分驗證',
      subtitle: '請輸入學號以確認身分並進入測驗',
      label: '學號 (Student ID)',
      placeholder: '例如: 411200000',
      query: '查詢學生資料',
      errorNotFound: '查無此學號，請重新輸入',
      footer: '如有任何技術問題，請聯繫語言中心。',
      confirmTitle: '確認學生資料',
      school: '校名',
      classLabel: '所屬班級',
      studentId: '學號',
      name: '姓名',
      backEdit: '返回修改',
      confirmEnter: '確認進入考試',
    },
    exams: {
      greeting: 'Hi，{{name}}',
      metaSchool: '校名',
      metaClass: '所屬班級',
      metaId: '學號',
      metaName: '姓名',
      intro: '以下是目前可參加的測驗',
      errorFetch: '無法取得考卷列表，請檢查網路連線或稍後再試。',
      empty: '目前沒有可考的考卷',
      diffEasy: '初級',
      diffMedium: '中級',
      diffHard: '進階',
      questions: '題',
      minutes: '分鐘',
      opens: '開放時間',
      closes: '截止時間',
      done: '已完成測驗',
      continue: '繼續測驗',
      enter: '進入考場',
    },
    result: {
      title: '測驗已提交成功',
      submitted: '答卷已送出',
      note: '請靜候老師公布最後成績；如有疑問請洽監考老師。',
      backList: '返回考卷列表',
      home: '回到首頁',
    },
    exam: {
      loading: '載入中...',
      inProgress: '正在測驗',
      timeLeft: '剩餘時間',
      progress: '進度',
      question: '第 {{n}} 題',
      essayPlaceholder:
        '在這邊輸入您的答案（問答題可留白，按下一題即視為不作答）',
      paragraphPlaceholder:
        '請在此輸入段落寫作內容（建議約 500 字）',
      wordCount: '目前字數',
      hintEssay:
        '* 選擇／多選於按「下一題」時儲存；非選擇題另約每 45 秒自動儲存一次（內容有變更時才寫入）',
      hintChoice: '* 按「下一題」時儲存該題答案',
      next: '下一題',
      submit: '確認交卷',
      pausedTitle: '測驗已暫停',
      pauseWaitTeacher: '測驗暫停中，請等待老師處理',
      pauseForced: '考試已被強制暫停，請等待處理',
      pauseDefault: '系統偵測到異常操作，請等待老師解除鎖定',
      pauseKeepOpen: '請保持本頁面開啟，不要關閉',
      alertEnterFail: '進入考場失敗',
      alertAnswerFirst: '請先選擇或填寫答案',
      alertSaveFail: '儲存答案失敗，請檢查網路',
      alertSubmitFail: '交卷失敗，請聯繫監考老師',
      socketLineConnected: '考場即時連線：已連線',
      socketLineReconnecting: '考場即時連線：重新連線中（事件通報可能延遲）',
      socketLineOffline: '考場即時連線：無法連線（即時通報可能無法送出）',
    },
  },
  en: {
    header: {
      home: 'Home',
      teacherLogin: 'Teacher login',
    },
    home: {
      chooseRole: 'Choose your role to enter the platform.',
      studentTitle: '學生',
      studentTitleEn: 'Student',
      studentDesc: 'Take the AI English writing test and view available exams.',
      studentCta: 'Enter as student',
    },
    login: {
      title: 'Student sign-in',
      subtitle: 'Enter your student ID to verify your identity and open exams.',
      label: 'Student ID',
      placeholder: 'e.g. 411200000',
      query: 'Look up',
      errorNotFound: 'Student ID not found. Please check and try again.',
      footer: 'For technical help, contact the Language Center.',
      confirmTitle: 'Confirm your information',
      school: 'School',
      classLabel: 'Class',
      studentId: 'Student ID',
      name: 'Name',
      backEdit: 'Back',
      confirmEnter: 'Continue to exams',
    },
    exams: {
      greeting: 'Hi, {{name}}',
      metaSchool: 'School',
      metaClass: 'Class',
      metaId: 'ID',
      metaName: 'Name',
      intro: 'These are the tests you can take right now.',
      errorFetch: 'Could not load exams. Check your network and try again.',
      empty: 'No exams available right now.',
      diffEasy: 'Basic',
      diffMedium: 'Intermediate',
      diffHard: 'Advanced',
      questions: 'Q',
      minutes: 'min',
      opens: 'Opens',
      closes: 'Closes',
      done: 'Completed',
      continue: 'Continue',
      enter: 'Enter',
    },
    result: {
      title: 'Test submitted',
      submitted: 'Your answers were sent.',
      note: 'Please wait for your instructor to release scores. Contact the proctor if you have questions.',
      backList: 'Back to exams',
      home: 'Home',
    },
    exam: {
      loading: 'Loading...',
      inProgress: 'In progress',
      timeLeft: 'Time left',
      progress: 'Progress',
      question: 'Question {{n}}',
      essayPlaceholder:
        'Type your answer (essay may be left blank; Next counts as no answer for that item)',
      paragraphPlaceholder:
        'Type your paragraph response here (about 500 words is recommended).',
      wordCount: 'Word count',
      hintEssay:
        '* Multiple choice is saved on “Next”. Writing responses auto-save about every 45s when the text changes.',
      hintChoice: '* Your answer is saved when you press “Next”.',
      next: 'Next',
      submit: 'Submit',
      pausedTitle: 'Exam paused',
      pauseWaitTeacher: 'The exam is paused. Please wait for your instructor.',
      pauseForced: 'The exam was paused. Please wait for assistance.',
      pauseDefault: 'The system detected unusual activity. Please wait for your instructor to resume.',
      pauseKeepOpen: 'Keep this page open. Do not close it.',
      alertEnterFail: 'Could not start the exam.',
      alertAnswerFirst: 'Select or enter an answer first.',
      alertSaveFail: 'Could not save. Check your network.',
      alertSubmitFail: 'Submit failed. Please contact the proctor.',
      socketLineConnected: 'Live (exam): connected',
      socketLineReconnecting: 'Live (exam): reconnecting (alerts may be delayed)',
      socketLineOffline: 'Live (exam): offline (alerts may not be sent)',
    },
  },
} as const;

type MessageTree = (typeof studentMessages)['zh-TW'];

function getByPath(obj: MessageTree, path: string): string {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return path;
    }
  }
  return typeof cur === 'string' ? cur : path;
}

export function getStudentExamSocketLine(
  locale: StudentLocale,
  status: 'connected' | 'reconnecting' | 'disconnected',
): string {
  const key =
    status === 'connected' ? 'exam.socketLineConnected' : status === 'reconnecting' ? 'exam.socketLineReconnecting' : 'exam.socketLineOffline';
  return getStudentString(locale, key);
}

export function getStudentString(locale: StudentLocale, path: string, vars?: Record<string, string | number>): string {
  const tree = studentMessages[locale] as MessageTree;
  let s = getByPath(tree, path);
  if (vars) {
    s = s.replace(/\{\{(\w+)\}\}/g, (_, k) => {
      const v = vars[k];
      return v !== undefined && v !== null ? String(v) : '';
    });
  }
  return s;
}
