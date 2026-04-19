import { ScoringService } from './scoring.service';
export declare class ScoringController {
    private scoringService;
    constructor(scoringService: ScoringService);
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
    batchEssayGrade(examId: number, body: {
        classId: number;
    }): Promise<{
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
    manualGradeAnswer(answerId: number, body: {
        aiScore: number;
        aiFeedback?: string;
    }): Promise<{
        question: {
            id: number;
            content: string | null;
            answer: string | null;
            examId: number;
            type: string;
            options: import("@prisma/client/runtime/client").JsonValue | null;
            word1: string | null;
            word2: string | null;
            orderNum: number;
            maxPoints: number;
        };
    } & {
        id: number;
        sessionId: number;
        questionId: number;
        content: string | null;
        aiScore: import("@prisma/client-runtime-utils").Decimal | null;
        aiFeedback: string | null;
        aiModel: string | null;
        createdAt: Date;
    }>;
}
