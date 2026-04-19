import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { CheatService } from './cheat.service';

@WebSocketGateway({
  cors: { 
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:80'],
    credentials: true 
  },
  namespace: '/cheat',
})
export class CheatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CheatGateway.name);

  constructor(private cheatService: CheatService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Student reports a cheat event
  @SubscribeMessage('cheat:report')
  async handleCheatReport(
    @MessageBody() data: { sessionId: number; eventType: string; details?: any },
    @ConnectedSocket() client: Socket,
  ) {
    const log = await this.cheatService.logCheatEvent(
      data.sessionId,
      data.eventType,
      data.details,
    );

    // Notify all connected teachers
    this.server.emit('cheat:alert', {
      logId: log.id,
      sessionId: data.sessionId,
      eventType: data.eventType,
      timestamp: log.createdAt,
    });

    // Tell the student their exam is paused
    client.emit('exam:paused', {
      message: '考試已被強制暫停，請等待處理',
      logId: log.id,
    });

    return { status: 'reported', logId: log.id };
  }

  // Teacher joins the monitoring room
  @SubscribeMessage('teacher:join')
  handleTeacherJoin(@ConnectedSocket() client: Socket) {
    client.join('teachers');
    this.logger.log(`Teacher joined monitoring: ${client.id}`);
  }

  // Teacher unlocks a student's exam
  @SubscribeMessage('cheat:unlock')
  async handleUnlock(
    @MessageBody() data: { logId: number; teacherId: number },
  ) {
    const result = await this.cheatService.unlockSession(data.logId, data.teacherId);

    // Notify the student
    this.server.emit(`session:${result.sessionId}:resume`, {
      message: '已解除封鎖，考試恢復',
    });

    return result;
  }

  // Teacher terminates a student's exam
  @SubscribeMessage('cheat:terminate')
  async handleTerminate(
    @MessageBody() data: { logId: number; teacherId: number },
  ) {
    const result = await this.cheatService.terminateSession(data.logId, data.teacherId);

    // Notify the student
    this.server.emit(`session:${result.sessionId}:terminated`, {
      message: '考試已被結束',
    });

    return result;
  }
}
