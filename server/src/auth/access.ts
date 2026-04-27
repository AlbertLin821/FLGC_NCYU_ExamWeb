import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type TeacherActor = {
  id: number;
  role: string;
};

export function isAdminRole(role: string): boolean {
  return role === 'admin';
}

export function isViewerRole(role: string): boolean {
  return role === 'viewer';
}

export function ensureRoleCanGrade(role: string) {
  if (!isAdminRole(role)) {
    throw new ForbiddenException('僅管理端可批改題目');
  }
}

export async function ensureClassAccess(
  prisma: PrismaService,
  actor: TeacherActor,
  classId: number,
): Promise<void> {
  const classRow = await prisma.class.findUnique({
    where: { id: classId },
    select: { id: true },
  });
  if (!classRow) {
    throw new NotFoundException('班級不存在');
  }
  if (isAdminRole(actor.role)) {
    return;
  }
  const membership = await prisma.teacherClass.findUnique({
    where: {
      teacherId_classId: {
        teacherId: actor.id,
        classId,
      },
    },
    select: { teacherId: true },
  });
  if (!membership) {
    throw new ForbiddenException('無權存取此班級');
  }
}

export async function ensureStudentAccess(
  prisma: PrismaService,
  actor: TeacherActor,
  studentId: number,
): Promise<number> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, classId: true },
  });
  if (!student) {
    throw new NotFoundException('學生不存在');
  }
  await ensureClassAccess(prisma, actor, student.classId);
  return student.classId;
}

export async function ensureExamAccess(
  prisma: PrismaService,
  actor: TeacherActor,
  examId: number,
): Promise<void> {
  const exam = await prisma.exam.findFirst({
    where: { id: examId, deletedAt: null },
    select: {
      id: true,
      examClasses: {
        select: { classId: true },
      },
    },
  });
  if (!exam) {
    throw new NotFoundException('考卷不存在或已移除');
  }
  if (isAdminRole(actor.role)) {
    return;
  }
  const classIds = exam.examClasses.map((row) => row.classId);
  if (classIds.length === 0) {
    throw new ForbiddenException('此考卷尚未分配班級');
  }
  const membership = await prisma.teacherClass.findFirst({
    where: {
      teacherId: actor.id,
      classId: { in: classIds },
    },
    select: { teacherId: true },
  });
  if (!membership) {
    throw new ForbiddenException('無權存取此考卷');
  }
}

export async function ensureQuestionAccess(
  prisma: PrismaService,
  actor: TeacherActor,
  questionId: number,
): Promise<number> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, examId: true },
  });
  if (!question) {
    throw new NotFoundException('題目不存在');
  }
  await ensureExamAccess(prisma, actor, question.examId);
  return question.examId;
}
