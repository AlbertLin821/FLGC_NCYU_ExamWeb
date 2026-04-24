"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ScoringService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoringService = void 0;
exports.classifyAiScoringError = classifyAiScoringError;
const common_1 = require("@nestjs/common");
const batch_essay_grading_util_1 = require("./batch-essay-grading.util");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const openai_1 = __importDefault(require("openai"));
const genai_1 = require("@google/genai");
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
function classifyAiScoringError(err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/429|RESOURCE_EXHAUSTED|quota|rate|limit: 0|too many requests/i.test(msg)) {
        return 'rate_limit';
    }
    if (/500|502|503|504|INTERNAL|UNAVAILABLE/i.test(msg)) {
        return 'provider';
    }
    return 'other';
}
let ScoringService = ScoringService_1 = class ScoringService {
    prisma;
    config;
    logger = new common_1.Logger(ScoringService_1.name);
    openai = null;
    gemini = null;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        const openaiKey = this.config.get('OPENAI_API_KEY');
        const geminiKey = this.config.get('GEMINI_API_KEY');
        if (openaiKey) {
            this.openai = new openai_1.default({ apiKey: openaiKey });
        }
        if (geminiKey) {
            this.gemini = new genai_1.GoogleGenAI({ apiKey: geminiKey });
        }
    }
    resolveGeminiModel() {
        return this.config.get('GEMINI_MODEL', DEFAULT_GEMINI_MODEL);
    }
    buildEssayPrompt(prompt, answer) {
        return `You are an English language teacher grading a student's short answer or essay.

Question Prompt: "${prompt}"
Student's Answer: "${answer}"

Please evaluate the answer for correctness, grammar, and relevance to the prompt.

Respond in this exact JSON format only:
{"score": <0-100>, "feedback": "<brief explanation in Traditional Chinese, max 50 characters>"}`;
    }
    async scoreWithOpenAI(prompt) {
        if (!this.openai)
            throw new Error('OpenAI API key not configured');
        const model = this.config.get('AI_MODEL', 'gpt-4o-mini');
        const response = await this.openai.chat.completions.create({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 200,
        });
        const content = response.choices[0]?.message?.content || '';
        const parsed = JSON.parse(content);
        return {
            score: Math.min(100, Math.max(0, parsed.score)),
            feedback: parsed.feedback,
            model,
        };
    }
    async scoreWithGemini(prompt) {
        if (!this.gemini)
            throw new Error('Gemini API key not configured');
        const model = this.resolveGeminiModel();
        const response = await this.gemini.models.generateContent({
            model,
            contents: prompt,
        });
        const content = response.text || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch)
            throw new Error('Failed to parse Gemini response');
        const parsed = JSON.parse(jsonMatch[0]);
        return {
            score: Math.min(100, Math.max(0, parsed.score)),
            feedback: parsed.feedback,
            model,
        };
    }
    stringifyAiErr(err) {
        if (err instanceof Error)
            return err.message;
        try {
            return JSON.stringify(err);
        }
        catch {
            return String(err);
        }
    }
    isBatchRetryableQuotaError(err) {
        const msg = this.stringifyAiErr(err);
        return /429|RESOURCE_EXHAUSTED|quota|rate.?limit|exceeded your current quota|RetryInfo|too many requests/i.test(msg);
    }
    isHardGeminiQuotaExhausted(err) {
        const msg = this.stringifyAiErr(err);
        return /limit:\s*0,\s*model:\s*gemini|GenerateRequestsPerDayPerProjectPerModel-FreeTier|free_tier_requests.*limit:\s*0/i.test(msg);
    }
    parseRetryAfterMsFromError(err) {
        const msg = this.stringifyAiErr(err);
        const m = msg.match(/retry in ([\d.]+)\s*s/i);
        if (!m)
            return null;
        const sec = parseFloat(m[1]);
        if (!Number.isFinite(sec))
            return null;
        return Math.min(120_000, Math.ceil(sec * 1000) + 1000);
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async callBatchGradingOpenAI(model, prompt) {
        if (!this.openai) {
            throw new common_1.BadRequestException('OpenAI API key not configured');
        }
        const maxAttempts = 3;
        let last;
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
            }
            catch (err) {
                last = err;
                const retryable = classifyAiScoringError(err) === 'rate_limit';
                if (attempt < maxAttempts - 1 && retryable) {
                    const wait = this.parseRetryAfterMsFromError(err) ?? 4000 * (attempt + 1);
                    this.logger.warn(`OpenAI batch grading rate limited, waiting ${wait}ms (attempt ${attempt + 1}/${maxAttempts})`);
                    await this.delay(wait);
                    continue;
                }
                throw err;
            }
        }
        throw last;
    }
    async callBatchGradingGemini(prompt) {
        if (!this.gemini) {
            throw new common_1.BadRequestException('Gemini API key not configured (batch grading uses OpenAI when AI_MODEL is gpt*)');
        }
        const geminiModel = this.resolveGeminiModel();
        const augmented = `${prompt}\n\nOutput: valid JSON only, same keys as specified. No markdown.`;
        const maxSoftRetries = 2;
        let last;
        for (let attempt = 0; attempt <= maxSoftRetries; attempt++) {
            try {
                const response = await this.gemini.models.generateContent({
                    model: geminiModel,
                    contents: augmented,
                });
                return response.text || '';
            }
            catch (err) {
                last = err;
                if (this.isHardGeminiQuotaExhausted(err)) {
                    throw err;
                }
                if (!this.isBatchRetryableQuotaError(err)) {
                    throw err;
                }
                if (attempt >= maxSoftRetries) {
                    throw err;
                }
                const wait = this.parseRetryAfterMsFromError(err) ??
                    Math.min(120_000, 12_000 * Math.pow(2, attempt) + Math.floor(Math.random() * 2000));
                this.logger.warn(`Gemini batch grading rate limited, waiting ${wait}ms (calls used so far: ${attempt + 1}/${maxSoftRetries + 1})`);
                await this.delay(wait);
            }
        }
        throw last;
    }
    async callBatchGradingModel(prompt) {
        const aiModel = this.config.get('AI_MODEL', 'gpt-4o-mini');
        if (aiModel.startsWith('gpt') || aiModel.startsWith('o')) {
            const raw = await this.callBatchGradingOpenAI(aiModel, prompt);
            return { raw, modelUsed: aiModel };
        }
        try {
            const raw = await this.callBatchGradingGemini(prompt);
            return { raw, modelUsed: this.resolveGeminiModel() };
        }
        catch (err) {
            if (this.openai) {
                this.logger.warn(`Gemini batch grading failed, using OpenAI fallback (gpt-4o-mini): ${this.stringifyAiErr(err).slice(0, 500)}`);
                const raw = await this.callBatchGradingOpenAI('gpt-4o-mini', prompt);
                return { raw, modelUsed: 'gpt-4o-mini' };
            }
            throw err;
        }
    }
    async scoreAI(prompt) {
        const aiModel = this.config.get('AI_MODEL', 'gpt-4o-mini');
        try {
            if (aiModel.startsWith('gpt') || aiModel.startsWith('o')) {
                return await this.scoreWithOpenAI(prompt);
            }
            else {
                return await this.scoreWithGemini(prompt);
            }
        }
        catch (error) {
            this.logger.warn(`Primary AI scoring failed, trying fallback: ${error}`);
            try {
                if (aiModel.startsWith('gpt') && this.gemini) {
                    return await this.scoreWithGemini(prompt);
                }
                else if (!aiModel.startsWith('gpt') && this.openai) {
                    return await this.scoreWithOpenAI(prompt);
                }
            }
            catch (fallbackError) {
                this.logger.warn(`Fallback scoring also failed: ${fallbackError}`);
            }
            throw error;
        }
    }
    async markEssayPendingReview(answerId, err) {
        const kind = classifyAiScoringError(err);
        const detail = err instanceof Error ? err.message : String(err);
        const logPayload = {
            answerId,
            kind,
            detailPreview: detail.slice(0, 500),
        };
        if (kind === 'rate_limit') {
            this.logger.warn(`AI scoring rate-limited / quota; marking pending_review ${JSON.stringify(logPayload)}`);
        }
        else {
            this.logger.warn(`AI scoring failed; marking pending_review ${JSON.stringify(logPayload)}`);
        }
        await this.prisma.answer.update({
            where: { id: answerId },
            data: {
                aiScore: 0,
                aiFeedback: kind === 'rate_limit'
                    ? 'AI 評分服務目前配額不足，已暫以 0 分記錄並標記為待人工複閱。'
                    : 'AI 評分暫時無法完成，已暫以 0 分記錄並標記為待人工複閱。',
                aiModel: 'pending_review',
            },
        });
    }
    async scoreObjectiveOnly(sessionId) {
        const answers = await this.prisma.answer.findMany({
            where: { sessionId, aiScore: null },
            include: { question: true },
        });
        const results = [];
        for (const answer of answers) {
            const q = answer.question;
            if (q.type === 'essay') {
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
    static essayAnswerNeedsAiGrading(answer) {
        if (!answer)
            return true;
        if (answer.aiModel === 'pending_review')
            return true;
        if (answer.aiScore === null || answer.aiScore === undefined)
            return true;
        return false;
    }
    async finalizeSessionStatusAfterScoring(sessionId) {
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
        if (!session)
            return;
        const essayQuestionIds = session.exam.questions.filter((q) => q.type === 'essay').map((q) => q.id);
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
            if (ScoringService_1.essayAnswerNeedsAiGrading(row))
                pending++;
        }
        if (pending === 0) {
            await this.prisma.examSession.update({
                where: { id: sessionId },
                data: { status: 'graded' },
            });
        }
    }
    async scoreSession(sessionId) {
        return this.scoreObjectiveOnly(sessionId);
    }
    async batchGradeEssaysForExamAndClass(examId, classId) {
        const link = await this.prisma.examClass.findUnique({
            where: { examId_classId: { examId, classId } },
        });
        if (!link) {
            throw new common_1.BadRequestException('此考卷與該班級無關聯');
        }
        const exam = await this.prisma.exam.findFirst({
            where: { id: examId, deletedAt: null },
            include: {
                questions: { orderBy: { orderNum: 'asc' } },
            },
        });
        if (!exam) {
            throw new common_1.NotFoundException('考卷不存在');
        }
        const essayQuestions = exam.questions.filter((q) => q.type === 'essay');
        const summary = {
            examId,
            classId,
            processed: 0,
            skipped: 0,
            failed: [],
        };
        if (essayQuestions.length === 0) {
            return { ...summary, message: '此考卷無問答題，無需集體批閱' };
        }
        const essayIds = essayQuestions.map((q) => q.id);
        const sessions = await this.prisma.examSession.findMany({
            where: {
                examId,
                student: { classId },
                OR: [
                    { status: 'submitted' },
                    {
                        status: 'graded',
                        answers: {
                            some: {
                                questionId: { in: essayIds },
                                OR: [{ aiScore: null }, { aiModel: 'pending_review' }],
                            },
                        },
                    },
                ],
            },
            include: {
                student: { select: { id: true, studentId: true, name: true } },
                answers: true,
            },
        });
        for (const session of sessions) {
            const needs = essayQuestions.some((q) => {
                const a = session.answers.find((x) => x.questionId === q.id);
                return ScoringService_1.essayAnswerNeedsAiGrading(a);
            });
            if (!needs) {
                summary.skipped++;
                continue;
            }
            const items = essayQuestions.map((q) => {
                const a = session.answers.find((x) => x.questionId === q.id);
                return {
                    questionId: q.id,
                    orderNum: q.orderNum,
                    maxPoints: Math.max(1, q.maxPoints),
                    promptText: q.content,
                    word1: q.word1,
                    word2: q.word2,
                    studentAnswer: a?.content ?? null,
                };
            });
            const studentLabel = `${session.student.name} (${session.student.studentId})`;
            const prompt = (0, batch_essay_grading_util_1.buildBatchEssayGradingPrompt)(studentLabel, items);
            try {
                const { raw, modelUsed } = await this.callBatchGradingModel(prompt);
                const parsed = (0, batch_essay_grading_util_1.parseBatchEssayGradingResponse)(raw, items);
                for (const row of parsed.questions) {
                    const maxPts = items.find((i) => i.questionId === row.questionId)?.maxPoints ?? 1;
                    const aiPct = (0, batch_essay_grading_util_1.pointsToAiScorePercent)(row.pointsEarned, maxPts);
                    const fbParts = [row.errorAnalysis, row.feedback].filter(Boolean);
                    const aiFeedback = fbParts.join('\n').trim() || '（無回饋文字）';
                    await this.prisma.answer.upsert({
                        where: {
                            sessionId_questionId: { sessionId: session.id, questionId: row.questionId },
                        },
                        update: {
                            aiScore: aiPct,
                            aiFeedback,
                            aiModel: modelUsed,
                        },
                        create: {
                            sessionId: session.id,
                            questionId: row.questionId,
                            content: session.answers.find((x) => x.questionId === row.questionId)?.content ?? '',
                            aiScore: aiPct,
                            aiFeedback,
                            aiModel: modelUsed,
                        },
                    });
                }
                await this.prisma.examSession.update({
                    where: { id: session.id },
                    data: {
                        status: 'graded',
                        overallFeedbackEn: parsed.overallFeedbackEn,
                        overallFeedbackZh: parsed.overallFeedbackZh,
                    },
                });
                summary.processed++;
            }
            catch (err) {
                const reason = err instanceof Error ? err.message : String(err);
                this.logger.warn(`batch essay grading failed session=${session.id} ${reason}`);
                summary.failed.push({ sessionId: session.id, reason });
                await this.markSessionEssaysBatchParseFailed(session.id, essayQuestions.map((q) => q.id), reason);
            }
        }
        return summary;
    }
    async markSessionEssaysBatchParseFailed(sessionId, essayQuestionIds, detail) {
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
    async manualGradeAnswer(answerId, aiScore, aiFeedback) {
        const raw = Number(aiScore);
        if (!Number.isFinite(raw)) {
            throw new common_1.BadRequestException('aiScore 需為 0–100 之數字');
        }
        const score = Math.min(100, Math.max(0, Math.round(raw * 100) / 100));
        const existing = await this.prisma.answer.findUnique({ where: { id: answerId } });
        if (!existing) {
            throw new common_1.NotFoundException('找不到答案');
        }
        const data = {
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
};
exports.ScoringService = ScoringService;
exports.ScoringService = ScoringService = ScoringService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], ScoringService);
//# sourceMappingURL=scoring.service.js.map