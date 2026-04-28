import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScoringService } from '../scoring/scoring.service';
import { computeTimeRemainingSeconds } from './exam-time.util';
import { mapSessionsWithReviewFlags } from './sessionReviewFlags';
import {
  ensureClassAccess,
  ensureExamAccess,
  isAdminRole,
  type TeacherActor,
} from '../auth/access';

function parseTeacherExamDate(input: string): Date {
  const trimmed = String(input).trim();
  if (!trimmed) {
    throw new BadRequestException('考試時間不可為空');
  }
  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/i.test(trimmed)
    ? trimmed
    : `${trimmed}+08:00`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException('考試時間格式無效');
  }
  return parsed;
}

function countEnglishWords(input: string): number {
  const matches = String(input || '').trim().match(/[A-Za-z]+(?:[-'][A-Za-z]+)*/g);
  return matches ? matches.length : 0;
}

function hasAnswerContent(input: string | null | undefined): boolean {
  return String(input ?? '').trim().length > 0;
}

@Injectable()
export class ExamsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ScoringService))
    private scoringService: ScoringService,
  ) {}

  async findAll(actor: TeacherActor, classId?: number, page?: number, limit?: number) {
    if (classId) {
      await ensureClassAccess(this.prisma, actor, classId);
    }
    const andWhere: Prisma.ExamWhereInput[] = [
      { deletedAt: null },
    ];
    if (classId) {
      andWhere.push({ examClasses: { some: { classId } } });
    }
    if (!isAdminRole(actor.role)) {
      andWhere.push({
        examClasses: { some: { class: { teachers: { some: { teacherId: actor.id } } } } },
      });
    }
    const where: Prisma.ExamWhereInput = {
      deletedAt: null,
      AND: andWhere,
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

  async findById(id: number, actor: TeacherActor) {
    await ensureExamAccess(this.prisma, actor, id);
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
  }, actor: TeacherActor) {
    const uniqueClassIds = [...new Set(data.classIds)].filter((id) => Number.isInteger(id) && id > 0);
    if (uniqueClassIds.length === 0) {
      throw new BadRequestException('至少選擇一個適用班級');
    }
    for (const classId of uniqueClassIds) {
      await ensureClassAccess(this.prisma, actor, classId);
    }
    return this.prisma.$transaction(async (tx) => {
      const exam = await tx.exam.create({
        data: {
          title: data.title,
          difficulty: data.difficulty,
          timeLimit: data.timeLimit,
          startTime: parseTeacherExamDate(data.startTime),
          endTime: parseTeacherExamDate(data.endTime),
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
    actor: TeacherActor,
  ) {
    await ensureExamAccess(this.prisma, actor, id);

    const { classIds, ...rest } = data;
    const updateData: any = { ...rest };
    if (data.startTime) updateData.startTime = parseTeacherExamDate(data.startTime);
    if (data.endTime) updateData.endTime = parseTeacherExamDate(data.endTime);

    if (classIds !== undefined) {
      const uniqueClassIds = [...new Set(classIds)].filter((cid) => Number.isInteger(cid) && cid > 0);
      if (uniqueClassIds.length === 0) {
        throw new BadRequestException('至少選擇一個適用班級');
      }
      for (const classId of uniqueClassIds) {
        await ensureClassAccess(this.prisma, actor, classId);
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

  async delete(id: number, actor: TeacherActor) {
    await ensureExamAccess(this.prisma, actor, id);
    return this.prisma.exam.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async publish(id: number, actor: TeacherActor) {
    await ensureExamAccess(this.prisma, actor, id);
    const exam = await this.prisma.exam.findFirst({ where: { id, deletedAt: null } });
    if (!exam) throw new NotFoundException('考卷不存在或已移除');
    const questionCount = await this.prisma.question.count({ where: { examId: id } });
    if (questionCount === 0) {
      throw new BadRequestException('考卷尚未建立題目，無法發放');
    }
    return this.prisma.exam.update({
      where: { id },
      data: { status: 'published' },
    });
  }

  /** 將已發放考卷改回草稿；僅在尚無任何學生考試紀錄時允許，避免影響已進入或已交卷資料 */
  async unpublish(id: number, actor: TeacherActor) {
    await ensureExamAccess(this.prisma, actor, id);
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
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, classes: { select: { classId: true } } },
    });
    if (!student) throw new NotFoundException('學生不存在');
    const classIds = student.classes.map((row) => row.classId);
    if (classIds.length === 0) {
      throw new BadRequestException('學生尚未加入任何班級');
    }
    const exam = await this.prisma.exam.findFirst({
      where: {
        id: examId,
        deletedAt: null,
        examClasses: { some: { classId: { in: classIds } } },
      },
      include: { questions: { orderBy: { orderNum: 'asc' } } },
    });

    if (!exam) throw new NotFoundException('考卷不存在或未分配給此班級');
    if (exam.status !== 'published') throw new BadRequestException('考卷未開放');
    if (exam.questions.length === 0) throw new BadRequestException('考卷尚未建立題目');

    const now = new Date();
    if (now < exam.startTime || now > exam.endTime) {
      throw new BadRequestException('不在考試時間內');
    }

    const existingSession = await this.prisma.examSession.findUnique({
      where: { studentId_examId: { studentId: student.id, examId } },
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
        where: { studentId_examId: { studentId: student.id, examId } },
        update: { status: 'in_progress', startedAt: new Date() },
        create: {
          studentId: student.id,
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
          where: { studentId_examId: { studentId: student.id, examId } },
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

  async submitAnswer(
    sessionId: number,
    questionId: number,
    content: string,
    metrics?: { writingDurationSeconds?: number; wordCount?: number },
  ) {
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
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, examId: true, type: true },
    });
    if (!question || question.examId !== session.examId) {
      throw new BadRequestException('題目不屬於此考卷');
    }
    const isWritingQuestion = ['essay', 'paragraph_writing'].includes(question.type);
    const normalizedContent = String(content ?? '');
    const writingDurationSeconds =
      metrics?.writingDurationSeconds !== undefined
        ? Math.max(0, Math.round(Number(metrics.writingDurationSeconds)) || 0)
        : undefined;
    const wordCount =
      metrics?.wordCount !== undefined
        ? Math.max(0, Math.round(Number(metrics.wordCount)) || 0)
        : isWritingQuestion
          ? countEnglishWords(normalizedContent)
          : undefined;
    const existingAnswer = await this.prisma.answer.findUnique({
      where: { sessionId_questionId: { sessionId, questionId } },
      select: { id: true, content: true },
    });
    const hadAnswerBefore = hasAnswerContent(existingAnswer?.content);
    const hasAnswerNow = hasAnswerContent(normalizedContent);

    const row = await this.prisma.answer.upsert({
      where: { sessionId_questionId: { sessionId, questionId } },
      update: {
        content: normalizedContent,
        ...(writingDurationSeconds !== undefined ? { writingDurationSeconds } : {}),
        ...(wordCount !== undefined ? { wordCount } : {}),
      },
      create: {
        sessionId,
        questionId,
        content: normalizedContent,
        ...(writingDurationSeconds !== undefined ? { writingDurationSeconds } : {}),
        ...(wordCount !== undefined ? { wordCount } : {}),
      },
    });

    if (!hadAnswerBefore && hasAnswerNow) {
      await this.prisma.examSession.update({
        where: { id: sessionId },
        data: {
          answeredQuestionCount: {
            increment: 1,
          },
        },
      });
    } else if (hadAnswerBefore && !hasAnswerNow) {
      await this.prisma.examSession.updateMany({
        where: {
          id: sessionId,
          answeredQuestionCount: { gt: 0 },
        },
        data: {
          answeredQuestionCount: {
            decrement: 1,
          },
        },
      });
    }

    return row;
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
    this.scoringService.scoreSubmittedSession(sessionId).catch((err) => {
      console.error(`Background scoring failed for session ${sessionId}:`, err);
    });

    return session;
  }

  async getResults(actor: TeacherActor, classId: number, examId?: number, page?: number, limit?: number) {
    await ensureClassAccess(this.prisma, actor, classId);
    if (examId) {
      await ensureExamAccess(this.prisma, actor, examId);
    }
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
