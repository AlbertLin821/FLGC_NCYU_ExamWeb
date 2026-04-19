import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
interface ScoringResult {
    score: number;
    feedback: string;
    model: string;
}
export declare function classifyAiScoringError(err: unknown): 'rate_limit' | 'provider' | 'other';
export declare class ScoringService {
    private prisma;
    private config;
    private readonly logger;
    private openai;
    private gemini;
    constructor(prisma: PrismaService, config: ConfigService);
    private resolveGeminiModel;
    private buildEssayPrompt;
    scoreWithOpenAI(prompt: string): Promise<ScoringResult>;
    scoreWithGemini(prompt: string): Promise<ScoringResult>;
    private stringifyAiErr;
    private isBatchRetryableQuotaError;
    private isHardGeminiQuotaExhausted;
    private parseRetryAfterMsFromError;
    private delay;
    private callBatchGradingOpenAI;
    private callBatchGradingGemini;
    private callBatchGradingModel;
    scoreAI(prompt: string): Promise<ScoringResult>;
    private markEssayPendingReview;
    scoreObjectiveOnly(sessionId: number): Promise<({
        answerId: number;
        score: number;
        feedback: string;
    } | {
        answerId: number;
        skipped: true;
    } | {
        answerId: number;
        pendingReview: true;
        kind: string;
    })[]>;
    private static essayAnswerNeedsAiGrading;
    private finalizeSessionStatusAfterScoring;
    scoreSession(sessionId: number): Promise<({
        answerId: number;
        score: number;
        feedback: string;
    } | {
        answerId: number;
        skipped: true;
    } | {
        answerId: number;
        pendingReview: true;
        kind: string;
    })[]>;
    batchGradeEssaysForExamAndClass(examId: number, classId: number): Promise<{
        examId: number;
        classId: number;
        processed: number;
        skipped: number;
        failed: {
            sessionId: number;
            reason: string;
        }[];
    } | {
        message: string;
        examId: number;
        classId: number;
        processed: number;
        skipped: number;
        failed: {
            sessionId: number;
            reason: string;
        }[];
    }>;
    private markSessionEssaysBatchParseFailed;
    manualGradeAnswer(answerId: number, aiScore: number, aiFeedback?: string): Promise<{
        question: {
            id: number;
            type: string;
            content: string | null;
            options: import("@prisma/client/runtime/client").JsonValue | null;
            answer: string | null;
            word1: string | null;
            word2: string | null;
            orderNum: number;
            maxPoints: number;
            examId: number;
        };
    } & {
        createdAt: Date;
        id: number;
        content: string | null;
        sessionId: number;
        aiModel: string | null;
        aiScore: import("@prisma/client-runtime-utils").Decimal | null;
        questionId: number;
        aiFeedback: string | null;
    }>;
}
export {};
