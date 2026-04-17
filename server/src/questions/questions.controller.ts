import {
  Controller, Get, Post, Put, Delete, Param, Body,
  UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { JwtAuthGuard } from '../auth/guards';
import { IsNotEmpty, IsString, IsInt, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class QuestionItem {
  @IsNotEmpty() @IsString() word1: string;
  @IsNotEmpty() @IsString() word2: string;
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
@UseGuards(JwtAuthGuard)
export class QuestionsController {
  constructor(private questionsService: QuestionsService) {}

  @Get('exam/:examId')
  findByExam(@Param('examId', ParseIntPipe) examId: number) {
    return this.questionsService.findByExam(examId);
  }

  @Post('exam/:examId')
  create(
    @Param('examId', ParseIntPipe) examId: number,
    @Body() dto: QuestionItem & { orderNum: number },
  ) {
    return this.questionsService.create({ examId, ...dto });
  }

  @Post('exam/:examId/bulk')
  bulkCreate(
    @Param('examId', ParseIntPipe) examId: number,
    @Body() dto: BulkCreateDto,
  ) {
    return this.questionsService.bulkCreate(examId, dto.questions);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<QuestionItem>) {
    return this.questionsService.update(id, dto);
  }

  @Put('reorder')
  reorder(@Body() dto: ReorderDto) {
    return this.questionsService.reorder(dto.questions);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.questionsService.delete(id);
  }
}
