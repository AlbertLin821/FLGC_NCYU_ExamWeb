import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScoringService } from '../scoring/scoring.service';

@Injectable()
export class ExamsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ScoringService))
    private scoringService: ScoringService,
  ) {}

  async findAll(classId?: number, page?: number, limit?: number) {
    const where = classId ? { classId } : undefined;
    const include = {
      class: { select: { id: true, name: true } },
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
    return this.prisma.exam.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { orderNum: 'asc' } },
        class: { select: { id: true, name: true } },
      },
    });
  }

  async create(data: {
    title: string;
    classId: number;
    difficulty?: string;
    timeLimit: number;
    startTime: string;
    endTime: string;
    createdBy: number;
  }) {
    return this.prisma.exam.create({
      data: {
        title: data.title,
        classId: data.classId,
        difficulty: data.difficulty,
        timeLimit: data.timeLimit,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        createdBy: data.createdBy,
      },
    });
  }

  async update(id: number, data: Partial<{
    title: string;
    difficulty: string;
    timeLimit: number;
    startTime: string;
    endTime: string;
    status: string;
  }>) {
    const updateData: any = { ...data };
    if (data.startTime) updateData.startTime = new Date(data.startTime);
    if (data.endTime) updateData.endTime = new Date(data.endTime);
    return this.prisma.exam.update({ where: { id }, data: updateData });
  }

  async delete(id: number) {
    return this.prisma.exam.delete({ where: { id } });
  }

  async publish(id: number) {
    return this.prisma.exam.update({
      where: { id },
      data: { status: 'published' },
    });
  }

  async startSession(studentId: number, examId: number) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
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
      return { session: existingSession, questions: exam.questions, timeLimit: exam.timeLimit };
    }

    const session = await this.prisma.examSession.upsert({
      where: { studentId_examId: { studentId, examId } },
      update: { status: 'in_progress', startedAt: new Date() },
      create: {
        studentId,
        examId,
        status: 'in_progress',
        startedAt: new Date(),
      },
    });

    return { session, questions: exam.questions, timeLimit: exam.timeLimit };
  }

  async submitAnswer(sessionId: number, questionId: number, content: string) {
    return this.prisma.answer.upsert({
      where: { sessionId_questionId: { sessionId, questionId } },
      update: { content },
      create: { sessionId, questionId, content },
    });
  }

  async submitExam(sessionId: number) {
    const session = await this.prisma.examSession.update({
      where: { id: sessionId },
      data: { status: 'submitted', submittedAt: new Date() },
    });

    // Auto trigger scoring in background
    this.scoringService.scoreSession(sessionId).catch(err => {
      console.error(`Auto scoring failed for session ${sessionId}:`, err);
    });

    return session;
  }

  async getResults(classId: number, examId?: number, page?: number, limit?: number) {
    const where = {
      exam: { classId },
      ...(examId ? { examId } : {}),
    };
    const include = {
      student: { select: { studentId: true, name: true } },
      exam: { select: { title: true } },
      answers: {
        include: { question: { select: { word1: true, word2: true } } },
      },
    };
    const orderBy: any = { submittedAt: 'desc' };

    if (page === undefined && limit === undefined) {
      return this.prisma.examSession.findMany({ where, include, orderBy });
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

    return { items, total, page: p, limit: l, totalPages: Math.ceil(total / l) };
  }
}
