import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async findByClass(classId: number, page?: number, limit?: number) {
    const where = { classId };
    const include = {
      sessions: {
        orderBy: { id: 'desc' as const },
        take: 1,
        include: { exam: true },
      },
    };
    const orderBy: any = { studentId: 'asc' };

    if (page === undefined && limit === undefined) {
      return this.prisma.student.findMany({ where, include, orderBy });
    }

    const p = page || 1;
    const l = limit || 20;
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        include,
        orderBy,
        skip,
        take: l,
      }),
      this.prisma.student.count({ where }),
    ]);

    return { items, total, page: p, limit: l, totalPages: Math.ceil(total / l) };
  }

  async findById(id: number) {
    return this.prisma.student.findUnique({
      where: { id },
      include: { sessions: { include: { exam: true, answers: true } } },
    });
  }

  async bulkImport(
    students: { studentId: string; name: string }[],
    classId: number,
  ) {
    const results = { created: 0, updated: 0, errors: [] as string[] };

    for (const s of students) {
      try {
        await this.prisma.student.upsert({
          where: { studentId: s.studentId },
          update: { name: s.name, classId },
          create: { studentId: s.studentId, name: s.name, classId },
        });
        results.created++;
      } catch (err: any) {
        results.errors.push(`${s.studentId}: ${err.message}`);
      }
    }

    return results;
  }

  async create(data: { studentId: string; name: string; classId: number }) {
    return this.prisma.student.create({ data });
  }

  async update(id: number, data: { name?: string; classId?: number }) {
    return this.prisma.student.update({ where: { id }, data });
  }

  async delete(id: number) {
    return this.prisma.student.delete({ where: { id } });
  }

  async getStudentExams(studentId: number) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) return [];

    const now = new Date();
    const exams = await this.prisma.exam.findMany({
      where: {
        classId: student.classId,
        status: 'published',
        startTime: { lte: now },
        endTime: { gte: now },
      },
      include: {
        questions: { select: { id: true } },
        sessions: { where: { studentId } },
      },
    });

    return exams.map((exam) => ({
      id: exam.id,
      title: exam.title,
      difficulty: exam.difficulty,
      timeLimit: exam.timeLimit,
      questionCount: exam.questions.length,
      startTime: exam.startTime,
      endTime: exam.endTime,
      sessionStatus: exam.sessions[0]?.status || 'not_started',
    }));
  }
}
