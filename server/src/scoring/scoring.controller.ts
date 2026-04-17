import { Controller, Post, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { JwtAuthGuard } from '../auth/guards';

@Controller('api/scoring')
@UseGuards(JwtAuthGuard)
export class ScoringController {
  constructor(private scoringService: ScoringService) {}

  @Post('session/:sessionId')
  scoreSession(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.scoringService.scoreSession(sessionId);
  }
}
