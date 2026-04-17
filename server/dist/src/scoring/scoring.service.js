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
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const openai_1 = __importDefault(require("openai"));
const genai_1 = require("@google/genai");
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
            this.logger.error(`AI scoring failed: ${error}`);
            try {
                if (aiModel.startsWith('gpt') && this.gemini) {
                    return await this.scoreWithGemini(prompt);
                }
                else if (this.openai) {
                    return await this.scoreWithOpenAI(prompt);
                }
            }
            catch (fallbackError) {
                this.logger.error(`Fallback scoring also failed: ${fallbackError}`);
            }
            throw error;
        }
    }
    async scoreSession(sessionId) {
        const answers = await this.prisma.answer.findMany({
            where: { sessionId, aiScore: null },
            include: { question: true },
        });
        const results = await Promise.all(answers.map(async (answer) => {
            if (!answer.content)
                return { answerId: answer.id, skipped: true };
            const q = answer.question;
            let score = 0;
            let feedback = '';
            let model = 'system';
            try {
                if (q.type === 'essay') {
                    const res = await this.scoreAI(this.buildEssayPrompt(q.content || '', answer.content));
                    score = res.score;
                    feedback = res.feedback;
                    model = res.model;
                }
                else if (q.type === 'multiple_choice') {
                    score = answer.content === q.answer ? 100 : 0;
                    feedback = score === 100 ? '正確' : `錯誤 (正確答案: ${q.answer})`;
                }
                else if (q.type === 'multiple_selection') {
                    const studentAns = answer.content.split(',').sort().join(',');
                    const correctAns = q.answer?.split(',').sort().join(',');
                    score = studentAns === correctAns ? 100 : 0;
                    feedback = score === 100 ? '正確' : `錯誤 (正確答案: ${q.answer})`;
                }
                await this.prisma.answer.update({
                    where: { id: answer.id },
                    data: {
                        aiScore: score,
                        aiFeedback: feedback,
                        aiModel: model,
                    },
                });
                return { answerId: answer.id, score, feedback };
            }
            catch (err) {
                this.logger.error(`Failed to score answer ${answer.id}: ${err.message}`);
                return { answerId: answer.id, error: err.message };
            }
        }));
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