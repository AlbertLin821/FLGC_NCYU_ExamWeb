import { CheatService } from './cheat.service';
export declare class CheatController {
    private cheatService;
    constructor(cheatService: CheatService);
    getPendingAlerts(page?: string, limit?: string): Promise<({
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
    getSessionLogs(sessionId: number): Promise<{
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
