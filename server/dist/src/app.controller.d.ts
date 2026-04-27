import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getHello(): string;
    getStats(req: any): Promise<{
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
