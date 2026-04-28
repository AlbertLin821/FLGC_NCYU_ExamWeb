import {
  BadRequestException,
  Body,
  Controller,
  Patch,
  Param,
  Post,
  Request,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { ensureRoleCanGrade } from '../auth/access';

@Controller('api/scoring')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ScoringController {
  constructor(private scoringService: ScoringService) {}

  @Post('session/:sessionId')
  scoreSession(@Param('sessionId', ParseIntPipe) sessionId: number, @Request() req: any) {
    ensureRoleCanGrade(req.user.role);
    return this.scoringService.scoreSession(sessionId, req.user);
  }

  /** 教師端：對該班已交卷 session 逐人集體 AI 批閱問答題（單次 Prompt） */
  @Post('exams/:examId/batch-essay-grade')
  batchEssayGrade(
    @Param('examId', ParseIntPipe) examId: number,
    @Body() body: { classId: number },
    @Request() req: any,
  ) {
    ensureRoleCanGrade(req.user.role);
    const classId = Number(body?.classId);
    if (!Number.isInteger(classId) || classId <= 0) {
      throw new BadRequestException('classId 必填且須為正整數');
    }
    return this.scoringService.batchGradeEssaysForExamAndClass(examId, classId, req.user);
  }

  /** 教師人工評分（覆寫單題，含 AI 配額不足之待複閱題） */
  @Patch('answers/:answerId')
  manualGradeAnswer(
    @Param('answerId', ParseIntPipe) answerId: number,
    @Body() body: { aiScore: number; aiFeedback?: string },
    @Request() req: any,
  ) {
    ensureRoleCanGrade(req.user.role);
    return this.scoringService.manualGradeAnswer(answerId, body.aiScore, body.aiFeedback, req.user);
  }
}
