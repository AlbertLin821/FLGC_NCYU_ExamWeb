import {
  Controller, Get, Post, Param, Body, UseGuards, Request, ParseIntPipe, Query,
} from '@nestjs/common';
import { CheatService } from './cheat.service';
import { JwtAuthGuard } from '../auth/guards';

@Controller('api/cheat')
@UseGuards(JwtAuthGuard)
export class CheatController {
  constructor(private cheatService: CheatService) {}

  @Get('alerts')
  getPendingAlerts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.cheatService.getPendingAlerts(
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
    );
  }

  @Get('session/:sessionId')
  getSessionLogs(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.cheatService.getLogsBySession(sessionId);
  }

  @Post(':logId/unlock')
  unlock(@Param('logId', ParseIntPipe) logId: number, @Request() req: any) {
    return this.cheatService.unlockSession(logId, req.user.id);
  }

  @Post(':logId/terminate')
  terminate(@Param('logId', ParseIntPipe) logId: number, @Request() req: any) {
    return this.cheatService.terminateSession(logId, req.user.id);
  }
}
