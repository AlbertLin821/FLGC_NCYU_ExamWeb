import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScoringService } from '../scoring/scoring.service';
import { computeTimeRemainingSeconds } from './exam-time.util';
import { mapSessionsWithReviewFlags } from './sessionReviewFlags';

@Injectable()
export class ExamsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ScoringService))
    private scoringService: ScoringService,
  ) {}

  async findAll(classId?: number, page?: number, limit?: number) {
    const where: Prisma.ExamWhereInput = {
      deletedAt: null,
      ...(classId ? { examClasses: { some: { classId } } } : {}),
    };
    const include = {
      examClasses: { include: { class: { select: { id: true, name: true } } } },
      _count: { select: { questions: true, sessions: true } },
    };
    const orderBy: any = { createdAt: 'desc' };

    if (page === undefined && limit === undefined) {
      return this.prisma.exam.findMany({ where, include, orderBy });
    }

    const p = page || 1;
    const l = limit || 20;
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
      this.prisma.exam.findMany({
        where,
        include,
        orderBy,
        skip,
        take: l,
      }),
      this.prisma.exam.count({ where }),
    ]);
    return { items, total, page: p, limit: l, totalPages: Math.ceil(total / l) };
  }

  async findById(id: number) {
    return this.prisma.exam.findFirst({
      where: { id, deletedAt: null },
      include: {
        questions: { orderBy: { orderNum: 'asc' } },
        examClasses: { include: { class: { select: { id: true, name: true } } } },
      },
    });
  }

  async create(data: {
    title: string;
    classIds: number[];
    difficulty?: string;
    timeLimit: number;
    startTime: string;
    endTime: string;
    createdBy: number;
  }) {
    const uniqueClassIds = [...new Set(data.classIds)].filter((id) => Number.isInteger(id) && id > 0);
    if (uniqueClassIds.length === 0) {
      throw new BadRequestException('至少選擇一個適用班級');
    }
    return this.prisma.$transaction(async (tx) => {
      const exam = await tx.exam.create({
        data: {
          title: data.title,
          difficulty: data.difficulty,
          timeLimit: data.timeLimit,
          startTime: new Date(data.startTime),
          endTime: new Date(data.endTime),
          createdBy: data.createdBy,
          examClasses: {
            create: uniqueClassIds.map((classId) => ({ classId })),
          },
        },
        include: {
          examClasses: { include: { class: { select: { id: true, name: true } } } },
        },
      });
      return exam;
    });
  }

  async update(
    id: number,
    data: Partial<{
      title: string;
      classIds: number[];
      difficulty: string;
      timeLimit: number;
      startTime: string;
      endTime: string;
      status: string;
    }>,
  ) {
    const alive = await this.prisma.exam.findFirst({ where: { id, deletedAt: null } });
    if (!alive) throw new NotFoundException('考卷不存在或已移除');

    const { classIds, ...rest } = data;
    const updateData: any = { ...rest };
    if (data.startTime) updateData.startTime = new Date(data.startTime);
    if (data.endTime) updateData.endTime = new Date(data.endTime);

    if (classIds !== undefined) {
      const uniqueClassIds = [...new Set(classIds)].filter((cid) => Number.isInteger(cid) && cid > 0);
      if (uniqueClassIds.length === 0) {
        throw new BadRequestException('至少選擇一個適用班級');
      }
      return this.prisma.$transaction(async (tx) => {
        await tx.examClass.deleteMany({ where: { examId: id } });
        await tx.examClass.createMany({
          data: uniqueClassIds.map((classId) => ({ examId: id, classId })),
        });
        const hasExamFieldUpdates = Object.keys(updateData).length > 0;
        if (hasExamFieldUpdates) {
          return tx.exam.update({
            where: { id },
            data: updateData,
            include: {
              examClasses: { include: { class: { select: { id: true, name: true } } } },
            },
          });
        }
        return tx.exam.findUniqueOrThrow({
          where: { id },
          include: {
            examClasses: { include: { class: { select: { id: true, name: true } } } },
          },
        });
      });
    }

    return this.prisma.exam.update({ where: { id }, data: updateData });
  }

  async delete(id: number) {
    const exam = await this.prisma.exam.findFirst({ where: { id, deletedAt: null } });
    if (!exam) throw new NotFoundException('考卷不存在或已移除');
    return this.prisma.exam.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async publish(id: number) {
    const exam = await this.prisma.exam.findFirst({ where: { id, deletedAt: null } });
    if (!exam) throw new NotFoundException('考卷不存在或已移除');
    return this.prisma.exam.update({
      where: { id },
      data: { status: 'published' },
    });
  }

  /** 將已發放考卷改回草稿；僅在尚無任何學生考試紀錄時允許，避免影響已進入或已交卷資料 */
  async unpublish(id: number) {
    const exam = await this.prisma.exam.findFirst({ where: { id, deletedAt: null } });
    if (!exam) throw new NotFoundException('考卷不存在或已移除');
    if (exam.status !== 'published') {
      throw new BadRequestException('僅已發放之考卷可取消發放');
    }
    const sessionCount = await this.prisma.examSession.count({ where: { examId: id } });
    if (sessionCount > 0) {
      throw new BadRequestException('已有學生產生考試紀錄，無法取消發放');
    }
    return this.prisma.exam.update({
      where: { id },
      data: { status: 'draft' },
    });
  }

  async startSession(studentId: number, examId: number) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, deletedAt: null },
      include: { questions: { orderBy: { orderNum: 'asc' } } },
    });

    if (!exam) throw new NotFoundException('考卷不存在');
    if (exam.status !== 'published') throw new BadRequestException('考卷未開放');

    const now = new Date();
    if (now < exam.startTime || now > exam.endTime) {
      throw new BadRequestException('不在考試時間內');
    }

    const existingSession = await this.prisma.examSession.findUnique({
      where: { studentId_examId: { studentId, examId } },
    });

    if (existingSession && existingSession.status === 'submitted') {
      throw new BadRequestException('已完成此考試');
    }

    if (existingSession && (existingSession.status === 'in_progress' || existingSession.status === 'paused')) {
      const session = await this.prisma.examSession.findUniqueOrThrow({
        where: { id: existingSession.id },
        include: { exam: true },
      });
      const timeRemainingSeconds = computeTimeRemainingSeconds(
        session.startedAt,
        exam.timeLimit,
        now,
        exam.endTime,
      );
      return {
        session,
        questions: exam.questions,
        timeLimit: exam.timeLimit,
        timeRemainingSeconds,
      };
    }

    try {
      const session = await this.prisma.examSession.upsert({
        where: { studentId_examId: { studentId, examId } },
        update: { status: 'in_progress', startedAt: new Date() },
        create: {
          studentId,
          examId,
          status: 'in_progress',
          startedAt: new Date(),
        },
        include: { exam: true },
      });

      const timeRemainingSeconds = computeTimeRemainingSeconds(
        session.startedAt,
        exam.timeLimit,
        now,
        exam.endTime,
      );
      return {
        session,
        questions: exam.questions,
        timeLimit: exam.timeLimit,
        timeRemainingSeconds,
      };
    } catch (e: unknown) {
      // 並行請求（例如 React Strict Mode 雙次掛載）可能同時 create，第二筆撞 unique
      if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2002') {
        const session = await this.prisma.examSession.findUniqueOrThrow({
          where: { studentId_examId: { studentId, examId } },
          include: { exam: true },
        });
        if (session.status === 'submitted') {
          throw new BadRequestException('已完成此考試');
        }
        const timeRemainingSeconds = computeTimeRemainingSeconds(
          session.startedAt,
          exam.timeLimit,
          now,
          exam.endTime,
        );
        return {
          session,
          questions: exam.questions,
          timeLimit: exam.timeLimit,
          timeRemainingSeconds,
        };
      }
      throw e;
    }
  }

  async submitAnswer(sessionId: number, questionId: number, content: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: { exam: true },
    });
    if (!session) throw new NotFoundException('考試工作階段不存在');
    if (session.status !== 'in_progress') {
      throw new BadRequestException('目前狀態無法作答');
    }
    const remaining = computeTimeRemainingSeconds(
      session.startedAt,
      session.exam.timeLimit,
      new Date(),
      session.exam.endTime,
    );
    if (remaining <= 0) {
      throw new BadRequestException('作答時間已結束');
    }
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.answer.upsert({
        where: { sessionId_questionId: { sessionId, questionId } },
        update: { content },
        create: { sessionId, questionId, content },
      });
      const agg = await tx.$queryRaw<[{ c: number }]>(
        Prisma.sql`SELECT COUNT(*)::int AS c FROM "answers" WHERE "session_id" = ${sessionId} AND "content" IS NOT NULL AND TRIM("content") <> ''`,
      );
      const answeredQuestionCount = Number(agg[0]?.c ?? 0);
      await tx.examSession.update({
        where: { id: sessionId },
        data: { answeredQuestionCount },
      });
      return row;
    });
  }

  async submitExam(sessionId: number) {
    const existing = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: { exam: true },
    });
    if (!existing) throw new NotFoundException('考試工作階段不存在');
    if (existing.status === 'submitted') {
      throw new BadRequestException('已交卷');
    }
    if (existing.status !== 'in_progress') {
      throw new BadRequestException('目前狀態無法交卷');
    }

    const result = await this.prisma.examSession.updateMany({
      where: { id: sessionId, status: 'in_progress' },
      data: { status: 'submitted', submittedAt: new Date() },
    });
    if (result.count === 0) {
      throw new BadRequestException('已交卷');
    }

    const session = await this.prisma.examSession.findUniqueOrThrow({ where: { id: sessionId } });

    // 僅客觀題計分；問答題留待教師集體批閱
    this.scoringService.scoreObjectiveOnly(sessionId).catch((err) => {
      console.error(`Objective scoring failed for session ${sessionId}:`, err);
    });

    return session;
  }

  async getResults(classId: number, examId?: number, page?: number, limit?: number) {
    const where = {
      exam: { examClasses: { some: { classId } } },
      ...(examId ? { examId } : {}),
    };
    const include = {
      student: { select: { id: true, studentId: true, name: true } },
      exam: { select: { title: true } },
      answers: {
        include: {
          question: {
            select: { id: true, orderNum: true, word1: true, word2: true, maxPoints: true },
          },
        },
      },
    };
    const orderBy: any = { submittedAt: 'desc' };

    if (page === undefined && limit === undefined) {
      const rows = await this.prisma.examSession.findMany({ where, include, orderBy });
      return mapSessionsWithReviewFlags(rows);
    }

    const p = page || 1;
    const l = limit || 20;
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
      this.prisma.examSession.findMany({
        where,
        include,
        orderBy,
        skip,
        take: l,
      }),
      this.prisma.examSession.count({ where }),
    ]);

    return {
      items: mapSessionsWithReviewFlags(items),
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
    };
  }
}
