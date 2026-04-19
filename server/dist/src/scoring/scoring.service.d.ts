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
    private buildEssayPrompt;
    scoreWithOpenAI(prompt: string): Promise<ScoringResult>;
    scoreWithGemini(prompt: string): Promise<ScoringResult>;
    scoreAI(prompt: string): Promise<ScoringResult>;
    private markEssayPendingReview;
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
}
export {};
