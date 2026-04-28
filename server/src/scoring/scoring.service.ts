import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import {
  ensureClassAccess,
  ensureExamAccess,
  ensureStudentAccess,
  type TeacherActor,
} from '../auth/access';

/** 單題與集體批閱使用之 Gemini 模型；可於環境變數 GEMINI_MODEL 覆寫 */
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const DEFAULT_OPENAI_MODEL = 'gpt-4o';
const MAX_AI_REQUESTS_PER_MINUTE = 15;
const MAX_WRITING_QUEUE_RETRIES = 3;
const MAX_WRITING_SESSIONS_PER_BATCH = 5;
const WRITING_BATCH_WAIT_MS = 8_000;
const MAX_WRITING_BATCH_ESTIMATED_CHARS = 24_000;

interface ScoringResult {
  score: number;
  feedback: string;
  model: string;
}

type WritingQuestionType = 'essay' | 'paragraph_writing';
const WRITING_QUESTION_TYPES: WritingQuestionType[] = ['essay', 'paragraph_writing'];

type ParagraphScoringResult = {
  score: number;
  cefrLevel: string;
  report: string;
};

type WritingAnswerForAi = {
  answerId: number;
  questionId: number;
  orderNum: number;
  type: string;
  maxPoints: number;
  promptText: string | null;
  word1: string | null;
  word2: string | null;
  studentAnswer: string | null;
  writingDurationSeconds: number | null;
  wordCount: number | null;
};

type ParsedWritingAiItem = {
  answerId: number;
  questionId: number;
  aiScore: number;
  aiFeedback: string;
  writingScore?: number | null;
  cefrLevel?: string | null;
};

type WritingSessionBatchPayload = {
  sessionId: number;
  items: WritingAnswerForAi[];
};

type ParsedWritingAiSession = {
  sessionId: number;
  items: ParsedWritingAiItem[];
  overallFeedbackEn: string;
  overallFeedbackZh: string;
};

type WritingQueueJob = {
  sessionId: number;
  answerIds: number[];
  attempts: number;
  queuedAt: number;
  estimatedChars: number;
};

