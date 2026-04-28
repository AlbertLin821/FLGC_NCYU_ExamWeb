import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ensureClassAccess, ensureStudentAccess, type TeacherActor } from '../auth/access';

@Injectable()
export class StudentsService {
  private cancelledImportSessions = new Set<string>();

  constructor(private prisma: PrismaService) {}

  cancelBulkImport(importSessionId: string) {
    const normalized = String(importSessionId || '').trim();
    if (!normalized) {
      return { ok: false };
    }
    this.cancelledImportSessions.add(normalized);
    setTimeout(() => {
      this.cancelledImportSessions.delete(normalized);
    }, 10 * 60 * 1000);
    return { ok: true };
  }

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
    importSessionId?: string,
  ) {
    await ensureClassAccess(this.prisma, actor, classId);
    const results = { created: 0, updated: 0, errors: [] as string[] };
    const normalizedImportSessionId = String(importSessionId || '').trim();
    const isCancelled = () =>
      normalizedImportSessionId.length > 0 && this.cancelledImportSessions.has(normalizedImportSessionId);
    const throwIfCancelled = () => {
      if (isCancelled()) {
        throw new Error('IMPORT_CANCELLED');
      }
    };

    if (isCancelled()) {
      return { ...results, cancelled: true };
    }
    const dedupedRows = new Map<string, { studentId: string; name: string; schoolName: string }>();
    const duplicateStudentIds = new Set<string>();

    for (const row of students) {
      const data = {
        studentId: String(row.studentId || '').trim(),
        name: String(row.name || '').trim(),
        schoolName: String(row.schoolName || '').trim(),
      };
      if (!data.studentId || !data.name || !data.schoolName) {
        results.errors.push(`${row.studentId || '（空白學號）'}: 校名、學號、姓名不可空白`);
        continue;
      }
      if (dedupedRows.has(data.studentId)) {
        duplicateStudentIds.add(data.studentId);
        continue;
      }
      dedupedRows.set(data.studentId, data);
    }

    if (duplicateStudentIds.size > 0) {
      results.errors.push(
        `重複學號: ${[...duplicateStudentIds].sort((a, b) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' })).join('、')}`,
      );
      return results;
    }

    const validRows = [...dedupedRows.values()];
    if (validRows.length === 0) {
      return results;
    }

    try {
      throwIfCancelled();
      await this.prisma.$transaction(async (tx) => {
        throwIfCancelled();
        const studentIds = validRows.map((row) => row.studentId);
        const existingStudents = await tx.student.findMany({
          where: { studentId: { in: studentIds } },
          select: { id: true, studentId: true, name: true, schoolName: true },
        });
        const existingByStudentId = new Map(
          existingStudents.map((student) => [student.studentId, student] as const),
        );

        const rowsToCreate = validRows.filter((row) => !existingByStudentId.has(row.studentId));
        const rowsToUpdate = validRows.filter((row) => existingByStudentId.has(row.studentId));

        throwIfCancelled();

        if (rowsToCreate.length > 0) {
          await tx.student.createMany({
            data: rowsToCreate,
          });
        }

        const changedRows = rowsToUpdate.filter((row) => {
          const existing = existingByStudentId.get(row.studentId);
          return existing && (existing.name !== row.name || existing.schoolName !== row.schoolName);
        });

        if (changedRows.length > 0) {
          await Promise.all(
            changedRows.map((row) =>
              tx.student.update({
                where: { studentId: row.studentId },
                data: { name: row.name, schoolName: row.schoolName },
              })),
          );
        }

        const allStudents = await tx.student.findMany({
          where: { studentId: { in: studentIds } },
          select: { id: true },
        });

        throwIfCancelled();

        if (allStudents.length > 0) {
          await tx.studentClass.createMany({
            data: allStudents.map((student) => ({
              studentId: student.id,
              classId,
            })),
            skipDuplicates: true,
          });
        }

        results.created += rowsToCreate.length;
        results.updated += rowsToUpdate.length;
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'IMPORT_CANCELLED') {
        return { ...results, cancelled: true };
      }
      const message = err instanceof Error ? err.message : String(err);
      results.errors.push(`批次匯入失敗: ${message}`);
    }

    return isCancelled() ? { ...results, cancelled: true } : results;
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
      instructions: exam.instructions,
      difficulty: exam.difficulty,
      timeLimit: exam.timeLimit,
      questionCount: exam.questions.length,
      startTime: exam.startTime,
      endTime: exam.endTime,
      sessionStatus: exam.sessions[0]?.status || 'not_started',
    }));
  }

  async getStudentExamPreview(studentId: number, examId: number) {
    const exams = await this.getStudentExams(studentId);
    const exam = exams.find((item) => item.id === examId);
    if (!exam) {
      return null;
    }
    return exam;
  }
}
