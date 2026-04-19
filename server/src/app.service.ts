import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  getHello(): string {
    return 'NCYU Online English Exam API';
  }

  async getDashboardStats() {
    const now = new Date();
    
    // Active exams (currently running)
    const activeExams = await this.prisma.exam.count({
      where: {
        deletedAt: null,
        status: 'published',
        startTime: { lte: now },
        endTime: { gte: now },
      },
    });

    // Pending cheat alerts
    const pendingAlerts = await this.prisma.cheatLog.count({
      where: { resolution: null },
    });

    // Total submissions (this week)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const totalSubmissions = await this.prisma.examSession.count({
      where: {
        status: { in: ['submitted', 'graded'] },
        submittedAt: { gte: oneWeekAgo },
      },
    });

    const sessionsAwaitingScore = await this.prisma.examSession.count({
      where: { status: 'submitted' },
    });

    const sessionsPendingReview = await this.prisma.examSession.count({
      where: {
        answers: { some: { aiModel: 'pending_review' } },
      },
    });

    // Recent logs (simplified)
    const recentLogs = [
      { id: 1, type: 'info', message: '系統運行正常', time: new Date() },
    ];

    return {
      activeExams,
      pendingAlerts,
      totalSubmissions,
      sessionsAwaitingScore,
      sessionsPendingReview,
      recentLogs,
    };
  }
}
