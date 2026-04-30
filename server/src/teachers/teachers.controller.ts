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
  IsIn,
  IsNotEmpty,
  IsString,
  IsOptional,
  MinLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { ForceDeleteTarget } from './teachers.service';

export class UpdatePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: '密碼至少須 8 個字元' })
  password: string;
}

export class UpdateOwnPasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: '密碼至少須 8 個字元' })
  newPassword: string;
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

export class ForceDeleteDto {
  @IsString()
  @IsIn(['classes', 'students', 'exams', 'teachers', 'all'])
  target: ForceDeleteTarget;
}

export class BulkImportTeacherRowDto {
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
  @IsIn(['teacher', 'admin', 'viewer'])
  role?: string;
}

export class BulkImportTeachersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkImportTeacherRowDto)
  teachers: BulkImportTeacherRowDto[];
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

  @Post('import')
  @Roles('admin')
  bulkImport(@Body() dto: BulkImportTeachersDto) {
    return this.teachersService.bulkImport(dto.teachers);
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

  @Patch('me/password')
  @Roles('teacher', 'admin', 'viewer')
  updateOwnPassword(@Request() req: { user: { id: number } }, @Body() dto: UpdateOwnPasswordDto) {
    return this.teachersService.updateOwnPassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword,
    );
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

  @Post('force-delete')
  @Roles('admin')
  forceDelete(@Request() req: { user: { id: number } }, @Body() dto: ForceDeleteDto) {
    return this.teachersService.forceDeleteSystemData(req.user.id, dto.target);
  }
}
