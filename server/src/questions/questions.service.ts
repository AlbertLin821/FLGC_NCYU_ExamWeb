import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ensureExamAccess, ensureQuestionAccess, type TeacherActor } from '../auth/access';

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  async findByExam(examId: number, actor: TeacherActor) {
    await ensureExamAccess(this.prisma, actor, examId);
    return this.prisma.question.findMany({
      where: { examId },
      orderBy: { orderNum: 'asc' },
    });
  }

  async create(data: {
    examId: number;
    type?: string;
    content?: string;
    options?: any;
    answer?: string;
    word1?: string;
    word2?: string;
    orderNum: number;
    maxPoints?: number;
  }, actor: TeacherActor) {
    await ensureExamAccess(this.prisma, actor, data.examId);
    return this.prisma.question.create({ data });
  }

  async update(id: number, data: {
    type?: string;
    content?: string;
    options?: any;
    answer?: string;
    word1?: string;
    word2?: string;
    orderNum?: number;
    maxPoints?: number;
  }, actor: TeacherActor) {
    await ensureQuestionAccess(this.prisma, actor, id);
    return this.prisma.question.update({ where: { id }, data });
  }

  async delete(id: number, actor: TeacherActor) {
    await ensureQuestionAccess(this.prisma, actor, id);
    return this.prisma.question.delete({ where: { id } });
  }

  async bulkCreate(
    examId: number,
    questions: { word1?: string; word2?: string; [key: string]: any }[],
    actor: TeacherActor,
  ) {
    await ensureExamAccess(this.prisma, actor, examId);
    const data = questions.map((q, i) => ({
      examId,
      ...q,
      orderNum: i + 1,
    }));
    return this.prisma.question.createMany({ data });
  }

  async reorder(questions: { id: number; orderNum: number }[], actor: TeacherActor) {
    for (const q of questions) {
      await ensureQuestionAccess(this.prisma, actor, q.id);
    }
    const updates = questions.map((q) =>
      this.prisma.question.update({
        where: { id: q.id },
        data: { orderNum: q.orderNum },
      }),
    );
    return this.prisma.$transaction(updates);
  }
}
