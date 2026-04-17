import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  async findByExam(examId: number) {
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
  }) {
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
  }) {
    return this.prisma.question.update({ where: { id }, data });
  }

  async delete(id: number) {
    return this.prisma.question.delete({ where: { id } });
  }

  async bulkCreate(examId: number, questions: { word1?: string; word2?: string; [key: string]: any }[]) {
    const data = questions.map((q, i) => ({
      examId,
      ...q,
      orderNum: i + 1,
    }));
    return this.prisma.question.createMany({ data });
  }

  async reorder(questions: { id: number; orderNum: number }[]) {
    const updates = questions.map((q) =>
      this.prisma.question.update({
        where: { id: q.id },
        data: { orderNum: q.orderNum },
      }),
    );
    return this.prisma.$transaction(updates);
  }
}
