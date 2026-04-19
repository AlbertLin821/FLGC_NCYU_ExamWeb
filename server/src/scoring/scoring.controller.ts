import {
  BadRequestException,
  Body,
  Controller,
  Patch,
  Param,
  Post,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';

@Controller('api/scoring')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('teacher', 'admin')
export class ScoringController {
  constructor(private scoringService: ScoringService) {}

  @Post('session/:sessionId')
  scoreSession(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.scoringService.scoreSession(sessionId);
  }

  /** 教師端：對該班已交卷 session 逐人集體 AI 批閱問答题（單次 Prompt） */
  @Post('exams/:examId/batch-essay-grade')
  batchEssayGrade(
    @Param('examId', ParseIntPipe) examId: number,
    @Body() body: { classId: number },
  ) {
    const classId = Number(body?.classId);
    if (!Number.isInteger(classId) || classId <= 0) {
      throw new BadRequestException('classId 必填且須為正整數');
    }
    return this.scoringService.batchGradeEssaysForExamAndClass(examId, classId);
  }

  /** 教師人工評分（覆寫單題，含 AI 配額不足之待複閱題） */
  @Patch('answers/:answerId')
  manualGradeAnswer(
    @Param('answerId', ParseIntPipe) answerId: number,
    @Body() body: { aiScore: number; aiFeedback?: string },
  ) {
    return this.scoringService.manualGradeAnswer(answerId, body.aiScore, body.aiFeedback);
  }
}
