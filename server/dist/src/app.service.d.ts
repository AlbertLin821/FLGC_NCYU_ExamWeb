import { PrismaService } from './prisma/prisma.service';
export declare class AppService {
    private prisma;
    constructor(prisma: PrismaService);
    getHello(): string;
    getDashboardStats(): Promise<{
        activeExams: number;
        pendingAlerts: number;
        totalSubmissions: number;
        sessionsAwaitingScore: number;
        sessionsPendingReview: number;
        recentLogs: {
            id: number;
            type: string;
            message: string;
            time: Date;
        }[];
    }>;
}
