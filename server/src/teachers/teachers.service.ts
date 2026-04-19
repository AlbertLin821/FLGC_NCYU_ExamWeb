import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

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
    const passwordHash = await bcrypt.hash(data.password, 12);
    return this.prisma.teacher.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: data.role || 'teacher',
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
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

    const examCount = await this.prisma.exam.count({ where: { createdBy: targetId } });
    if (examCount > 0) {
      throw new ConflictException(
        `此帳號為 ${examCount} 份考卷的建立者，請先刪除或處理相關考卷後再刪除帳號`,
      );
    }

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
}
