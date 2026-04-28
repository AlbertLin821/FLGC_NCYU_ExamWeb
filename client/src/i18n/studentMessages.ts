export type StudentLocale = 'zh-TW' | 'en';

export const STUDENT_LOCALE_STORAGE_KEY = 'ncyu-student-locale';

export const studentMessages = {
  'zh-TW': {
    header: {
      home: '首頁',
      teacherLogin: '老師登入',
      teacherPortal: '管理端',
      logout: '登出',
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
      query: '登入',
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
      readFirst: '閱讀考卷說明',
    },
    examIntro: {
      title: '考卷說明',
      subtitle: '請先閱讀本測驗的目的與作答方式，再開始作答。',
      instructions: '考卷說明',
      noInstructions: '本考卷暫無額外說明，請依題目指示作答。',
      examInfo: '考卷資訊',
      questions: '題數',
      duration: '作答時間',
      minutes: '分鐘',
      opens: '開放時間',
      closes: '截止時間',
      back: '返回考卷列表',
      start: '開始作答',
      continue: '繼續作答',
      loading: '載入考卷說明中...',
      error: '無法取得考卷說明，請稍後再試。',
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
      teacherLogin: 'Teacher Login',
      teacherPortal: 'Dashboard',
      logout: 'Sign Out',
    },
    home: {
      chooseRole: 'Choose your role to enter the platform.',
      studentTitle: 'Student',
      studentTitleEn: '學生',
      studentDesc: 'Take AI English writing assessments and view available exams.',
      studentCta: 'Enter',
      teacherTitle: 'Teacher',
      teacherTitleEn: '老師',
      teacherAdmin: '/ Admin',
      teacherDesc: 'Manage exams, grading workflows, classes, and analytics.',
      teacherCtaEnter: 'Open dashboard',
      teacherCtaLogin: 'Teacher login',
    },
    login: {
      title: 'Student Login',
      subtitle: 'Enter your student ID to verify your identity and access your exams.',
      label: 'Student ID',
      placeholder: 'e.g. 411200000',
      query: 'Enter',
      errorNotFound: 'Student ID not found. Please check and try again.',
      footer: 'For technical help, contact the Language Center.',
      confirmTitle: 'Confirm your information',
      school: 'School',
      classLabel: 'Class',
      studentId: 'Student ID',
      name: 'Name',
      backEdit: 'Back',
      confirmEnter: 'Continue',
    },
    exams: {
      greeting: 'Hi, {{name}}',
      metaSchool: 'School',
      metaClass: 'Class',
      metaId: 'Student ID',
      metaName: 'Name',
      intro: 'These are the tests you can take right now.',
      errorFetch: 'Could not load exams. Check your network and try again.',
      empty: 'No exams available right now.',
      diffEasy: 'Beginner',
      diffMedium: 'Intermediate',
      diffHard: 'Advanced',
      questions: 'questions',
      minutes: 'min',
      opens: 'Opens',
      closes: 'Closes',
      done: 'Completed',
      continue: 'Continue exam',
      enter: 'Enter exam',
      readFirst: 'Read instructions',
    },
    examIntro: {
      title: 'Exam instructions',
      subtitle: 'Read the exam purpose and instructions before you begin.',
      instructions: 'Instructions',
      noInstructions: 'No extra instructions were provided for this exam.',
      examInfo: 'Exam Information',
      questions: 'Questions',
      duration: 'Time Limit',
      minutes: 'min',
      opens: 'Opens',
      closes: 'Closes',
      back: 'Back to exam list',
      start: 'Start exam',
      continue: 'Continue exam',
      loading: 'Loading exam instructions...',
      error: 'Could not load the exam instructions. Please try again later.',
    },
    result: {
      title: 'Exam Submitted',
      submitted: 'Your answers have been submitted.',
      note: 'Please wait for your instructor to release the final results. Contact the proctor if you have questions.',
      backList: 'Back to exams',
      home: 'Home',
    },
    exam: {
      loading: 'Loading...',
      inProgress: 'Exam in progress',
      timeLeft: 'Time remaining',
      progress: 'Progress',
      question: 'Question {{n}}',
      essayPlaceholder:
        'Type your answer here. For short-answer items, leaving it blank and pressing Next means no answer will be recorded.',
      paragraphPlaceholder:
        'Type your paragraph response here. About 500 words is recommended.',
      wordCount: 'Word count',
      hintEssay:
        '* Multiple-choice answers are saved when you press “Next”. Writing responses auto-save about every 45 seconds when the content changes.',
      hintChoice: '* Your answer is saved when you press “Next”.',
      next: 'Next',
      submit: 'Submit exam',
      pausedTitle: 'Exam Paused',
      pauseWaitTeacher: 'The exam is paused. Please wait for your instructor.',
      pauseForced: 'The exam was paused. Please wait for assistance.',
      pauseDefault: 'The system detected unusual activity. Please wait for your instructor to resume.',
      pauseKeepOpen: 'Keep this page open. Do not close it.',
      alertEnterFail: 'Unable to enter the exam.',
      alertAnswerFirst: 'Please select or enter an answer first.',
      alertSaveFail: 'Unable to save your answer. Please check your network.',
      alertSubmitFail: 'Submit failed. Please contact the proctor.',
      socketLineConnected: 'Live exam connection: connected',
      socketLineReconnecting: 'Live exam connection: reconnecting (alerts may be delayed)',
      socketLineOffline: 'Live exam connection: offline (alerts may not be sent)',
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
