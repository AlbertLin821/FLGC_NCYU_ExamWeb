import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class TeacherLoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}

export class StudentLoginDto {
  @IsNotEmpty()
  @IsString()
  studentId: string;
}

export class RequestResetDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsNotEmpty()
  @IsString()
  newPassword: string;
}

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async teacherLogin(@Body() dto: TeacherLoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('student/verify')
  async studentVerify(@Body() dto: StudentLoginDto) {
    const student = await this.authService.validateStudent(dto.studentId);
    return {
      student: {
        id: student.id,
        studentId: student.studentId,
        name: student.name,
        schoolName: student.schoolName,
        classId: student.classId,
        className: student.class.name,
      },
    };
  }

  @Post('request-reset')
  async requestReset(@Body() dto: RequestResetDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }
}
