import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ensureClassAccess, isAdminRole, type TeacherActor } from '../auth/access';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  private async deleteOrphanStudents(tx: PrismaService | Prisma.TransactionClient, candidateStudentIds: number[]) {
    if (candidateStudentIds.length === 0) {
      return 0;
    }
    const uniqueStudentIds = [...new Set(candidateStudentIds)];
    const remainingClassCounts = await tx.studentClass.groupBy({
      by: ['studentId'],
      where: { studentId: { in: uniqueStudentIds } },
      _count: { studentId: true },
    });
    const studentsStillAssigned = new Set(remainingClassCounts.map((row) => row.studentId));
    const orphanStudentIds = uniqueStudentIds.filter((studentId) => !studentsStillAssigned.has(studentId));
    if (orphanStudentIds.length === 0) {
      return 0;
    }
    const deleted = await tx.student.deleteMany({
      where: { id: { in: orphanStudentIds } },
    });
    return deleted.count;
  }

  async findAll(actor: TeacherActor, page?: number, limit?: number) {
    const where = isAdminRole(actor.role) ? {} : { teachers: { some: { teacherId: actor.id } } };
    const include = {
      _count: { select: { students: true } },
      teachers: {
        include: { teacher: { select: { id: true, name: true, email: true } } },
      },
    };

    if (page === undefined && limit === undefined) {
      return this.prisma.class.findMany({ where, include });
    }

    const p = page || 1;
    const l = limit || 20;
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
      this.prisma.class.findMany({
        where,
        include,
        skip,
        take: l,
      }),
      this.prisma.class.count({ where }),
    ]);

    return { items, total, page: p, limit: l, totalPages: Math.ceil(total / l) };
  }

  async findById(id: number, actor: TeacherActor) {
    await ensureClassAccess(this.prisma, actor, id);
    return this.prisma.class.findUnique({
      where: { id },
      include: {
        students: {
          include: {
            student: true,
          },
        },
        _count: { select: { students: true } },
      },
    });
  }

  async create(data: { name: string; description?: string }, teacherId: number) {
    return this.prisma.class.create({
      data: {
        name: data.name,
        description: data.description,
        createdBy: teacherId,
        teachers: {
          create: { teacherId, role: 'owner' },
        },
      },
    });
  }

  async update(id: number, data: { name?: string; description?: string }, actor: TeacherActor) {
    await ensureClassAccess(this.prisma, actor, id);
    return this.prisma.class.update({ where: { id }, data });
  }

  async delete(id: number, actor: TeacherActor, deleteStudents = true) {
    await ensureClassAccess(this.prisma, actor, id);
    return this.prisma.$transaction(async (tx) => {
      const linkedStudents = await tx.studentClass.findMany({
        where: { classId: id },
        select: { studentId: true },
      });
      const deletedClass = await tx.class.delete({ where: { id } });
      const deletedStudentCount = deleteStudents
        ? await this.deleteOrphanStudents(tx, linkedStudents.map((row) => row.studentId))
        : 0;
      return {
        deletedClass,
        deletedStudentCount,
      };
    });
  }

  async clearStudents(id: number, actor: TeacherActor, deleteStudentRecords = true) {
    await ensureClassAccess(this.prisma, actor, id);
    return this.prisma.$transaction(async (tx) => {
      const linkedStudents = await tx.studentClass.findMany({
        where: { classId: id },
        select: { studentId: true },
      });
      const removedMemberships = await tx.studentClass.deleteMany({
        where: { classId: id },
      });
      const deletedStudentCount = deleteStudentRecords
        ? await this.deleteOrphanStudents(tx, linkedStudents.map((row) => row.studentId))
        : 0;
      return {
        removedMemberships: removedMemberships.count,
        deletedStudentCount,
      };
    });
  }

  async addTeacher(classId: number, teacherId: number, actor: TeacherActor) {
    await ensureClassAccess(this.prisma, actor, classId);
    return this.prisma.teacherClass.create({
      data: { classId, teacherId, role: 'member' },
    });
  }

  async removeTeacher(classId: number, teacherId: number, actor: TeacherActor) {
    await ensureClassAccess(this.prisma, actor, classId);
    return this.prisma.teacherClass.delete({
      where: { teacherId_classId: { teacherId, classId } },
    });
  }

  async getClassStats(classId: number, actor: TeacherActor) {
    await ensureClassAccess(this.prisma, actor, classId);
    const aggregate = await this.prisma.answer.aggregate({
      where: {
        session: { exam: { examClasses: { some: { classId } } } },
        aiScore: { not: null },
      },
      _avg: { aiScore: true },
      _max: { aiScore: true },
      _count: { aiScore: true },
    });

    return {
      average: Math.round(Number(aggregate._avg.aiScore || 0) * 100) / 100,
      max: Number(aggregate._max.aiScore || 0),
      totalAnswered: aggregate._count.aiScore,
    };
  }
}
