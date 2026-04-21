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
  @Roles('teacher', 'admin', 'viewer')
  list(
    @Request() req: { user: { role: string } },
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
    return this.studentsService.findByClass(classId, p, l);
  }

  /** 須置於 :id 之前，否則 :id 會先匹配 */
  @Get(':id/exams')
  getStudentExams(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.getStudentExams(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin', 'viewer')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.findById(id);
  }

  @Post('import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  bulkImport(@Body() dto: BulkImportDto) {
    return this.studentsService.bulkImport(dto.students, dto.classId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  create(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateStudentDto>) {
    return this.studentsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.delete(id);
  }
}
