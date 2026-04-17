import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
interface ScoringResult {
    score: number;
    feedback: string;
    model: string;
}
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
    scoreSession(sessionId: number): Promise<({
        answerId: number;
        skipped: boolean;
        score?: undefined;
        feedback?: undefined;
        error?: undefined;
    } | {
        answerId: number;
        score: number;
        feedback: string;
        skipped?: undefined;
        error?: undefined;
    } | {
        answerId: number;
        error: any;
        skipped?: undefined;
        score?: undefined;
        feedback?: undefined;
    })[]>;
}
export {};
