import {
  Controller, Get, Post, Put, Delete, Param, Body,
  UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsArray,
  ValidateNested,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

class QuestionItem {
  @IsNotEmpty() @IsString() word1: string;
  @IsNotEmpty() @IsString() word2: string;
}

class CreateQuestionBody {
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() options?: unknown;
  @IsOptional() @IsString() answer?: string;
  @IsOptional() @IsString() word1?: string;
  @IsOptional() @IsString() word2?: string;
  @IsInt() orderNum: number;
  @IsOptional() @IsInt() @Min(1) @Max(1000) maxPoints?: number;
}

class UpdateQuestionBody {
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() options?: unknown;
  @IsOptional() @IsString() answer?: string;
  @IsOptional() @IsString() word1?: string;
  @IsOptional() @IsString() word2?: string;
  @IsOptional() @IsInt() orderNum?: number;
  @IsOptional() @IsInt() @Min(1) @Max(1000) maxPoints?: number;
}

export class BulkCreateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionItem)
  questions: QuestionItem[];
}

export class ReorderDto {
  @IsArray()
  questions: { id: number; orderNum: number }[];
}

@Controller('api/questions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuestionsController {
  constructor(private questionsService: QuestionsService) {}

  @Get('exam/:examId')
  @Roles('teacher', 'admin', 'viewer')
  findByExam(@Param('examId', ParseIntPipe) examId: number) {
    return this.questionsService.findByExam(examId);
  }

  @Post('exam/:examId')
  @Roles('teacher', 'admin')
  create(@Param('examId', ParseIntPipe) examId: number, @Body() dto: CreateQuestionBody) {
    return this.questionsService.create({ examId, ...dto });
  }

  @Post('exam/:examId/bulk')
  @Roles('teacher', 'admin')
  bulkCreate(
    @Param('examId', ParseIntPipe) examId: number,
    @Body() dto: BulkCreateDto,
  ) {
    return this.questionsService.bulkCreate(examId, dto.questions);
  }

  @Put('reorder')
  @Roles('teacher', 'admin')
  reorder(@Body() dto: ReorderDto) {
    return this.questionsService.reorder(dto.questions);
  }

  @Put(':id')
  @Roles('teacher', 'admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateQuestionBody) {
    return this.questionsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('teacher', 'admin')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.questionsService.delete(id);
  }
}
