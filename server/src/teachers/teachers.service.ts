import { Injectable } from '@nestjs/common';
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
    });
  }

  async updatePassword(id: number, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    return this.prisma.teacher.update({
      where: { id },
      data: { passwordHash },
    });
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
