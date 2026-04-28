import {
  Controller, Get, Post, Put, Delete, Param, Body,
  UseGuards, ParseIntPipe, Request,
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
  @Roles('admin', 'viewer')
  findByExam(@Param('examId', ParseIntPipe) examId: number, @Request() req: any) {
    return this.questionsService.findByExam(examId, req.user);
  }

  @Post('exam/:examId')
  @Roles('admin')
  create(@Param('examId', ParseIntPipe) examId: number, @Body() dto: CreateQuestionBody, @Request() req: any) {
    return this.questionsService.create({ examId, ...dto }, req.user);
  }

  @Post('exam/:examId/bulk')
  @Roles('admin')
  bulkCreate(
    @Param('examId', ParseIntPipe) examId: number,
    @Body() dto: BulkCreateDto,
    @Request() req: any,
  ) {
    return this.questionsService.bulkCreate(examId, dto.questions, req.user);
  }

  @Put('reorder')
  @Roles('admin')
  reorder(@Body() dto: ReorderDto, @Request() req: any) {
    return this.questionsService.reorder(dto.questions, req.user);
  }

  @Put(':id')
  @Roles('admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateQuestionBody, @Request() req: any) {
    return this.questionsService.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles('admin')
  delete(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.questionsService.delete(id, req.user);
  }
}
