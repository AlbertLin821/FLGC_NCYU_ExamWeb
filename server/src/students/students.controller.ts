import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  Request,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { IsNotEmpty, IsString, IsInt, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class StudentImportItem {
  @IsNotEmpty() @IsString() studentId: string;
  @IsNotEmpty() @IsString() name: string;
  @IsNotEmpty() @IsString() schoolName: string;
}

export class BulkImportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentImportItem)
  students: StudentImportItem[];

  @IsInt()
  classId: number;
}

export class CreateStudentDto {
  @IsNotEmpty() @IsString() studentId: string;
  @IsNotEmpty() @IsString() name: string;
  @IsNotEmpty() @IsString() schoolName: string;
  @IsInt() classId: number;
}

@Controller('api/students')
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'viewer')
  list(
    @Request() req: { user: { id: number; role: string } },
    @Query('classId') classIdStr: string | undefined,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : undefined;
    const l = limit ? parseInt(limit, 10) : undefined;
    if (classIdStr === undefined || classIdStr === '') {
      if (req.user.role !== 'admin') {
        throw new ForbiddenException('僅管理員可查詢全校學生');
      }
      return this.studentsService.findAllPaginated(p, l);
    }
    const classId = parseInt(classIdStr, 10);
    if (Number.isNaN(classId)) {
      throw new BadRequestException('classId 無效');
    }
    return this.studentsService.findByClass(classId, req.user, p, l);
  }

  /** 須置於 :id 之前，否則 :id 會先匹配 */
  @Get(':id/exams')
  getStudentExams(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.getStudentExams(id);
  }

  @Get(':id/exams/:examId')
  getStudentExamPreview(
    @Param('id', ParseIntPipe) id: number,
    @Param('examId', ParseIntPipe) examId: number,
  ) {
    return this.studentsService.getStudentExamPreview(id, examId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'viewer')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.studentsService.findById(id, req.user);
  }

  @Post('import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  bulkImport(@Body() dto: BulkImportDto, @Request() req: any) {
    return this.studentsService.bulkImport(dto.students, dto.classId, req.user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateStudentDto, @Request() req: any) {
    return this.studentsService.create(dto, req.user);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateStudentDto>, @Request() req: any) {
    return this.studentsService.update(id, dto, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  delete(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Query('classId') classId?: string,
  ) {
    return this.studentsService.delete(
      id,
      req.user,
      classId && classId !== '' ? parseInt(classId, 10) : undefined,
    );
  }
}
