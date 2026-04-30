import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

const FORCE_DELETE_EMAIL = 'albertlin94821@gmail.com';
const FORCE_DELETE_NAME = 'Albert Lin';

export type ForceDeleteTarget = 'classes' | 'students' | 'exams' | 'teachers' | 'all';
export type BulkImportTeacherRow = {
  email: string;
  password: string;
  name: string;
  role?: string;
};

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.teacher.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }

  async findById(id: number) {
    return this.prisma.teacher.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.teacher.findUnique({ where: { email } });
  }

  async create(data: any) {
    const email = String(data.email || '').trim().toLowerCase();
    const name = String(data.name || '').trim();
    const password = String(data.password || '').trim();
    const role = String(data.role || 'teacher').trim();

    if (!email || !name || !password) {
      throw new BadRequestException('電子郵件、姓名與密碼不可空白');
    }
    if (!['teacher', 'admin', 'viewer'].includes(role)) {
      throw new BadRequestException('角色無效');
    }
    if (password.length < 8) {
      throw new BadRequestException('密碼至少須 8 個字元');
    }

    const existing = await this.prisma.teacher.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('此電子郵件已被使用');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    return this.prisma.teacher.create({
      data: {
        email,
        name,
        passwordHash,
        role,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }

  async bulkImport(rows: BulkImportTeacherRow[]) {
    const results = { created: 0, updated: 0, errors: [] as string[] };
    const dedupedRows = new Map<string, BulkImportTeacherRow>();
    const duplicateEmails = new Set<string>();

    for (const row of rows) {
      const email = String(row.email || '').trim().toLowerCase();
      const name = String(row.name || '').trim();
      const password = String(row.password || '').trim();
      const role = String(row.role || 'teacher').trim().toLowerCase();

      if (!email || !name || !password) {
        results.errors.push(`${row.email || '（空白電子郵件）'}: 電子郵件、姓名與密碼不可空白`);
        continue;
      }
      if (!['teacher', 'admin', 'viewer'].includes(role)) {
        results.errors.push(`${email}: 角色無效（僅允許 teacher/admin/viewer）`);
        continue;
      }
      if (password.length < 8) {
        results.errors.push(`${email}: 密碼至少須 8 個字元`);
        continue;
      }
      if (dedupedRows.has(email)) {
        duplicateEmails.add(email);
        continue;
      }
      dedupedRows.set(email, { email, name, password, role });
    }

    if (duplicateEmails.size > 0) {
      results.errors.push(`重複電子郵件: ${[...duplicateEmails].sort().join('、')}`);
      return results;
    }

    const validRows = [...dedupedRows.values()];
    if (validRows.length === 0) {
      return results;
    }

    const existingTeachers = await this.prisma.teacher.findMany({
      where: { email: { in: validRows.map((row) => row.email) } },
      select: { id: true, email: true, name: true, role: true },
    });
    const existingByEmail = new Map(existingTeachers.map((teacher) => [teacher.email, teacher] as const));

    for (const row of validRows) {
      const passwordHash = await bcrypt.hash(row.password, 12);
      const existing = existingByEmail.get(row.email);
      if (existing) {
        await this.prisma.teacher.update({
          where: { id: existing.id },
          data: {
            name: row.name,
            role: row.role || 'teacher',
            passwordHash,
          },
        });
        results.updated += 1;
      } else {
        await this.prisma.teacher.create({
          data: {
            email: row.email,
            name: row.name,
            role: row.role || 'teacher',
            passwordHash,
          },
        });
        results.created += 1;
      }
    }

    return results;
  }

  async updatePassword(id: number, newPassword: string) {
    const trimmed = typeof newPassword === 'string' ? newPassword.trim() : '';
    if (trimmed.length === 0) {
      throw new BadRequestException('密碼不可為空白');
    }
    if (trimmed.length < 8) {
      throw new BadRequestException('密碼至少須 8 個字元');
    }

    const exists = await this.prisma.teacher.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('找不到此教師帳號');
    }

    const passwordHash = await bcrypt.hash(trimmed, 12);
    return this.prisma.teacher.update({
      where: { id },
      data: { passwordHash },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }

  async updateOwnPassword(id: number, currentPassword: string, newPassword: string) {
    const current = typeof currentPassword === 'string' ? currentPassword : '';
    const next = typeof newPassword === 'string' ? newPassword.trim() : '';
    if (next.length < 8) {
      throw new BadRequestException('密碼至少須 8 個字元');
    }

    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      select: { id: true, passwordHash: true },
    });
    if (!teacher) {
      throw new NotFoundException('找不到此教師帳號');
    }

    const valid = await bcrypt.compare(current, teacher.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('目前密碼錯誤');
    }

    const passwordHash = await bcrypt.hash(next, 12);
    await this.prisma.teacher.update({
      where: { id },
      data: { passwordHash },
    });
    return { ok: true };
  }

  /**
   * 管理員刪除教師（含其他管理員）。不可刪除自己；至少保留一位管理員；
   * 若為班級／考卷建立者則不可刪（須先處理關聯資料）。
   */
  async deleteTeacher(actorId: number, targetId: number) {
    if (actorId === targetId) {
      throw new BadRequestException('不可刪除目前登入中的帳號');
    }

    const target = await this.prisma.teacher.findUnique({ where: { id: targetId } });
    if (!target) {
      throw new NotFoundException('找不到此教師帳號');
    }

    if (target.role === 'admin') {
      const adminCount = await this.prisma.teacher.count({ where: { role: 'admin' } });
      if (adminCount <= 1) {
        throw new ConflictException('系統至少需保留一位管理員');
      }
    }

    const classCount = await this.prisma.class.count({ where: { createdBy: targetId } });
    if (classCount > 0) {
      throw new ConflictException(
        `此帳號為 ${classCount} 個班級的建立者，請先刪除相關班級或改由其他教師建立後再刪除帳號`,
      );
    }

    const examCount = await this.prisma.exam.count({
      where: {
        createdBy: targetId,
        deletedAt: null,
      },
    });
    if (examCount > 0) {
      throw new ConflictException(
        `此帳號為 ${examCount} 份考卷的建立者，請先刪除或處理相關考卷後再刪除帳號`,
      );
    }

    // 已軟刪除的考卷仍保留外鍵到建立者；刪除帳號前改掛到目前操作的管理者。
    await this.prisma.exam.updateMany({
      where: {
        createdBy: targetId,
        deletedAt: { not: null },
      },
      data: { createdBy: actorId },
    });

    await this.prisma.cheatLog.updateMany({
      where: { resolvedBy: targetId },
      data: { resolvedBy: null },
    });

    await this.prisma.teacher.delete({ where: { id: targetId } });
    return { ok: true, id: targetId };
  }

  async inviteTeacher(email: string) {
    const token = Math.random().toString(36).substring(2, 15);
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);

    await this.prisma.teacher.upsert({
      where: { email },
      update: {
        inviteToken: token,
        inviteExpires: expires,
      },
      create: {
        email,
        passwordHash: '',
        name: 'Pending Teacher',
        role: 'teacher',
        inviteToken: token,
        inviteExpires: expires,
      },
    });

    console.log(`[INVITE] Teacher invited: ${email}. Token: ${token}`);
    return { email, token, expires };
  }

  async verifyInvite(email: string, token: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { email },
    });

    if (!teacher || teacher.inviteToken !== token || !teacher.inviteExpires || teacher.inviteExpires < new Date()) {
      return null;
    }

    await this.prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        inviteToken: null,
        inviteExpires: null,
      },
    });

    return teacher;
  }

  private async ensureForceDeleteActor(actorId: number) {
    const actor = await this.prisma.teacher.findUnique({
      where: { id: actorId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (
      !actor ||
      actor.role !== 'admin' ||
      actor.email !== FORCE_DELETE_EMAIL ||
      actor.name !== FORCE_DELETE_NAME
    ) {
      throw new ForbiddenException('只有指定管理員可執行強制清除');
    }

    return actor;
  }

  private async forceDeleteClasses(tx: Prisma.TransactionClient) {
    const count = await tx.class.count();
    await tx.class.deleteMany({});
    return count;
  }

  private async forceDeleteStudents(tx: Prisma.TransactionClient) {
    const count = await tx.student.count();
    await tx.student.deleteMany({});
    return count;
  }

  private async forceDeleteExams(tx: Prisma.TransactionClient) {
    const count = await tx.exam.count();
    await tx.exam.deleteMany({});
    return count;
  }

  private async forceDeleteTeachers(tx: Prisma.TransactionClient, actorId: number) {
    const doomedTeachers = await tx.teacher.findMany({
      where: { id: { not: actorId } },
      select: { id: true },
    });
    const doomedTeacherIds = doomedTeachers.map((teacher) => teacher.id);

    if (doomedTeacherIds.length === 0) {
      return 0;
    }

    await tx.class.updateMany({
      where: { createdBy: { in: doomedTeacherIds } },
      data: { createdBy: actorId },
    });

    await tx.exam.updateMany({
      where: { createdBy: { in: doomedTeacherIds } },
      data: { createdBy: actorId },
    });

    await tx.cheatLog.updateMany({
      where: { resolvedBy: { in: doomedTeacherIds } },
      data: { resolvedBy: null },
    });

    const result = await tx.teacher.deleteMany({
      where: { id: { in: doomedTeacherIds } },
    });

    return result.count;
  }

  async forceDeleteSystemData(actorId: number, target: ForceDeleteTarget) {
    const actor = await this.ensureForceDeleteActor(actorId);

    return this.prisma.$transaction(async (tx) => {
      const deleted = {
        classes: 0,
        students: 0,
        exams: 0,
        teachers: 0,
      };

      if (target === 'classes' || target === 'all') {
        deleted.classes = await this.forceDeleteClasses(tx);
      }

      if (target === 'students' || target === 'all') {
        deleted.students = await this.forceDeleteStudents(tx);
      }

      if (target === 'exams' || target === 'all') {
        deleted.exams = await this.forceDeleteExams(tx);
      }

      if (target === 'teachers' || target === 'all') {
        deleted.teachers = await this.forceDeleteTeachers(tx, actor.id);
      }

      return {
        ok: true,
        target,
        actor: {
          id: actor.id,
          email: actor.email,
          name: actor.name,
        },
        deleted,
      };
    });
  }
}
