import {
  Controller, Get, Post, Param, UseGuards, Request, ParseIntPipe, Query,
} from '@nestjs/common';
import { CheatService } from './cheat.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';

@Controller('api/cheat')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CheatController {
  constructor(private cheatService: CheatService) {}

  @Get('alerts')
  @Roles('teacher', 'admin', 'viewer')
  getPendingAlerts(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.cheatService.getPendingAlerts(
      req.user,
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
    );
  }

  @Get('session/:sessionId')
  @Roles('teacher', 'admin', 'viewer')
  getSessionLogs(@Param('sessionId', ParseIntPipe) sessionId: number, @Request() req: any) {
    return this.cheatService.getLogsBySession(sessionId, req.user);
  }

  @Post(':logId/unlock')
  @Roles('teacher', 'admin')
  unlock(@Param('logId', ParseIntPipe) logId: number, @Request() req: any) {
    return this.cheatService.unlockSession(logId, req.user.id, req.user);
  }

  @Post(':logId/terminate')
  @Roles('teacher', 'admin')
  terminate(@Param('logId', ParseIntPipe) logId: number, @Request() req: any) {
    return this.cheatService.terminateSession(logId, req.user.id, req.user);
  }
}
