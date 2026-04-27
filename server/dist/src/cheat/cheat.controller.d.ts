import { CheatService } from './cheat.service';
export declare class CheatController {
    private cheatService;
    constructor(cheatService: CheatService);
    reportCheat(body: {
        sessionId: number;
        eventType: string;
        details?: unknown;
    }): Promise<{
        createdAt: Date;
        id: number;
        sessionId: number;
        resolution: string | null;
        resolvedBy: number | null;
        eventType: string;
        details: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    getPendingAlerts(req: any, page?: string, limit?: string): Promise<({
        session: {
            student: {
                name: string;
                studentId: string;
            };
            exam: {
                title: string;
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
                student: {
                    name: string;
                    studentId: string;
                };
                exam: {
                    title: string;
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
    getSessionLogs(sessionId: number, req: any): Promise<{
        createdAt: Date;
        id: number;
        sessionId: number;
        resolution: string | null;
        resolvedBy: number | null;
        eventType: string;
        details: import("@prisma/client/runtime/client").JsonValue | null;
    }[]>;
    unlock(logId: number, req: any): Promise<{
        status: string;
        sessionId: number | undefined;
    }>;
    terminate(logId: number, req: any): Promise<{
        status: string;
        sessionId: number | undefined;
    }>;
}
