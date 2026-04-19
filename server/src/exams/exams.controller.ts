import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
  UseGuards, Request, ParseIntPipe,
} from '@nestjs/common';
import { ExamsService } from './exams.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { IsNotEmpty, IsString, IsOptional, IsInt, IsDateString, IsArray, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExamDto {
  @IsNotEmpty() @IsString() title: string;
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Type(() => Number)
  classIds: number[];
  @IsOptional() @IsString() difficulty?: string;
  @IsInt() timeLimit: number;
  @IsDateString() startTime: string;
  @IsDateString() endTime: string;
}

export class UpdateExamDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsArray() @ArrayMinSize(1) @IsInt({ each: true }) @Type(() => Number) classIds?: number[];
  @IsOptional() @IsString() difficulty?: string;
  @IsOptional() @IsInt() timeLimit?: number;
  @IsOptional() @IsDateString() startTime?: string;
  @IsOptional() @IsDateString() endTime?: string;
  @IsOptional() @IsString() status?: string;
}

export class SubmitAnswerDto {
  @IsInt() questionId: number;
  @IsNotEmpty() @IsString() content: string;
}

@Controller('api/exams')
export class ExamsController {
  constructor(private examsService: ExamsService) {}

  // === Teacher endpoints（須為教師／管理員 JWT）===
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin', 'viewer')
  findAll(
    @Query('classId') classId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.examsService.findAll(
      classId ? parseInt(classId) : undefined,
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
    );
  }

  /** 須置於 :id 之前，避免 results 被當成數字 id */
  @Get('results/:classId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin', 'viewer')
  getResults(
    @Param('classId', ParseIntPipe) classId: number,
    @Query('examId') examId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.examsService.getResults(
      classId,
      examId ? parseInt(examId) : undefined,
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin', 'viewer')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.examsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  create(@Body() dto: CreateExamDto, @Request() req: any) {
    return this.examsService.create({ ...dto, createdBy: req.user.id });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateExamDto) {
    return this.examsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.examsService.delete(id);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher', 'admin')
  publish(@Param('id', ParseIntPipe) id: number) {
    return this.examsService.publish(id);
  }

  // === Student endpoints（維持無 JWT，由班級／學號流程驗證）===
  @Post(':id/start')
  startExam(@Param('id', ParseIntPipe) examId: number, @Body('studentId') studentId: number) {
    return this.examsService.startSession(studentId, examId);
  }

  @Post('sessions/:sessionId/answer')
  submitAnswer(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.examsService.submitAnswer(sessionId, dto.questionId, dto.content);
  }

  @Post('sessions/:sessionId/submit')
  submitExam(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.examsService.submitExam(sessionId);
  }
}
