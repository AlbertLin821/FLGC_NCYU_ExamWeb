import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ensureClassAccess, ensureStudentAccess, type TeacherActor } from '../auth/access';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  /** 管理員：跨班學生列表（分頁） */
  async findAllPaginated(page?: number, limit?: number) {
    const p = page || 1;
    const l = limit || 20;
    const skip = (p - 1) * l;
    const where = {};
    const orderBy: any = { id: 'asc' };
    const [items, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        include: {
          class: { select: { id: true, name: true } },
        },
        orderBy,
        skip,
        take: l,
      }),
      this.prisma.student.count({ where }),
    ]);
    return {
      items,
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
    };
  }

  async findByClass(classId: number, actor: TeacherActor, page?: number, limit?: number) {
    await ensureClassAccess(this.prisma, actor, classId);
    const where = { classId };
    /** 班級學生列表僅需分數權重與場次狀態，精簡 query 以降低大量學生時延遲 */
    const include = {
      sessions: {
        orderBy: { id: 'desc' as const },
        include: {
          exam: {
            select: { title: true, startTime: true, endTime: true },
          },
          answers: {
            select: {
              aiScore: true,
              question: { select: { maxPoints: true } },
            },
          },
        },
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

  async findById(id: number, actor: TeacherActor) {
    await ensureStudentAccess(this.prisma, actor, id);
    return this.prisma.student.findUnique({
      where: { id },
      include: {
        sessions: { include: { exam: true, answers: { include: { question: true } } } },
      },
    });
  }

  async bulkImport(
    students: { studentId: string; name: string; schoolName: string }[],
    classId: number,
    actor: TeacherActor,
  ) {
    await ensureClassAccess(this.prisma, actor, classId);
    const results = { created: 0, updated: 0, errors: [] as string[] };
    const chunkSize = 40;

    for (let i = 0; i < students.length; i += chunkSize) {
      const chunk = students.slice(i, i + chunkSize);
      const outcomes = await Promise.all(
        chunk.map(async (s) => {
          const data = {
            studentId: s.studentId.trim(),
            name: s.name.trim(),
            schoolName: s.schoolName.trim(),
            classId,
          };
          try {
            await this.prisma.student.upsert({
              where: { studentId: data.studentId },
              update: { name: data.name, schoolName: data.schoolName, classId },
              create: data,
            });
            return { ok: true as const, studentId: data.studentId };
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return { ok: false as const, studentId: s.studentId, message };
          }
        }),
      );
      for (const o of outcomes) {
        if (o.ok) results.created++;
        else results.errors.push(`${o.studentId}: ${o.message}`);
      }
    }

    return results;
  }

  async create(
    data: { studentId: string; name: string; schoolName: string; classId: number },
    actor: TeacherActor,
  ) {
    await ensureClassAccess(this.prisma, actor, data.classId);
    return this.prisma.student.create({
      data: {
        studentId: data.studentId.trim(),
        name: data.name.trim(),
        schoolName: data.schoolName.trim(),
        classId: data.classId,
      },
    });
  }

  async update(id: number, data: { name?: string; schoolName?: string; classId?: number }, actor: TeacherActor) {
    const currentClassId = await ensureStudentAccess(this.prisma, actor, id);
    if (data.classId !== undefined && data.classId !== currentClassId) {
      await ensureClassAccess(this.prisma, actor, data.classId);
    }
    return this.prisma.student.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.schoolName !== undefined ? { schoolName: data.schoolName.trim() } : {}),
        ...(data.classId !== undefined ? { classId: data.classId } : {}),
      },
    });
  }

  async delete(id: number, actor: TeacherActor) {
    await ensureStudentAccess(this.prisma, actor, id);
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
        deletedAt: null,
        examClasses: { some: { classId: student.classId } },
        status: 'published',
        startTime: { lte: now },
        endTime: { gte: now },
      },
      include: {
        questions: { select: { id: true } },
        sessions: { where: { studentId: student.id } },
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
