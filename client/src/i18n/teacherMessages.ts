export type TeacherLocale = 'zh-TW' | 'en';

export const TEACHER_LOCALE_STORAGE_KEY = 'ncyu-teacher-locale';

export const teacherMessages = {
  'zh-TW': {
    header: {
      home: '首頁',
      teacherLogin: '老師登入',
      teacherPortal: '管理端',
      logout: '登出',
    },
    nav: {
      overview: '儀表板',
      cheat: '防弊監控',
      menu: '功能選單',
    },
    login: {
      title: '老師 / 管理端登入',
      subtitle: '請輸入帳號與密碼',
      email: '電子郵件',
      emailPlaceholder: 'example@ncyu.edu.tw',
      password: '密碼',
      passwordPlaceholder: '請輸入密碼',
      submit: '登入後台管理',
      forgot: '忘記密碼？',
      error: '帳號或密碼錯誤',
      sessionExpired: '登入已過期或無效，請重新登入。',
      forbidden: '目前帳號權限不足，請使用具教師或管理員身分之帳號登入。',
    },
    forgot: {
      title: '忘記密碼',
      subtitle: '請輸入註冊信箱以取得重設驗證碼。',
      submit: '發送驗證碼',
      back: '返回登入',
      remember: '想起來了？返回登入',
      error: '發生錯誤，請稍後再試',
      testMode: '測試模式：您的驗證碼為',
      directReset: '直接前往重設頁面',
    },
    reset: {
      title: '重設密碼',
      subtitle: '請輸入驗證碼與新密碼。',
      token: '驗證碼',
      tokenPlaceholder: '輸入驗證碼',
      newPassword: '新密碼',
      newPasswordPlaceholder: '至少 6 個字元',
      confirmPassword: '確認新密碼',
      confirmPasswordPlaceholder: '再次輸入新密碼',
      submit: '更新密碼',
      successRedirect: '即將在 3 秒後跳轉至登入頁面...',
      loginNow: '立即登入',
      mismatch: '兩次輸入的密碼不一致',
      tooShort: '密碼長度至少需要 6 個字元',
      invalid: '驗證碼無效或已過期',
    },
    dashboard: {
      activeSessions: '目前作答人數',
      activeSessionsHint: '正在作答中的學生場次',
      pendingAlerts: '待處理異常',
      pendingAlertsHint: '請見監控面板',
      submissions: '本週交卷數',
      submissionsHint: '即時連線數據',
      incompleteScores: '成績未完成',
      incompleteScoresHint: '待評分 {{awaiting}}／待複閱 {{review}}',
      logs: '系統日誌',
      logsEmpty: '暫無最新日誌',
      changePassword: '修改我的密碼',
      currentPassword: '目前密碼',
      newPassword: '新密碼',
      confirmPassword: '確認新密碼',
      savePassword: '更新密碼',
      savingPassword: '更新中…',
      passwordTooShort: '新密碼至少須 8 個字元',
      passwordMismatch: '兩次輸入的新密碼不一致',
      passwordUpdated: '密碼已更新',
      passwordUpdateFailed: '密碼更新失敗',
    },
    cheat: {
      title: '防弊即時監控',
      subtitle: '此處將顯示學生在考試中發生的異常操作。',
      empty: '目前無待處理的異常事件',
      unlock: '解除封鎖並恢復考試',
      terminate: '強制結束考試',
      resolveFailed: '操作失敗',
      exam: '考卷',
      abnormalPrefix: '異常',
      tabSwitch: '切換分頁',
      windowBlur: '視窗失焦',
      exitFullscreen: '退出全螢幕',
      browserBack: '瀏覽器返回',
      grammarExtension: '偵測到文法外掛',
      unknown: '異常操作',
    },
  },
  en: {
    header: {
      home: 'Home',
      teacherLogin: 'Teacher Login',
      teacherPortal: 'Dashboard',
      logout: 'Sign Out',
    },
    nav: {
      overview: 'Dashboard',
      cheat: 'Cheat Monitor',
      menu: 'Menu',
    },
    login: {
      title: 'Teacher / Admin Sign In',
      subtitle: 'Enter your account and password.',
      email: 'Email',
      emailPlaceholder: 'example@ncyu.edu.tw',
      password: 'Password',
      passwordPlaceholder: 'Enter your password',
      submit: 'Sign in',
      forgot: 'Forgot password?',
      error: 'Incorrect email or password',
      sessionExpired: 'Your session expired or is invalid. Please sign in again.',
      forbidden: 'This account does not have access. Please use a teacher or admin account.',
    },
    forgot: {
      title: 'Forgot password',
      subtitle: 'Enter your email to receive a reset token.',
      submit: 'Send reset token',
      back: 'Back to sign in',
      remember: 'Remembered it? Back to sign in',
      error: 'Something went wrong. Please try again later.',
      testMode: 'Test mode: your reset token is',
      directReset: 'Open reset page now',
    },
    reset: {
      title: 'Reset password',
      subtitle: 'Enter your token and new password.',
      token: 'Token',
      tokenPlaceholder: 'Enter the token',
      newPassword: 'New password',
      newPasswordPlaceholder: 'At least 6 characters',
      confirmPassword: 'Confirm new password',
      confirmPasswordPlaceholder: 'Enter the new password again',
      submit: 'Update password',
      successRedirect: 'Redirecting to sign in in 3 seconds...',
      loginNow: 'Sign in now',
      mismatch: 'The passwords do not match.',
      tooShort: 'The password must be at least 6 characters long.',
      invalid: 'The token is invalid or expired.',
    },
    dashboard: {
      activeSessions: 'Active test takers',
      activeSessionsHint: 'Students currently working on exams',
      pendingAlerts: 'Pending alerts',
      pendingAlertsHint: 'See the monitor panel',
      submissions: 'Submissions this week',
      submissionsHint: 'Live submission count',
      incompleteScores: 'Scoring pending',
      incompleteScoresHint: 'Awaiting {{awaiting}} / Review {{review}}',
      logs: 'System log',
      logsEmpty: 'No recent logs',
      changePassword: 'Change my password',
      currentPassword: 'Current password',
      newPassword: 'New password',
      confirmPassword: 'Confirm new password',
      savePassword: 'Update password',
      savingPassword: 'Updating…',
      passwordTooShort: 'Your new password must contain at least 8 characters.',
      passwordMismatch: 'The new passwords do not match.',
      passwordUpdated: 'Password updated.',
      passwordUpdateFailed: 'Password update failed.',
    },
    cheat: {
      title: 'Live cheat monitor',
      subtitle: 'This panel shows unusual student actions during exams.',
      empty: 'No pending alerts right now.',
      unlock: 'Resume exam',
      terminate: 'Force finish exam',
      resolveFailed: 'Action failed',
      exam: 'Exam',
      abnormalPrefix: 'Alert',
      tabSwitch: 'Tab switch',
      windowBlur: 'Window blur',
      exitFullscreen: 'Exit fullscreen',
      browserBack: 'Browser back',
      grammarExtension: 'Grammar extension detected',
      unknown: 'Unusual action',
    },
  },
} as const;

type MessageTree = (typeof teacherMessages)['zh-TW'];

function getByPath(obj: MessageTree, path: string): string {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur && typeof cur === 'object' && part in (cur as object)) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return path;
    }
  }
  return typeof cur === 'string' ? cur : path;
}

export function getTeacherString(
  locale: TeacherLocale,
  path: string,
  vars?: Record<string, string | number>,
) {
  const tree = teacherMessages[locale] as MessageTree;
  let result = getByPath(tree, path);
  if (vars) {
    result = result.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = vars[key];
      return value === undefined || value === null ? '' : String(value);
    });
  }
  return result;
}
