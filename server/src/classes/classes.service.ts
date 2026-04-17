import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async findAll(teacherId: number, page?: number, limit?: number) {
    const where = { teachers: { some: { teacherId } } };
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

  async findById(id: number) {
    return this.prisma.class.findUnique({
      where: { id },
      include: {
        students: true,
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

  async update(id: number, data: { name?: string; description?: string }) {
    return this.prisma.class.update({ where: { id }, data });
  }

  async delete(id: number) {
    return this.prisma.class.delete({ where: { id } });
  }

  async addTeacher(classId: number, teacherId: number) {
    return this.prisma.teacherClass.create({
      data: { classId, teacherId, role: 'member' },
    });
  }

  async removeTeacher(classId: number, teacherId: number) {
    return this.prisma.teacherClass.delete({
      where: { teacherId_classId: { teacherId, classId } },
    });
  }

  async getClassStats(classId: number) {
    const aggregate = await this.prisma.answer.aggregate({
      where: {
        session: { exam: { classId } },
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
