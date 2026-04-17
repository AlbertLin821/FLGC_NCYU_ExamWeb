import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CheatService } from './cheat.service';
export declare class CheatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private cheatService;
    server: Server;
    private readonly logger;
    constructor(cheatService: CheatService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleCheatReport(data: {
        sessionId: number;
        eventType: string;
        details?: any;
    }, client: Socket): Promise<{
        status: string;
        logId: number;
    }>;
    handleTeacherJoin(client: Socket): void;
    handleUnlock(data: {
        logId: number;
        teacherId: number;
    }): Promise<{
        status: string;
        sessionId: number | undefined;
    }>;
    handleTerminate(data: {
        logId: number;
        teacherId: number;
    }): Promise<{
        status: string;
        sessionId: number | undefined;
    }>;
}
