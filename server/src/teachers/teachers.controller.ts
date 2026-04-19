import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  MinLength,
} from 'class-validator';

export class UpdatePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: '密碼至少須 8 個字元' })
  password: string;
}

export class CreateTeacherDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: '密碼至少須 8 個字元' })
  password: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  role?: string;
}

@Controller('api/teachers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeachersController {
  constructor(private teachersService: TeachersService) {}

  @Get('me')
  @Roles('teacher', 'admin', 'viewer')
  getProfile(@Request() req: any) {
    return this.teachersService.findById(req.user.id);
  }

  @Get()
  @Roles('admin')
  findAll() {
    return this.teachersService.findAll();
  }

  @Post()
  @Roles('admin')
  create(@Body() dto: CreateTeacherDto) {
    return this.teachersService.create(dto);
  }

  @Patch(':id/password')
  @Roles('admin')
  updatePassword(@Param('id') id: string, @Body() dto: UpdatePasswordDto) {
    const tid = Number.parseInt(id, 10);
    if (!Number.isFinite(tid) || tid < 1) {
      throw new BadRequestException('無效的教師編號');
    }
    return this.teachersService.updatePassword(tid, dto.password);
  }

  @Post('invite')
  @Roles('admin')
  invite(@Body('email') email: string) {
    return this.teachersService.inviteTeacher(email);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Request() req: { user: { id: number } }, @Param('id') id: string) {
    return this.teachersService.deleteTeacher(req.user.id, +id);
  }
}
