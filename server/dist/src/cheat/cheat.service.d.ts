import { PrismaService } from '../prisma/prisma.service';
export declare class CheatService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    logCheatEvent(sessionId: number, eventType: string, details?: any): Promise<{
        createdAt: Date;
        id: number;
        sessionId: number;
        resolution: string | null;
        resolvedBy: number | null;
        eventType: string;
        details: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    unlockSession(logId: number, teacherId: number): Promise<{
        status: string;
        sessionId: number | undefined;
    }>;
    terminateSession(logId: number, teacherId: number): Promise<{
        status: string;
        sessionId: number | undefined;
    }>;
    getPendingAlerts(page?: number, limit?: number): Promise<({
        session: {
            exam: {
                title: string;
            };
            student: {
                name: string;
                studentId: string;
            };
        } & {
            id: number;
            studentId: number;
            status: string;
            examId: number;
            startedAt: Date | null;
            submittedAt: Date | null;
            answeredQuestionCount: number;
            overallFeedbackEn: string | null;
            overallFeedbackZh: string | null;
        };
    } & {
        createdAt: Date;
        id: number;
        sessionId: number;
        resolution: string | null;
        resolvedBy: number | null;
        eventType: string;
        details: import("@prisma/client/runtime/client").JsonValue | null;
    })[] | {
        items: ({
            session: {
                exam: {
                    title: string;
                };
                student: {
                    name: string;
                    studentId: string;
                };
            } & {
                id: number;
                studentId: number;
                status: string;
                examId: number;
                startedAt: Date | null;
                submittedAt: Date | null;
                answeredQuestionCount: number;
                overallFeedbackEn: string | null;
                overallFeedbackZh: string | null;
            };
        } & {
            createdAt: Date;
            id: number;
            sessionId: number;
            resolution: string | null;
            resolvedBy: number | null;
            eventType: string;
            details: import("@prisma/client/runtime/client").JsonValue | null;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getLogsBySession(sessionId: number): Promise<{
        createdAt: Date;
        id: number;
        sessionId: number;
        resolution: string | null;
        resolvedBy: number | null;
        eventType: string;
        details: import("@prisma/client/runtime/client").JsonValue | null;
    }[]>;
}
