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
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const openai_1 = __importDefault(require("openai"));
const genai_1 = require("@google/genai");
function classifyAiScoringError(err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/429|RESOURCE_EXHAUSTED|quota|rate|limit: 0/i.test(msg)) {
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
        const model = 'gemini-2.0-flash';
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
    async scoreSession(sessionId) {
        const answers = await this.prisma.answer.findMany({
            where: { sessionId, aiScore: null },
            include: { question: true },
        });
        const results = [];
        for (const answer of answers) {
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
            const q = answer.question;
            if (q.type === 'essay') {
                try {
                    const res = await this.scoreAI(this.buildEssayPrompt(q.content || '', content));
                    await this.prisma.answer.update({
                        where: { id: answer.id },
                        data: {
                            aiScore: res.score,
                            aiFeedback: res.feedback,
                            aiModel: res.model,
                        },
                    });
                    results.push({ answerId: answer.id, score: res.score, feedback: res.feedback });
                }
                catch (err) {
                    await this.markEssayPendingReview(answer.id, err);
                    results.push({
                        answerId: answer.id,
                        pendingReview: true,
                        kind: classifyAiScoringError(err),
                    });
                }
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
        await this.prisma.examSession.update({
            where: { id: sessionId },
            data: { status: 'graded' },
        });
        return results;
    }
};
exports.ScoringService = ScoringService;
exports.ScoringService = ScoringService = ScoringService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], ScoringService);
//# sourceMappingURL=scoring.service.js.map