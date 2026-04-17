import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CheatService {
  private readonly logger = new Logger(CheatService.name);

  constructor(private prisma: PrismaService) {}

  async logCheatEvent(sessionId: number, eventType: string, details?: any) {
    this.logger.warn(`Cheat event: session=${sessionId}, type=${eventType}`);

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

  async unlockSession(logId: number, teacherId: number) {
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

  async terminateSession(logId: number, teacherId: number) {
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

  async getPendingAlerts(page?: number, limit?: number) {
    const where = { resolution: null };
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

  async getLogsBySession(sessionId: number) {
    return this.prisma.cheatLog.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
