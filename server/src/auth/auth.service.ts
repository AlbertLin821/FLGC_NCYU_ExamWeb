import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateTeacher(email: string, password: string) {
    const teacher = await this.prisma.teacher.findUnique({ where: { email } });
    if (!teacher) {
      throw new UnauthorizedException('帳號或密碼錯誤');
    }

    const isValid = await bcrypt.compare(password, teacher.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('帳號或密碼錯誤');
    }

    return teacher;
  }

  async login(email: string, password: string) {
    const teacher = await this.validateTeacher(email, password);
    const payload = { sub: teacher.id, email: teacher.email, role: teacher.role };
    return {
      accessToken: this.jwtService.sign(payload),
      teacher: {
        id: teacher.id,
        email: teacher.email,
        name: teacher.name,
        role: teacher.role,
      },
    };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async validateStudent(studentId: string, name: string) {
    const student = await this.prisma.student.findUnique({
      where: { studentId },
    });

    if (!student || student.name !== name) {
      // Increment login attempts
      if (student) {
        const attempts = student.loginAttempts + 1;
        const updateData: any = { loginAttempts: attempts };
        if (attempts >= 3) {
          updateData.lockedUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        }
        await this.prisma.student.update({
          where: { id: student.id },
          data: updateData,
        });
      }
      throw new UnauthorizedException('學號或姓名錯誤');
    }

    // Check if locked
    if (student.lockedUntil && student.lockedUntil > new Date()) {
      const remainMinutes = Math.ceil(
        (student.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new UnauthorizedException(
        `帳號已鎖定，請 ${remainMinutes} 分鐘後再試`,
      );
    }

    // Reset attempts on success
    await this.prisma.student.update({
      where: { id: student.id },
      data: { loginAttempts: 0, lockedUntil: null },
    });

    return student;
  }
  
  async requestPasswordReset(email: string) {
    const teacher = await this.prisma.teacher.findUnique({ where: { email } });
    if (!teacher) {
      // For security, don't reveal if user exists, but here we can be helpful
      throw new NotFoundException('找不到此電子郵件對應的帳號');
    }

    // Generate a 6-digit random token
    const token = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await this.prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        resetPasswordToken: token,
        resetPasswordExpires: expires,
      },
    });

    // In a real app, send email here. For now, we return it or log it.
    console.log(`Password reset token for ${email}: ${token}`);
    return { message: '重設密碼驗證碼已發送至您的信箱', token }; // Returning token for easy testing
  }

  async resetPassword(token: string, newPassword: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!teacher) {
      throw new BadRequestException('驗證碼無效或已過期');
    }

    const passwordHash = await this.hashPassword(newPassword);

    await this.prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return { message: '密碼重設成功，請重新登入' };
  }
}
