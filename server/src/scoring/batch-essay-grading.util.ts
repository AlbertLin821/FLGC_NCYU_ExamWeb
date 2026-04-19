/**
 * 教師端集體批閱：依考卷實際 essay 題數動態組 Prompt，並解析模型 JSON。
 */

export type EssayQuestionForBatch = {
  questionId: number;
  orderNum: number;
  maxPoints: number;
  promptText: string | null;
  word1: string | null;
  word2: string | null;
  studentAnswer: string | null;
};

export type ParsedEssayItem = {
  questionId: number;
  pointsEarned: number;
  errorAnalysis: string;
  feedback?: string;
};

export type ParsedBatchEssayGrading = {
  questions: ParsedEssayItem[];
  overallFeedbackEn: string;
  overallFeedbackZh: string;
};

export function buildBatchEssayGradingPrompt(
  studentLabel: string,
  items: EssayQuestionForBatch[],
): string {
  const n = items.length;
  const lines = items.map((it, idx) => {
    const words =
      it.word1 || it.word2
        ? `Target words: ${[it.word1, it.word2].filter(Boolean).join(', ')}`
        : 'Target words: (not specified)';
    const ans = (it.studentAnswer ?? '').trim();
    const shown = ans.length ? ans : '(blank — student did not answer)';
    return (
      `Question ${idx + 1} (questionId=${it.questionId}, order=${it.orderNum}, maxPoints=${it.maxPoints}):\n` +
      `${words}\n` +
      `Question prompt: ${(it.promptText ?? '').trim() || '(none)'}\n` +
      `Student answer: ${shown}\n`
    );
  });

  const rubric = [
    'Role: You are a professional English teacher grading a "Two-Word Sentence Writing" style quiz.',
    'Rules: For each question, the student must use the TWO provided words (if any) in ONE sentence; they may change word forms and order.',
    `Scoring: Each question has its own maxPoints (see above). Total of all maxPoints is the quiz maximum. Deduct marks for grammar, spelling, punctuation, capitalization, etc. Minimum per question is 0. Blank answers score 0.`,
    'Output: Respond with ONE JSON object ONLY (no markdown fences, no commentary). Use this exact shape:',
    '{',
    '  "questions": [',
    '    { "questionId": <number>, "pointsEarned": <number 0..maxPoints for that question>, "errorAnalysis": "<string>", "feedback": "<optional string>" }',
    '  ],',
    '  "overallFeedbackEn": "<max 2 sentences in English>",',
    '  "overallFeedbackZh": "<max 2 sentences in Traditional Chinese>"',
    '}',
    `The "questions" array MUST have exactly ${n} entries, in the same order as listed below, and questionId MUST match.`,
    '',
    `Student: ${studentLabel}`,
    `There are ${n} essay question(s).`,
    '',
    ...lines,
  ].join('\n');

  return rubric;
}

function extractJsonObject(raw: string): unknown {
  const t = raw.trim();
  try {
    return JSON.parse(t);
  } catch {
    const m = t.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('No JSON object in model output');
    return JSON.parse(m[0]);
  }
}

export function parseBatchEssayGradingResponse(
  raw: string,
  expected: EssayQuestionForBatch[],
): ParsedBatchEssayGrading {
  const parsed = extractJsonObject(raw) as Record<string, unknown>;
  const qArr = parsed.questions;
  if (!Array.isArray(qArr) || qArr.length !== expected.length) {
    throw new Error(`questions array must have length ${expected.length}`);
  }

  const maxById = new Map(expected.map((e) => [e.questionId, e.maxPoints]));
  const questions: ParsedEssayItem[] = [];

  for (let i = 0; i < expected.length; i++) {
    const row = qArr[i] as Record<string, unknown>;
    const questionId = Number(row.questionId);
    if (!Number.isFinite(questionId) || questionId !== expected[i].questionId) {
      throw new Error(`questionId mismatch at index ${i}: expected ${expected[i].questionId}`);
    }
    const maxPts = Math.max(1, maxById.get(questionId) ?? 1);
    let pointsEarned = Number(row.pointsEarned);
    if (!Number.isFinite(pointsEarned)) pointsEarned = 0;
    pointsEarned = Math.min(maxPts, Math.max(0, pointsEarned));
    const errorAnalysis = String(row.errorAnalysis ?? '').trim() || '(none)';
    const feedback = row.feedback != null ? String(row.feedback).trim() : undefined;
    questions.push({ questionId, pointsEarned, errorAnalysis, feedback });
  }

  const overallFeedbackEn = String(parsed.overallFeedbackEn ?? '').trim();
  const overallFeedbackZh = String(parsed.overallFeedbackZh ?? '').trim();
  if (!overallFeedbackEn || !overallFeedbackZh) {
    throw new Error('overallFeedbackEn and overallFeedbackZh are required');
  }

  return { questions, overallFeedbackEn, overallFeedbackZh };
}

/** 將該題得分換算為 Answer.aiScore（0–100 百分制） */
export function pointsToAiScorePercent(pointsEarned: number, maxPoints: number): number {
  const mp = Math.max(1, maxPoints);
  const p = Math.min(mp, Math.max(0, pointsEarned));
  return Math.round((p / mp) * 10000) / 100;
}
