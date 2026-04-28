import {
  Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request, ParseIntPipe, Query,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { IsNotEmpty, IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';

export class CreateClassDto {
  @IsNotEmpty() @IsString() name: string;
  @IsOptional() @IsString() description?: string;
}

export class AddTeacherDto {
  @IsInt() teacherId: number;
}

export class ClearStudentsDto {
  @IsOptional()
  @IsBoolean()
  deleteStudentRecords?: boolean;
}

@Controller('api/classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
  constructor(private classesService: ClassesService) {}

  @Get()
  @Roles('admin', 'viewer')
  findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.classesService.findAll(
      req.user,
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
    );
  }

  @Get(':id')
  @Roles('admin', 'viewer')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.classesService.findById(id, req.user);
  }

  @Get(':id/stats')
  @Roles('admin', 'viewer')
  getStats(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.classesService.getClassStats(id, req.user);
  }

  @Post()
  @Roles('admin')
  create(@Body() dto: CreateClassDto, @Request() req: any) {
    return this.classesService.create(dto, req.user.id);
  }

  @Put(':id')
  @Roles('admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateClassDto, @Request() req: any) {
    return this.classesService.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles('admin')
  delete(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Query('deleteStudents') deleteStudents?: string,
  ) {
    return this.classesService.delete(id, req.user, deleteStudents === 'true');
  }

  @Post(':id/clear-students')
  @Roles('admin')
  clearStudents(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ClearStudentsDto,
    @Request() req: any,
  ) {
    return this.classesService.clearStudents(id, req.user, dto.deleteStudentRecords !== false);
  }

  @Post(':id/teachers')
  @Roles('admin')
  addTeacher(@Param('id', ParseIntPipe) id: number, @Body() dto: AddTeacherDto, @Request() req: any) {
    return this.classesService.addTeacher(id, dto.teacherId, req.user);
  }

  @Delete(':id/teachers/:teacherId')
  @Roles('admin')
  removeTeacher(
    @Param('id', ParseIntPipe) id: number,
    @Param('teacherId', ParseIntPipe) teacherId: number,
    @Request() req: any,
  ) {
    return this.classesService.removeTeacher(id, teacherId, req.user);
  }
}
