import { ScoringService } from './scoring.service';
export declare class ScoringController {
    private scoringService;
    constructor(scoringService: ScoringService);
    scoreSession(sessionId: number, req: any): Promise<({
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
    }, req: any): Promise<{
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
    }, req: any): Promise<{
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
