import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { isAdminRole, isViewerRole, type TeacherActor } from './auth/access';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  getHello(): string {
    return 'NCYU Online English Exam API';
  }

  async getDashboardStats(actor: TeacherActor) {
    const now = new Date();
    const teacherExamScope =
      !isAdminRole(actor.role) && !isViewerRole(actor.role)
        ? {
            examClasses: {
              some: {
                class: {
                  teachers: {
                    some: { teacherId: actor.id },
                  },
                },
              },
            },
          }
        : undefined;
    
    // Active participants (currently taking exam)
    const activeSessions = await this.prisma.examSession.count({
      where: {
        status: 'in_progress',
        exam: {
          deletedAt: null,
          status: 'published',
          startTime: { lte: now },
          endTime: { gte: now },
          ...(teacherExamScope ?? {}),
        },
      },
    });

    // Pending cheat alerts
    const pendingAlerts = await this.prisma.cheatLog.count({
      where: {
        resolution: null,
        ...(!isAdminRole(actor.role) && !isViewerRole(actor.role)
          ? {
              session: {
                exam: teacherExamScope,
              },
            }
          : {}),
      },
    });

    // Total submissions (this week)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const totalSubmissions = await this.prisma.examSession.count({
      where: {
        status: { in: ['submitted', 'graded'] },
        submittedAt: { gte: oneWeekAgo },
        ...(!isAdminRole(actor.role) && !isViewerRole(actor.role)
          ? {
              exam: teacherExamScope,
            }
          : {}),
      },
    });

    const sessionsAwaitingScore = await this.prisma.examSession.count({
      where: {
        status: 'submitted',
        ...(!isAdminRole(actor.role) && !isViewerRole(actor.role)
          ? {
              exam: teacherExamScope,
            }
          : {}),
      },
    });

    const sessionsPendingReview = await this.prisma.examSession.count({
      where: {
        ...(!isAdminRole(actor.role) && !isViewerRole(actor.role)
          ? {
              exam: teacherExamScope,
            }
          : {}),
        answers: { some: { aiModel: 'pending_review' } },
      },
    });

    // Recent logs (simplified)
    const recentLogs = [
      { id: 1, type: 'info', message: '系統運行正常', time: new Date() },
    ];

    return {
      activeSessions,
      pendingAlerts,
      totalSubmissions,
      sessionsAwaitingScore,
      sessionsPendingReview,
      recentLogs,
    };
  }
}
