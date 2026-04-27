import { PrismaService } from './prisma/prisma.service';
import { type TeacherActor } from './auth/access';
export declare class AppService {
    private prisma;
    constructor(prisma: PrismaService);
    getHello(): string;
    getDashboardStats(actor: TeacherActor): Promise<{
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
