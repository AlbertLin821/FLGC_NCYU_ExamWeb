import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ensureClassAccess, ensureStudentAccess, type TeacherActor } from '../auth/access';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  private async getActorVisibleClassIds(actor: TeacherActor): Promise<number[] | null> {
    if (actor.role === 'admin') {
      return null;
    }
    const memberships = await this.prisma.teacherClass.findMany({
      where: { teacherId: actor.id },
      select: { classId: true },
    });
    return memberships.map((row) => row.classId);
  }

  /** 管理員：跨班學生列表（分頁） */
  async findAllPaginated(page?: number, limit?: number) {
    const p = page || 1;
    const l = limit || 20;
    const skip = (p - 1) * l;
    const where = {};
    const orderBy: any = { studentId: 'asc' };
    const [items, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        include: {
          classes: {
            include: {
              class: { select: { id: true, name: true } },
            },
            orderBy: { classId: 'asc' },
          },
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
    const where = { classes: { some: { classId } } };
    /** 班級學生列表僅需分數權重與場次狀態，精簡 query 以降低大量學生時延遲 */
    const include = {
      sessions: {
        where: {
          exam: {
            examClasses: {
              some: { classId },
            },
          },
        },
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
      classes: {
        include: {
          class: { select: { id: true, name: true } },
        },
        orderBy: { classId: 'asc' as const },
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
    const visibleClassIds = await this.getActorVisibleClassIds(actor);
    return this.prisma.student.findUnique({
      where: { id },
      include: {
        classes: {
          where: visibleClassIds ? { classId: { in: visibleClassIds } } : undefined,
          include: {
            class: { select: { id: true, name: true } },
          },
          orderBy: { classId: 'asc' },
        },
        sessions: {
          where: visibleClassIds
            ? {
                exam: {
                  examClasses: {
                    some: {
                      classId: { in: visibleClassIds },
                    },
                  },
                },
              }
            : undefined,
          include: { exam: true, answers: { include: { question: true } } },
        },
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
    for (const s of students) {
      const data = {
        studentId: String(s.studentId || '').trim(),
        name: String(s.name || '').trim(),
        schoolName: String(s.schoolName || '').trim(),
      };
      if (!data.studentId || !data.name || !data.schoolName) {
        results.errors.push(`${s.studentId || '（空白學號）'}: 校名、學號、姓名不可空白`);
        continue;
      }

      try {
        await this.prisma.$transaction(async (tx) => {
          const existing = await tx.student.findUnique({
            where: { studentId: data.studentId },
            select: { id: true },
          });
          const student = existing
            ? await tx.student.update({
                where: { id: existing.id },
                data: { name: data.name, schoolName: data.schoolName },
              })
            : await tx.student.create({ data });

          await tx.studentClass.upsert({
            where: {
              studentId_classId: {
                studentId: student.id,
                classId,
              },
            },
            update: {},
            create: {
              studentId: student.id,
              classId,
            },
          });

          if (existing) {
            results.updated++;
          } else {
            results.created++;
          }
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        results.errors.push(`${data.studentId}: ${message}`);
      }
    }

    return results;
  }

  async create(
    data: { studentId: string; name: string; schoolName: string; classId: number },
    actor: TeacherActor,
  ) {
    await ensureClassAccess(this.prisma, actor, data.classId);
    return this.prisma.$transaction(async (tx) => {
      const student = await tx.student.upsert({
        where: { studentId: data.studentId.trim() },
        update: {
          name: data.name.trim(),
          schoolName: data.schoolName.trim(),
        },
        create: {
          studentId: data.studentId.trim(),
          name: data.name.trim(),
          schoolName: data.schoolName.trim(),
        },
      });
      await tx.studentClass.upsert({
        where: {
          studentId_classId: {
            studentId: student.id,
            classId: data.classId,
          },
        },
        update: {},
        create: {
          studentId: student.id,
          classId: data.classId,
        },
      });
      return tx.student.findUniqueOrThrow({
        where: { id: student.id },
        include: {
          classes: {
            include: {
              class: { select: { id: true, name: true } },
            },
            orderBy: { classId: 'asc' },
          },
        },
      });
    });
  }

  async update(id: number, data: { name?: string; schoolName?: string }, actor: TeacherActor) {
    await ensureStudentAccess(this.prisma, actor, id);
    return this.prisma.student.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.schoolName !== undefined ? { schoolName: data.schoolName.trim() } : {}),
      },
    });
  }

  async delete(id: number, actor: TeacherActor, classId?: number) {
    const classIds = await ensureStudentAccess(this.prisma, actor, id);
    if (classId !== undefined) {
      if (!classIds.includes(classId)) {
        return { ok: true, removedClassId: classId, deletedStudent: false };
      }
      await ensureClassAccess(this.prisma, actor, classId);
      await this.prisma.studentClass.delete({
        where: {
          studentId_classId: {
            studentId: id,
            classId,
          },
        },
      });
      const remaining = await this.prisma.studentClass.count({ where: { studentId: id } });
      if (remaining === 0) {
        await this.prisma.student.delete({ where: { id } });
        return { ok: true, removedClassId: classId, deletedStudent: true };
      }
      return { ok: true, removedClassId: classId, deletedStudent: false };
    }
    return this.prisma.student.delete({ where: { id } });
  }

  async getStudentExams(studentId: number) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        classes: { select: { classId: true } },
      },
    });
    if (!student) return [];
    const classIds = student.classes.map((row) => row.classId);
    if (classIds.length === 0) return [];

    const now = new Date();
    const exams = await this.prisma.exam.findMany({
      where: {
        deletedAt: null,
        examClasses: { some: { classId: { in: classIds } } },
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
