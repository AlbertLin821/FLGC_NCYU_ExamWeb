/**
 * 題型顯示（與後端 Question.type 一致）
 */
export function questionTypeLabel(type: string | undefined): string {
  switch (type) {
    case 'multiple_choice':
      return '單選題';
    case 'multiple_selection':
      return '多選題';
    case 'essay':
      return '問答题';
    default:
      return type ? String(type) : '題型未知';
  }
}

/**
 * 將 answer.aiModel 轉成教師可讀的「評分來源」與「模型名稱」
 */
export function describeAnswerScoring(aiModel: string | null | undefined): {
  source: string;
  model?: string;
} {
  const m = (aiModel || '').trim();
  if (!m) {
    return { source: '尚未標記' };
  }
  if (m === 'teacher_manual') {
    return { source: '教師手動評分' };
  }
  if (m === 'pending_review') {
    return { source: '待複閱' };
  }
  if (m === 'system') {
    return { source: '系統比對（客觀題）' };
  }
  if (m === 'batch_essay_json') {
    return { source: 'Gemini' };
  }
  if (/gemini/i.test(m)) {
    return { source: 'Gemini', model: m };
  }
  if (/^(gpt-|o\d|claude-)/i.test(m)) {
    return { source: 'AI 自動評分', model: m };
  }
  return { source: '其他', model: m };
}
