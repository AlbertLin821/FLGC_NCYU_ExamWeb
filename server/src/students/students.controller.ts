import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
  UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../auth/guards';
import { IsNotEmpty, IsString, IsInt, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class StudentImportItem {
  @IsNotEmpty() @IsString() studentId: string;
  @IsNotEmpty() @IsString() name: string;
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
  @IsInt() classId: number;
}

@Controller('api/students')
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findByClass(
    @Query('classId', ParseIntPipe) classId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.studentsService.findByClass(
      classId,
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.findById(id);
  }

  @Get(':id/exams')
  getStudentExams(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.getStudentExams(id);
  }

  @Post('import')
  @UseGuards(JwtAuthGuard)
  bulkImport(@Body() dto: BulkImportDto) {
    return this.studentsService.bulkImport(dto.students, dto.classId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateStudentDto>) {
    return this.studentsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.delete(id);
  }
}