/** 供測試與日誌分類：是否為配額／速率限制類錯誤 */
export function classifyAiScoringError(err: unknown): 'rate_limit' | 'provider' | 'other' {
  const msg = err instanceof Error ? err.message : String(err);
  if (/429|RESOURCE_EXHAUSTED|quota|rate|limit: 0|too many requests/i.test(msg)) {
    return 'rate_limit';
  }
  if (/500|502|503|504|INTERNAL|UNAVAILABLE|high demand|try again later/i.test(msg)) {
    return 'provider';
  }
  return 'other';
}

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);
  private openai: OpenAI | null = null;
  private gemini: GoogleGenAI | null = null;
  private readonly writingJobs: WritingQueueJob[] = [];
  private readonly writingJobsBySession = new Map<number, WritingQueueJob>();
  private readonly writingJobsInFlight = new Set<number>();
  private writingQueueTimer: ReturnType<typeof setTimeout> | null = null;
  private writingPumpActive = false;
  private writingMinuteBucket = 0;
  private writingRequestsStartedThisMinute = 0;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const openaiKey = this.config.get<string>('OPENAI_API_KEY');
    const geminiKey = this.config.get<string>('GEMINI_API_KEY');

    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
    }
    if (geminiKey) {
      this.gemini = new GoogleGenAI({ apiKey: geminiKey });
    }
  }

  private resolveGeminiModel(): string {
    return this.config.get<string>('GEMINI_MODEL', DEFAULT_GEMINI_MODEL);
  }

  private resolveOpenAiModel(): string {
    const configured = this.config.get<string>('AI_MODEL');
    if (configured && /^(gpt-|o\d)/i.test(configured)) {
      return configured;
    }
    return DEFAULT_OPENAI_MODEL;
  }

  private resolvePrimaryAiProvider(): 'openai' | 'gemini' {
    const configured = this.config.get<string>('AI_MODEL');
    if (configured) {
      return /^(gpt-|o\d)/i.test(configured) ? 'openai' : 'gemini';
    }
    if (this.openai) {
      return 'openai';
    }
    if (this.gemini) {
      return 'gemini';
    }
    return 'openai';
  }

  private getCurrentMinuteBucket(): number {
    return Math.floor(Date.now() / 60_000);
  }

  private resetWritingMinuteBucketIfNeeded(): void {
    const bucket = this.getCurrentMinuteBucket();
    if (this.writingMinuteBucket !== bucket) {
      this.writingMinuteBucket = bucket;
      this.writingRequestsStartedThisMinute = 0;
    }
  }

  private msUntilNextMinute(): number {
    const now = Date.now();
    return Math.max(1_000, 60_000 - (now % 60_000) + 250);
  }

  private scheduleWritingPump(delayMs: number): void {
    if (this.writingQueueTimer) {
      return;
    }
    this.writingQueueTimer = setTimeout(() => {
      this.writingQueueTimer = null;
      void this.pumpWritingQueue();
    }, delayMs);
  }

  private estimateWritingJobChars(items: Array<{
    promptText?: string | null;
    content?: string | null;
  }>): number {
    return items.reduce((sum, item) => {
      return (
        sum +
        String(item.promptText ?? '').length +
        String(item.content ?? '').length +
        250
      );
    }, 0);
  }

  private async markWritingAnswersQueued(answerIds: number[], attempts: number): Promise<void> {
    const feedback =
      attempts > 0
        ? 'AI 服務暫時忙碌，已重新排入佇列，系統將於下一分鐘繼續批改。'
        : `已進入 AI 批改佇列，系統會依每分鐘 ${MAX_AI_REQUESTS_PER_MINUTE} 筆上限分批送出。`;
    await this.prisma.answer.updateMany({
      where: { id: { in: answerIds } },
      data: {
        aiScore: null,
        aiFeedback: feedback,
        aiModel: 'ai_queued',
      },
    });
  }

  private async markWritingAnswersGrading(answerIds: number[]): Promise<void> {
    await this.prisma.answer.updateMany({
      where: { id: { in: answerIds } },
      data: {
        aiScore: null,
        aiFeedback: 'AI 批改中，請稍後重新整理。',
        aiModel: 'ai_grading',
      },
    });
  }

  private upsertWritingQueueJob(
    sessionId: number,
    answerIds: number[],
    estimatedChars: number,
    attempts = 0,
  ): void {
    const existing = this.writingJobsBySession.get(sessionId);
    if (existing) {
      existing.answerIds = Array.from(new Set([...existing.answerIds, ...answerIds]));
      existing.attempts = Math.max(existing.attempts, attempts);
      existing.estimatedChars = Math.max(existing.estimatedChars, estimatedChars);
      return;
    }
    if (this.writingJobsInFlight.has(sessionId)) {
      return;
    }
    const job: WritingQueueJob = {
      sessionId,
      answerIds: Array.from(new Set(answerIds)),
      attempts,
      queuedAt: Date.now(),
      estimatedChars,
    };
    this.writingJobs.push(job);
    this.writingJobsBySession.set(sessionId, job);
  }

  private async requeueWritingJob(job: WritingQueueJob): Promise<void> {
    await this.markWritingAnswersQueued(job.answerIds, job.attempts);
    this.upsertWritingQueueJob(job.sessionId, job.answerIds, job.estimatedChars, job.attempts);
    this.scheduleWritingPump(this.msUntilNextMinute());
  }

  private buildWritingBatchJobs(): WritingQueueJob[] {
    if (this.writingJobs.length === 0) {
      return [];
    }
    const now = Date.now();
    const oldest = this.writingJobs[0];
    const waitedLongEnough =
      this.writingJobs.length >= MAX_WRITING_SESSIONS_PER_BATCH ||
      now - oldest.queuedAt >= WRITING_BATCH_WAIT_MS;
    if (!waitedLongEnough) {
      this.scheduleWritingPump(WRITING_BATCH_WAIT_MS - (now - oldest.queuedAt) + 50);
      return [];
    }

    const batch: WritingQueueJob[] = [];
    let totalChars = 0;
    while (this.writingJobs.length > 0 && batch.length < MAX_WRITING_SESSIONS_PER_BATCH) {
      const next = this.writingJobs[0];
      const nextChars = totalChars + next.estimatedChars;
      if (batch.length > 0 && nextChars > MAX_WRITING_BATCH_ESTIMATED_CHARS) {
        break;
      }
      this.writingJobs.shift();
      const latest = this.writingJobsBySession.get(next.sessionId);
      if (latest !== next) {
        continue;
      }
      this.writingJobsBySession.delete(next.sessionId);
      totalChars = nextChars;
      batch.push(next);
    }
    return batch;
  }

  private async runWritingQueueBatch(jobs: WritingQueueJob[]): Promise<void> {
    try {
      await this.markWritingAnswersGrading(jobs.flatMap((job) => job.answerIds));
      await this.gradeWritingAnswersBatch(jobs);
    } catch (err) {
      const retryableJobs = jobs.filter((job) => job.attempts < MAX_WRITING_QUEUE_RETRIES);
      if (this.isRetryableAiError(err) && retryableJobs.length > 0) {
        this.logger.warn(
          `writing batch grading retry queued sessions=${jobs.map((job) => job.sessionId).join(',')} : ${this.stringifyAiErr(err).slice(0, 300)}`,
        );
        for (const job of jobs) {
          if (job.attempts < MAX_WRITING_QUEUE_RETRIES) {
            await this.requeueWritingJob({
              ...job,
              attempts: job.attempts + 1,
            });
          } else {
            await this.handleWritingAiFailure(job.answerIds, err);
          }
        }
        return;
      }
      for (const job of jobs) {
        await this.handleWritingAiFailure(job.answerIds, err);
      }
    } finally {
      for (const job of jobs) {
        this.writingJobsInFlight.delete(job.sessionId);
      }
      void this.pumpWritingQueue();
    }
  }

  private async pumpWritingQueue(): Promise<void> {
    if (this.writingPumpActive) {
      return;
    }
    this.writingPumpActive = true;
    try {
      this.resetWritingMinuteBucketIfNeeded();
      while (
        this.writingJobs.length > 0 &&
        this.writingRequestsStartedThisMinute < MAX_AI_REQUESTS_PER_MINUTE
      ) {
        const jobs = this.buildWritingBatchJobs();
        if (jobs.length === 0) {
          break;
        }
        for (const job of jobs) {
          this.writingJobsInFlight.add(job.sessionId);
        }
        this.writingRequestsStartedThisMinute += 1;
        void this.runWritingQueueBatch(jobs);
      }
      if (this.writingJobs.length > 0) {
        const oldest = this.writingJobs[0];
        const waitForBatch = Math.max(0, WRITING_BATCH_WAIT_MS - (Date.now() - oldest.queuedAt) + 50);
        const waitForMinute =
          this.writingRequestsStartedThisMinute >= MAX_AI_REQUESTS_PER_MINUTE
            ? this.msUntilNextMinute()
            : waitForBatch;
        this.scheduleWritingPump(waitForMinute);
      }
    } finally {
      this.writingPumpActive = false;
    }
  }

  private buildWritingBatchPrompt(sessions: WritingSessionBatchPayload[]): string {
    const sessionBlocks = sessions.map((session, sessionIndex) => {
      const questionBlocks = session.items.map((item, index) => {
        const answer = String(item.studentAnswer ?? '').trim() || '(blank)';
        const targetWords =
          item.type === 'essay'
            ? [item.word1, item.word2].filter(Boolean).join(', ') || '(not specified)'
            : '(not applicable)';
        return [
          `Item ${index + 1}`,
          `answerId: ${item.answerId}`,
          `questionId: ${item.questionId}`,
          `questionType: ${item.type}`,
          `maxPoints: ${item.maxPoints}`,
          `targetWords: ${targetWords}`,
          `Writing time: ${item.writingDurationSeconds ?? 0} seconds`,
          `Word count: ${item.wordCount ?? 0}`,
          `Prompt: ${String(item.promptText ?? '').trim() || '(none)'}`,
          `Student answer: ${answer}`,
        ].join('\n');
      }).join('\n\n');
      return [
        `Session ${sessionIndex + 1}`,
        `sessionId: ${session.sessionId}`,
        questionBlocks,
      ].join('\n');
    }).join('\n\n====\n\n');

    return `You are an English writing evaluator. Grade all submitted writing items for MULTIPLE students in ONE response.

General rules:
- Return valid JSON only. Do not use markdown.
- Evaluate each student independently. Never compare one student with another.
- Within each student, evaluate each item independently.
- Do not include analysis, revision samples, headings, or extra explanation.
- For type "essay", treat it as a Two-Word Sentence Writing quiz item:
  - Role: You are a professional English teacher grading a Two-Word Sentence Writing quiz.
  - Objective: the student must use the two target words to write one coherent sentence.
  - Flexibility: word forms may change and the target words may appear in any order.
  - Automatic zero if the answer is meaningless, misses one or both target words, or contains more than one sentence.
  - Score each essay item with a raw 20-point scale.
  - Full marks 20/20 if the sentence is meaningful and grammatically correct, even if it is simple.
  - Deduct 5 points per unique error type only once each: grammar, spelling, punctuation, capitalization.
  - Minimum raw score is 0.
  - Convert the final raw score to aiScore on a 0-100 scale.
  - Essay aiFeedback must be bilingual and specific:
    - Include a brief error analysis or confirmation.
    - Include one corrected sentence or one improved example sentence.
    - Include both English and Chinese in one short line.
    - Keep it concise, within about 30 English words total.
- For type "paragraph_writing", use the TOEFL Academic Discussion Writing Evaluator rubric below. Return writingScore on a 0-5 scale, CEFR level, a short Traditional Chinese feedback, and aiScore converted to percentage by writingScore / 5 * 100.
- For type "paragraph_writing", keep aiFeedback in Traditional Chinese, exactly 2 short sentences, and within 30 Chinese characters total.
- Blank answers receive 0.

TOEFL Academic Discussion Writing Evaluator (with CEFR)
Role: You are an expert TOEFL writing rater and an ESL specialist. Your goal is to provide a rigorous, professional diagnostic of a student's response using the 0-5 TOEFL scale and the corresponding CEFR level.
Instructions:
Strict Grading: Evaluate the response based on the provided 0-5 rubric. Do not be overly lenient; ensure the score reflects professional academic standards.
CEFR Mapping: Assign a CEFR level (A1-C2) based on the linguistic facility demonstrated in the text.
Comprehensive Feedback: Analyze development, syntax, and accuracy.
Scoring & CEFR Reference:
5 (C1/C2): Fully successful; consistent facility, precise, well-elaborated.
4 (B2): Generally successful; easily understood, variety in structure, few errors.
3 (B1/B2): Partially successful; noticeable errors, some lack of clarity or development.
2 (A2/B1): Mostly unsuccessful; limited range, accumulation of errors, hard to follow.
1 (A1/A2): Unsuccessful; incoherent, serious/frequent errors.

Output JSON shape:
{
  "sessions": [
    {
      "sessionId": <number>,
      "items": [
        {
          "answerId": <number>,
          "questionId": <number>,
          "aiScore": <number 0..100>,
          "aiFeedback": "<concise feedback based on type rules above>",
          "writingScore": <number 0..5 or null>,
          "cefrLevel": "<string or null>"
        }
      ]
    }
  ]
}

Examples of valid aiFeedback:
- "EN: She runs daily. ZH: 句子正確通順。"
- "EN: Use \"He runs fast.\" ZH: 缺少目標字。"
- "文意完整清楚。可再強化論述。"

Submitted writing sessions:

${sessionBlocks}`;
  }

  private extractJsonObject(raw: string): Record<string, unknown> {
    const trimmed = String(raw || '').trim();
    if (!trimmed) {
      throw new Error('Empty AI response');
    }
    try {
      return JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      const start = trimmed.indexOf('{');
      const end = trimmed.lastIndexOf('}');
      if (start < 0 || end <= start) {
        throw new Error(`No JSON object in AI response: ${trimmed.slice(0, 200)}`);
      }
      return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    }
  }

  private normalizeScoreResult(parsed: Record<string, unknown>, model: string): ScoringResult {
    let score = Number(parsed.score);
    if (!Number.isFinite(score)) score = 0;
    const feedback = String(parsed.feedback ?? '').trim();
    return {
      score: Math.min(100, Math.max(0, Math.round(score * 100) / 100)),
      feedback: feedback || 'AI 已完成評分。',
      model,
    };
  }

  async scoreWithOpenAI(prompt: string): Promise<ScoringResult> {
    if (!this.openai) throw new Error('OpenAI API key not configured');

    const model = this.resolveOpenAiModel();
    const response = await this.openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '';
    return this.normalizeScoreResult(this.extractJsonObject(content), model);
  }

  async scoreWithGemini(prompt: string): Promise<ScoringResult> {
    if (!this.gemini) throw new Error('Gemini API key not configured');

    const model = this.resolveGeminiModel();
    const response = await this.gemini.models.generateContent({
      model,
      contents: `${prompt}\n\nReturn valid JSON only. No markdown fences, no explanation outside JSON.`,
    });

    const content = response.text || '';
    return this.normalizeScoreResult(this.extractJsonObject(content), model);
  }

  private stringifyAiErr(err: unknown): string {
    if (err instanceof Error) return err.message;
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }

  private parseWritingBatchResponse(raw: string, expected: WritingSessionBatchPayload[]): ParsedWritingAiSession[] {
    const parsed = this.extractJsonObject(raw);
    const sessionRows = parsed.sessions;
    if (!Array.isArray(sessionRows)) {
      throw new Error('AI writing response missing sessions array');
    }
    const expectedBySessionId = new Map(expected.map((session) => [session.sessionId, session]));
    const sessions: ParsedWritingAiSession[] = [];
    for (const sessionRow of sessionRows as Record<string, unknown>[]) {
      const sessionId = Number(sessionRow.sessionId);
      const expectedSession = expectedBySessionId.get(sessionId);
      if (!expectedSession) {
        throw new Error(`AI writing response session mismatch sessionId=${sessionId}`);
      }
      const rows = sessionRow.items;
      if (!Array.isArray(rows)) {
        throw new Error(`AI writing response missing items array for sessionId=${sessionId}`);
      }
      const expectedByAnswerId = new Map(expectedSession.items.map((item) => [item.answerId, item]));
      const items: ParsedWritingAiItem[] = [];
      for (const row of rows as Record<string, unknown>[]) {
        const answerId = Number(row.answerId);
        const questionId = Number(row.questionId);
        const expectedItem = expectedByAnswerId.get(answerId);
        if (!expectedItem || expectedItem.questionId !== questionId) {
          throw new Error(`AI writing response item mismatch sessionId=${sessionId} answerId=${answerId} questionId=${questionId}`);
        }
        let aiScore = Number(row.aiScore);
        if (!Number.isFinite(aiScore)) aiScore = 0;
        aiScore = Math.min(100, Math.max(0, Math.round(aiScore * 100) / 100));
        const rawFeedback = String(row.aiFeedback ?? '').trim() || 'AI 已完成批改。';
        const aiFeedback =
          expectedItem.type === 'essay'
            ? rawFeedback.slice(0, 160)
            : rawFeedback.slice(0, 30);
        let writingScore: number | null | undefined = null;
        if (row.writingScore !== null && row.writingScore !== undefined && row.writingScore !== '') {
          const rawScore = Number(row.writingScore);
          writingScore = Number.isFinite(rawScore)
            ? Math.min(5, Math.max(0, Math.round(rawScore * 100) / 100))
            : null;
        }
        const cefrLevel = row.cefrLevel !== null && row.cefrLevel !== undefined
          ? String(row.cefrLevel).trim() || null
          : null;
        items.push({ answerId, questionId, aiScore, aiFeedback, writingScore, cefrLevel });
      }
      if (items.length !== expectedSession.items.length) {
        throw new Error(`AI writing response returned ${items.length} items, expected ${expectedSession.items.length} for sessionId=${sessionId}`);
      }
      sessions.push({
        sessionId,
        items,
        overallFeedbackEn: '',
        overallFeedbackZh: '',
      });
    }
    if (sessions.length !== expected.length) {
      throw new Error(`AI writing response returned ${sessions.length} sessions, expected ${expected.length}`);
    }
    return sessions;
  }

  /** 可重試的節流／配額（短暫）；若為免費額度用盡等硬限制，改由 isHardGeminiQuotaExhausted 判斷 */
  private isBatchRetryableQuotaError(err: unknown): boolean {
    const msg = this.stringifyAiErr(err);
    return /429|RESOURCE_EXHAUSTED|quota|rate.?limit|exceeded your current quota|RetryInfo|too many requests/i.test(
      msg,
    );
  }

  /** 例如免費專案該模型請求上限為 0，重試無意義，應直接改走其他供應商 */
  private isHardGeminiQuotaExhausted(err: unknown): boolean {
    const msg = this.stringifyAiErr(err);
    return /limit:\s*0,\s*model:\s*gemini|GenerateRequestsPerDayPerProjectPerModel-FreeTier|free_tier_requests.*limit:\s*0/i.test(
      msg,
    );
  }

  private parseRetryAfterMsFromError(err: unknown): number | null {
    const msg = this.stringifyAiErr(err);
    const m = msg.match(/retry in ([\d.]+)\s*s/i);
    if (!m) return null;
    const sec = parseFloat(m[1]);
    if (!Number.isFinite(sec)) return null;
    return Math.min(120_000, Math.ceil(sec * 1000) + 1000);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isRetryableAiError(err: unknown): boolean {
    const kind = classifyAiScoringError(err);
    return kind === 'rate_limit' || kind === 'provider';
  }

  private async retryTransientAi<T>(
    label: string,
    fn: () => Promise<T>,
    maxAttempts = 4,
  ): Promise<T> {
    let last: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        last = err;
        if (!this.isRetryableAiError(err) || attempt >= maxAttempts - 1) {
          throw err;
        }
        const wait =
          this.parseRetryAfterMsFromError(err) ??
          Math.min(120_000, 8_000 * Math.pow(2, attempt) + Math.floor(Math.random() * 2000));
        this.logger.warn(
          `${label} temporary failure, waiting ${wait}ms (attempt ${attempt + 1}/${maxAttempts}): ${this.stringifyAiErr(err).slice(0, 300)}`,
        );
        await this.delay(wait);
      }
    }
    throw last;
  }

  /** 集體批閱 JSON：OpenAI 使用 json_object；遇 429 時短暫重試 */
  private async callBatchGradingOpenAI(model: string, prompt: string): Promise<string> {
    if (!this.openai) {
      throw new BadRequestException('OpenAI API key not configured');
    }
    const maxAttempts = 3;
    let last: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await this.openai.chat.completions.create({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 8192,
          response_format: { type: 'json_object' },
        });
        return response.choices[0]?.message?.content || '';
      } catch (err) {
        last = err;
        const retryable = this.isRetryableAiError(err);
        if (attempt < maxAttempts - 1 && retryable) {
          const wait = this.parseRetryAfterMsFromError(err) ?? 4000 * (attempt + 1);
          this.logger.warn(
            `OpenAI batch grading rate limited, waiting ${wait}ms (attempt ${attempt + 1}/${maxAttempts})`,
          );
          await this.delay(wait);
          continue;
        }
        throw err;
      }
    }
    throw last;
  }

  private async callBatchGradingGemini(prompt: string): Promise<string> {
    if (!this.gemini) {
      throw new BadRequestException('Gemini API key not configured (batch grading uses OpenAI when AI_MODEL is gpt*)');
    }
    const geminiModel = this.resolveGeminiModel();
    const augmented = `${prompt}\n\nOutput: valid JSON only, same keys as specified. No markdown.`;
    /** 遇 RPM／429 時減少連發：最多再試 2 次，間隔採指數退避 */
    const maxSoftRetries = 2;
    let last: unknown;
    for (let attempt = 0; attempt <= maxSoftRetries; attempt++) {
      try {
        const response = await this.gemini.models.generateContent({
          model: geminiModel,
          contents: augmented,
        });
        return response.text || '';
      } catch (err) {
        last = err;
        if (this.isHardGeminiQuotaExhausted(err)) {
          throw err;
        }
        if (!this.isBatchRetryableQuotaError(err) && !this.isRetryableAiError(err)) {
          throw err;
        }
        if (attempt >= maxSoftRetries) {
          throw err;
        }
        const wait =
          this.parseRetryAfterMsFromError(err) ??
          Math.min(120_000, 12_000 * Math.pow(2, attempt) + Math.floor(Math.random() * 2000));
        this.logger.warn(
          `Gemini batch grading rate limited, waiting ${wait}ms (calls used so far: ${attempt + 1}/${maxSoftRetries + 1})`,
        );
        await this.delay(wait);
      }
    }
    throw last;
  }

  /**
   * 集體批閱：回傳原始 JSON 字串與實際呼叫的模型名（供寫入 answer.aiModel）。
   * 若 AI_MODEL 明確設定則依其供應商；未設定時優先使用 OpenAI，否則退回 Gemini。
   */
  private async callBatchGradingModel(
    prompt: string,
  ): Promise<{ raw: string; modelUsed: string }> {
    if (this.resolvePrimaryAiProvider() === 'openai') {
      const model = this.resolveOpenAiModel();
      const raw = await this.callBatchGradingOpenAI(model, prompt);
      return { raw, modelUsed: model };
    }
    try {
      const raw = await this.callBatchGradingGemini(prompt);
      return { raw, modelUsed: this.resolveGeminiModel() };
    } catch (err) {
      if (this.openai) {
        this.logger.warn(
          `Gemini batch grading failed, using OpenAI fallback (${DEFAULT_OPENAI_MODEL}): ${this.stringifyAiErr(err).slice(0, 500)}`,
        );
        const raw = await this.callBatchGradingOpenAI(DEFAULT_OPENAI_MODEL, prompt);
        return { raw, modelUsed: DEFAULT_OPENAI_MODEL };
      }
      throw err;
    }
  }

  async scoreAI(prompt: string): Promise<ScoringResult> {
    const provider = this.resolvePrimaryAiProvider();

    try {
      if (provider === 'openai') {
        return await this.retryTransientAi('OpenAI scoring', () => this.scoreWithOpenAI(prompt));
      }
      return await this.retryTransientAi('Gemini scoring', () => this.scoreWithGemini(prompt));
    } catch (error) {
      this.logger.warn(`Primary AI scoring failed, trying fallback: ${error}`);
      try {
        if (provider === 'openai' && this.gemini) {
          return await this.retryTransientAi('Gemini fallback scoring', () => this.scoreWithGemini(prompt), 3);
        } else if (provider === 'gemini' && this.openai) {
          return await this.retryTransientAi('OpenAI fallback scoring', () => this.scoreWithOpenAI(prompt), 3);
        }
      } catch (fallbackError) {
        this.logger.warn(`Fallback scoring also failed: ${fallbackError}`);
      }
      throw error;
    }
  }

  /**
   * AI 評分失敗時：交卷流程已在 ExamsService 完成，此處不得拋錯中斷批次。
   * 以 0 分＋pending_review 標記，供教師後台複閱。
   */
  private async markEssayPendingReview(answerId: number, err: unknown): Promise<void> {
    const kind = classifyAiScoringError(err);
    const detail = err instanceof Error ? err.message : String(err);
    const logPayload = {
      answerId,
      kind,
      detailPreview: detail.slice(0, 500),
    };
    if (kind === 'rate_limit') {
      this.logger.warn(`AI scoring rate-limited / quota; marking pending_review ${JSON.stringify(logPayload)}`);
    } else {
      this.logger.warn(`AI scoring failed; marking pending_review ${JSON.stringify(logPayload)}`);
    }

    await this.prisma.answer.update({
      where: { id: answerId },
      data: {
        aiScore: 0,
        aiFeedback:
          kind === 'rate_limit'
            ? 'AI 評分服務目前配額不足，已暫以 0 分記錄並標記為待人工複閱。'
            : `AI 評分暫時無法完成，已暫以 0 分記錄並標記為待人工複閱。原因：${detail.slice(0, 160)}`,
        aiModel: 'pending_review',
      },
    });
  }

  /**
   * 交卷後僅計算選擇題／多選（不呼叫 AI）；問答題留待教師集體批閱。
   */
  async scoreObjectiveOnly(sessionId: number) {
    const answers = await this.prisma.answer.findMany({
      where: { sessionId, aiScore: null },
      include: { question: true },
    });

    const results: Array<
      | { answerId: number; score: number; feedback: string }
      | { answerId: number; skipped: true }
      | { answerId: number; pendingReview: true; kind: string }
    > = [];

    for (const answer of answers) {
      const q = answer.question;
      if (WRITING_QUESTION_TYPES.includes(q.type as WritingQuestionType)) {
        continue;
      }

      const content = answer.content?.trim();
      if (!content) {
        await this.prisma.answer.update({
          where: { id: answer.id },
          data: {
            aiScore: 0,
            aiFeedback: '未作答',
            aiModel: 'system',
          },
        });
        results.push({ answerId: answer.id, skipped: true });
        continue;
      }

      if (q.type === 'multiple_choice') {
        const score = content === q.answer ? 100 : 0;
        const feedback = score === 100 ? '正確' : `錯誤 (正確答案: ${q.answer})`;
        await this.prisma.answer.update({
          where: { id: answer.id },
          data: { aiScore: score, aiFeedback: feedback, aiModel: 'system' },
        });
        results.push({ answerId: answer.id, score, feedback });
        continue;
      }

      if (q.type === 'multiple_selection') {
        const studentAns = content.split(',').sort().join(',');
        const correctAns = q.answer?.split(',').sort().join(',');
        const score = studentAns === correctAns ? 100 : 0;
        const feedback = score === 100 ? '正確' : `錯誤 (正確答案: ${q.answer})`;
        await this.prisma.answer.update({
          where: { id: answer.id },
          data: { aiScore: score, aiFeedback: feedback, aiModel: 'system' },
        });
        results.push({ answerId: answer.id, score, feedback });
        continue;
      }

      await this.prisma.answer.update({
        where: { id: answer.id },
        data: {
          aiScore: 0,
          aiFeedback: `未知題型 (${q.type})，請人工複閱`,
          aiModel: 'pending_review',
        },
      });
      results.push({ answerId: answer.id, pendingReview: true, kind: 'unknown_type' });
    }

    await this.finalizeSessionStatusAfterScoring(sessionId);
    return results;
  }

  /** 非選擇題是否仍待有效 AI 批閱（無紀錄、批改中、未計分、或 pending_review 暫記分） */
  private static essayAnswerNeedsAiGrading(
    answer: { aiScore: unknown; aiModel: string | null } | undefined,
  ): boolean {
    if (!answer) return true;
    if (answer.aiModel === 'ai_queued') return true;
    if (answer.aiModel === 'ai_grading') return true;
    if (answer.aiModel === 'pending_review') return true;
    if (answer.aiScore === null || answer.aiScore === undefined) return true;
    return false;
  }

  /** 若考卷無非選擇題，或非選擇題均已計分，則標記為 graded。 */
  private async finalizeSessionStatusAfterScoring(sessionId: number): Promise<void> {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        exam: {
          include: {
            questions: { select: { id: true, type: true } },
          },
        },
      },
    });
    if (!session) return;

    const essayQuestionIds = session.exam.questions
      .filter((q) => WRITING_QUESTION_TYPES.includes(q.type as WritingQuestionType))
      .map((q) => q.id);
    if (essayQuestionIds.length === 0) {
      await this.prisma.examSession.update({
        where: { id: sessionId },
        data: { status: 'graded' },
      });
      return;
    }

    const rows = await this.prisma.answer.findMany({
      where: { sessionId, questionId: { in: essayQuestionIds } },
      select: { questionId: true, aiScore: true, aiModel: true },
    });
    let pending = 0;
    for (const qid of essayQuestionIds) {
      const row = rows.find((r) => r.questionId === qid);
      if (ScoringService.essayAnswerNeedsAiGrading(row)) pending++;
    }
    if (pending === 0) {
      await this.prisma.examSession.update({
        where: { id: sessionId },
        data: { status: 'graded' },
      });
    }
  }

  /** 與 scoreObjectiveOnly 相同（保留 API 路徑給教師補計客觀題）。 */
  async scoreSession(sessionId: number, actor: TeacherActor) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      select: { id: true, examId: true, student: { select: { id: true } } },
    });
    if (!session) {
      throw new NotFoundException('考試工作階段不存在');
    }
    await ensureExamAccess(this.prisma, actor, session.examId);
    await ensureStudentAccess(this.prisma, actor, session.student.id);
    return this.scoreSubmittedSession(sessionId, true);
  }

  async scoreSubmittedSession(sessionId: number, forceWritingRegrade = false) {
    const objective = await this.scoreObjectiveOnly(sessionId);
    const writing = await this.queueWritingAiGradingForSession(sessionId, forceWritingRegrade);
    return { objective, writing };
  }

  private async queueWritingAiGradingForSession(sessionId: number, force = false) {
    const prep = await this.prepareWritingAnswersForAiGrading(sessionId, force);
    if (prep.answerIds.length === 0) {
      await this.finalizeSessionStatusAfterScoring(sessionId);
      return { queued: 0 };
    }
    this.upsertWritingQueueJob(sessionId, prep.answerIds, prep.estimatedChars);
    void this.pumpWritingQueue();
    return { queued: prep.answerIds.length };
  }

  private async prepareWritingAnswersForAiGrading(
    sessionId: number,
    force: boolean,
  ): Promise<{ answerIds: number[]; estimatedChars: number }> {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        exam: {
          include: {
            questions: {
              where: { type: { in: WRITING_QUESTION_TYPES } },
              orderBy: { orderNum: 'asc' },
            },
          },
        },
        answers: true,
      },
    });
    if (!session) return { answerIds: [], estimatedChars: 0 };

    const pendingAnswerIds: number[] = [];
    const estimateInputs: Array<{ promptText?: string | null; content?: string | null }> = [];
    const inFlight = this.writingJobsInFlight.has(sessionId);
    const queuedFeedback = `已進入 AI 批改佇列，系統會依每分鐘 ${MAX_AI_REQUESTS_PER_MINUTE} 筆上限分批送出。`;
    const targetAiModel = inFlight ? 'ai_grading' : 'ai_queued';
    const targetFeedback = inFlight ? 'AI 批改中，請稍後重新整理。' : queuedFeedback;
    for (const question of session.exam.questions) {
      const existing = session.answers.find((a) => a.questionId === question.id);
      const needs = force || ScoringService.essayAnswerNeedsAiGrading(existing);
      if (!needs) continue;
      const row = await this.prisma.answer.upsert({
        where: { sessionId_questionId: { sessionId, questionId: question.id } },
        update: {
          aiScore: null,
          aiFeedback: targetFeedback,
          aiModel: targetAiModel,
          writingScore: null,
          cefrLevel: null,
        },
        create: {
          sessionId,
          questionId: question.id,
          content: '',
          aiScore: null,
          aiFeedback: targetFeedback,
          aiModel: targetAiModel,
          writingDurationSeconds: 0,
          wordCount: 0,
        },
      });
      pendingAnswerIds.push(row.id);
      estimateInputs.push({
        promptText: question.content,
        content: existing?.content ?? row.content,
      });
    }
    return {
      answerIds: pendingAnswerIds,
      estimatedChars: this.estimateWritingJobChars(estimateInputs),
    };
  }

  private async loadWritingSessionBatchPayload(
    sessionId: number,
    answerIds: number[],
  ): Promise<WritingSessionBatchPayload | null> {
    const answers = await this.prisma.answer.findMany({
      where: { id: { in: answerIds } },
      include: { question: true },
      orderBy: { question: { orderNum: 'asc' } },
    });

    const writingItems: WritingAnswerForAi[] = [];
    for (const answer of answers) {
      const type = answer.question.type;
      if (!WRITING_QUESTION_TYPES.includes(type as WritingQuestionType)) continue;
      const content = String(answer.content ?? '').trim();
      if (!content) {
        await this.prisma.answer.update({
          where: { id: answer.id },
          data: {
            aiScore: 0,
            aiFeedback: '未作答',
            aiModel: 'system',
            writingScore: type === 'paragraph_writing' ? 0 : null,
            cefrLevel: null,
          },
        });
        continue;
      }
      writingItems.push({
        answerId: answer.id,
        questionId: answer.questionId,
        orderNum: answer.question.orderNum,
        type,
        maxPoints: Math.max(1, answer.question.maxPoints),
        promptText: answer.question.content,
        word1: answer.question.word1 ?? null,
        word2: answer.question.word2 ?? null,
        studentAnswer: answer.content,
        writingDurationSeconds: answer.writingDurationSeconds,
        wordCount: answer.wordCount,
      });
    }

    if (writingItems.length === 0) {
      await this.finalizeSessionStatusAfterScoring(sessionId);
      return null;
    }
    return { sessionId, items: writingItems };
  }

  private async gradeWritingAnswersBatch(jobs: WritingQueueJob[]): Promise<void> {
    const sessions = (await Promise.all(
      jobs.map((job) => this.loadWritingSessionBatchPayload(job.sessionId, job.answerIds)),
    )).filter((session): session is WritingSessionBatchPayload => Boolean(session));
    if (sessions.length === 0) {
      return;
    }
    const prompt = this.buildWritingBatchPrompt(sessions);
    const { raw, modelUsed } = await this.callBatchGradingModel(prompt);
    const parsed = this.parseWritingBatchResponse(raw, sessions);
    await this.prisma.$transaction(async (tx) => {
      for (const session of parsed) {
        for (const item of session.items) {
          await tx.answer.update({
            where: { id: item.answerId },
            data: {
              aiScore: item.aiScore,
              aiFeedback: item.aiFeedback,
              aiModel: modelUsed,
              writingScore: item.writingScore ?? null,
              cefrLevel: item.cefrLevel ?? null,
            },
          });
        }
        await tx.examSession.update({
          where: { id: session.sessionId },
          data: {
            overallFeedbackEn: session.overallFeedbackEn || null,
            overallFeedbackZh: session.overallFeedbackZh || null,
          },
        });
      }
    });
    for (const session of sessions) {
      await this.finalizeSessionStatusAfterScoring(session.sessionId);
    }
  }

  private async handleWritingAiFailure(answerIds: number[], err: unknown): Promise<void> {
    for (const answerId of answerIds) {
      await this.markEssayPendingReview(answerId, err);
    }
  }

  /**
   * 教師端：對指定考卷與班級，將已交卷且問答題尚未 AI 計分之 session 逐人送一次集體批閱。
   */
  async batchGradeEssaysForExamAndClass(examId: number, classId: number, actor: TeacherActor) {
    await ensureExamAccess(this.prisma, actor, examId);
    await ensureClassAccess(this.prisma, actor, classId);
    const link = await this.prisma.examClass.findUnique({
      where: { examId_classId: { examId, classId } },
    });
    if (!link) {
      throw new BadRequestException('此考卷與該班級無關聯');
    }

    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, deletedAt: null },
      include: {
        questions: { orderBy: { orderNum: 'asc' } },
      },
    });
    if (!exam) {
      throw new NotFoundException('考卷不存在');
    }

    const writingQuestions = exam.questions.filter((q) =>
      WRITING_QUESTION_TYPES.includes(q.type as WritingQuestionType),
    );
    const summary = {
      examId,
      classId,
      processed: 0,
      skipped: 0,
      failed: [] as { sessionId: number; reason: string }[],
    };

    if (writingQuestions.length === 0) {
      return { ...summary, message: '此考卷無非選擇題，無需 AI 批改' };
    }

    const writingIds = writingQuestions.map((q) => q.id);
    const sessions = await this.prisma.examSession.findMany({
      where: {
        examId,
        student: { classes: { some: { classId } } },
        OR: [
          { status: 'submitted' },
          {
            status: 'graded',
            answers: {
              some: {
                questionId: { in: writingIds },
                OR: [{ aiScore: null }, { aiModel: { in: ['ai_queued', 'ai_grading', 'pending_review'] } }],
              },
            },
          },
        ],
      },
      include: {
        answers: true,
      },
    });

    for (const session of sessions) {
      const needs = writingQuestions.some((q) => {
        const a = session.answers.find((x) => x.questionId === q.id);
        return ScoringService.essayAnswerNeedsAiGrading(a);
      });
      if (!needs) {
        summary.skipped++;
        continue;
      }

      try {
        await this.scoreSubmittedSession(session.id, true);
        summary.processed++;
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        this.logger.warn(`queue writing grading failed session=${session.id} ${reason}`);
        summary.failed.push({ sessionId: session.id, reason });
      }
    }

    return {
      ...summary,
      message: '已將非選擇題送入 AI 批改佇列，請稍後重新整理查看結果。',
    };
  }

  private async markSessionEssaysBatchParseFailed(
    sessionId: number,
    essayQuestionIds: number[],
    detail: string,
  ): Promise<void> {
    for (const questionId of essayQuestionIds) {
      const existing = await this.prisma.answer.findUnique({
        where: { sessionId_questionId: { sessionId, questionId } },
      });
      if (existing?.aiScore !== null && existing?.aiScore !== undefined) {
        continue;
      }
      await this.prisma.answer.upsert({
        where: { sessionId_questionId: { sessionId, questionId } },
        update: {
          aiScore: 0,
          aiFeedback: `集體批閱解析失敗，請人工複閱。${detail.slice(0, 400)}`,
          aiModel: 'pending_review',
        },
        create: {
          sessionId,
          questionId,
          content: '',
          aiScore: 0,
          aiFeedback: `集體批閱解析失敗，請人工複閱。${detail.slice(0, 400)}`,
          aiModel: 'pending_review',
        },
      });
    }
  }

  /**
   * 教師人工覆寫該題 AI 分數（含待複閱題），aiModel 改為 teacher_manual 以清除 pending_review。
   */
  async manualGradeAnswer(
    answerId: number,
    aiScore: number,
    aiFeedback: string | undefined,
    actor: TeacherActor,
  ) {
    const raw = Number(aiScore);
    if (!Number.isFinite(raw)) {
      throw new BadRequestException('aiScore 需為 0–100 之數字');
    }
    const score = Math.min(100, Math.max(0, Math.round(raw * 100) / 100));

    const existing = await this.prisma.answer.findUnique({
      where: { id: answerId },
      select: {
        id: true,
        session: {
          select: {
            examId: true,
            student: { select: { id: true } },
          },
        },
      },
    });
    if (!existing) {
      throw new NotFoundException('找不到答案');
    }
    await ensureExamAccess(this.prisma, actor, existing.session.examId);
    await ensureStudentAccess(this.prisma, actor, existing.session.student.id);

    const data: { aiScore: number; aiModel: string; aiFeedback?: string } = {
      aiScore: score,
      aiModel: 'teacher_manual',
    };
    if (aiFeedback !== undefined) {
      const t = String(aiFeedback).trim();
      data.aiFeedback = t.length > 0 ? t : '教師人工評分';
    }

    return this.prisma.answer.update({
      where: { id: answerId },
      data,
      include: { question: true },
    });
  }
}
