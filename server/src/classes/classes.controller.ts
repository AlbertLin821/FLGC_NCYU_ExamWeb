import {
  Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request, ParseIntPipe, Query,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { JwtAuthGuard } from '../auth/guards';
import { IsNotEmpty, IsString, IsOptional, IsInt } from 'class-validator';

export class CreateClassDto {
  @IsNotEmpty() @IsString() name: string;
  @IsOptional() @IsString() description?: string;
}

export class AddTeacherDto {
  @IsInt() teacherId: number;
}

@Controller('api/classes')
@UseGuards(JwtAuthGuard)
export class ClassesController {
  constructor(private classesService: ClassesService) {}

  @Get()
  findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.classesService.findAll(
      req.user.id,
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.classesService.findById(id);
  }

  @Get(':id/stats')
  getStats(@Param('id', ParseIntPipe) id: number) {
    return this.classesService.getClassStats(id);
  }

  @Post()
  create(@Body() dto: CreateClassDto, @Request() req: any) {
    return this.classesService.create(dto, req.user.id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateClassDto) {
    return this.classesService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.classesService.delete(id);
  }

  @Post(':id/teachers')
  addTeacher(@Param('id', ParseIntPipe) id: number, @Body() dto: AddTeacherDto) {
    return this.classesService.addTeacher(id, dto.teacherId);
  }

  @Delete(':id/teachers/:teacherId')
  removeTeacher(
    @Param('id', ParseIntPipe) id: number,
    @Param('teacherId', ParseIntPipe) teacherId: number,
  ) {
    return this.classesService.removeTeacher(id, teacherId);
  }
}
