import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ensureExamAccess,
  ensureStudentAccess,
  isAdminRole,
  isViewerRole,
  type TeacherActor,
} from '../auth/access';

@Injectable()
export class CheatService {
  private readonly logger = new Logger(CheatService.name);

  constructor(private prisma: PrismaService) {}

  async logCheatEvent(sessionId: number, eventType: string, details?: any) {
    this.logger.warn(`Cheat event: session=${sessionId}, type=${eventType}`);

    const existing = await this.prisma.cheatLog.findFirst({
      where: {
        sessionId,
        resolution: null,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      await this.prisma.examSession.update({
        where: { id: sessionId },
        data: { status: 'paused' },
      });
      return existing;
    }

    // Log the event
    const log = await this.prisma.cheatLog.create({
      data: { sessionId, eventType, details },
    });

    // Pause the session
    await this.prisma.examSession.update({
      where: { id: sessionId },
      data: { status: 'paused' },
    });

    return log;
  }

  async unlockSession(logId: number, teacherId: number, actor: TeacherActor) {
    const logBeforeUpdate = await this.prisma.cheatLog.findUnique({
      where: { id: logId },
      select: {
        id: true,
        session: {
          select: {
            examId: true,
            student: { select: { id: true } },
          },
        },
      },
    });
    if (logBeforeUpdate) {
      await ensureExamAccess(this.prisma, actor, logBeforeUpdate.session.examId);
      await ensureStudentAccess(this.prisma, actor, logBeforeUpdate.session.student.id);
    }
    // Update the cheat log
    await this.prisma.cheatLog.update({
      where: { id: logId },
      data: { resolvedBy: teacherId, resolution: 'unlocked' },
    });

    // Get session from log
    const log = await this.prisma.cheatLog.findUnique({
      where: { id: logId },
      select: { sessionId: true },
    });

    if (log) {
      await this.prisma.examSession.update({
        where: { id: log.sessionId },
        data: { status: 'in_progress' },
      });
    }

    return { status: 'unlocked', sessionId: log?.sessionId };
  }

  async terminateSession(logId: number, teacherId: number, actor: TeacherActor) {
    const logBeforeUpdate = await this.prisma.cheatLog.findUnique({
      where: { id: logId },
      select: {
        id: true,
        session: {
          select: {
            examId: true,
            student: { select: { id: true } },
          },
        },
      },
    });
    if (logBeforeUpdate) {
      await ensureExamAccess(this.prisma, actor, logBeforeUpdate.session.examId);
      await ensureStudentAccess(this.prisma, actor, logBeforeUpdate.session.student.id);
    }
    // Update the cheat log
    await this.prisma.cheatLog.update({
      where: { id: logId },
      data: { resolvedBy: teacherId, resolution: 'terminated' },
    });

    // Get session from log
    const log = await this.prisma.cheatLog.findUnique({
      where: { id: logId },
      select: { sessionId: true },
    });

    if (log) {
      await this.prisma.examSession.update({
        where: { id: log.sessionId },
        data: { status: 'submitted', submittedAt: new Date() },
      });
    }

    return { status: 'terminated', sessionId: log?.sessionId };
  }

  async getPendingAlerts(actor: TeacherActor, page?: number, limit?: number) {
    const where = {
      resolution: null,
      ...(!isAdminRole(actor.role) && !isViewerRole(actor.role)
        ? {
            session: {
              exam: {
                examClasses: {
                  some: {
                    class: {
                      teachers: {
                        some: { teacherId: actor.id },
                      },
                    },
                  },
                },
              },
            },
          }
        : {}),
    };
    const include = {
      session: {
        include: {
          student: { select: { studentId: true, name: true } },
          exam: { select: { title: true } },
        },
      },
    };
    const orderBy: any = { createdAt: 'desc' };

    if (page === undefined && limit === undefined) {
      return this.prisma.cheatLog.findMany({ where, include, orderBy });
    }

    const p = page || 1;
    const l = limit || 20;
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
      this.prisma.cheatLog.findMany({
        where,
        include,
        orderBy,
        skip,
        take: l,
      }),
      this.prisma.cheatLog.count({ where }),
    ]);

    return { items, total, page: p, limit: l, totalPages: Math.ceil(total / l) };
  }

  async getLogsBySession(sessionId: number, actor: TeacherActor) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      select: { examId: true, student: { select: { id: true } } },
    });
    if (session) {
      await ensureExamAccess(this.prisma, actor, session.examId);
      await ensureStudentAccess(this.prisma, actor, session.student.id);
    }
    return this.prisma.cheatLog.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSessionIdByLogId(logId: number): Promise<number | null> {
    const log = await this.prisma.cheatLog.findUnique({
      where: { id: logId },
      select: { sessionId: true },
    });
    return log?.sessionId ?? null;
  }
}
