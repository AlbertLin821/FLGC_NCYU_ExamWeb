"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CheatGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const cheat_service_1 = require("./cheat.service");
let CheatGateway = CheatGateway_1 = class CheatGateway {
    cheatService;
    server;
    logger = new common_1.Logger(CheatGateway_1.name);
    constructor(cheatService) {
        this.cheatService = cheatService;
    }
    handleConnection(client) {
        this.logger.log(`Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }
    async handleCheatReport(data, client) {
        const log = await this.cheatService.logCheatEvent(data.sessionId, data.eventType, data.details);
        this.server.emit('cheat:alert', {
            logId: log.id,
            sessionId: data.sessionId,
            eventType: data.eventType,
            timestamp: log.createdAt,
        });
        client.emit('exam:paused', {
            message: '考試已暫停，請等待老師處理',
            logId: log.id,
        });
        return { status: 'reported', logId: log.id };
    }
    handleTeacherJoin(client) {
        client.join('teachers');
        this.logger.log(`Teacher joined monitoring: ${client.id}`);
    }
    async handleUnlock(data) {
        const result = await this.cheatService.unlockSession(data.logId, data.teacherId);
        this.server.emit(`session:${result.sessionId}:resume`, {
            message: '老師已解除封鎖，考試恢復',
        });
        return result;
    }
    async handleTerminate(data) {
        const result = await this.cheatService.terminateSession(data.logId, data.teacherId);
        this.server.emit(`session:${result.sessionId}:terminated`, {
            message: '考試已被老師結束',
        });
        return result;
    }
};
exports.CheatGateway = CheatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], CheatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('cheat:report'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], CheatGateway.prototype, "handleCheatReport", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('teacher:join'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], CheatGateway.prototype, "handleTeacherJoin", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('cheat:unlock'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CheatGateway.prototype, "handleUnlock", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('cheat:terminate'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CheatGateway.prototype, "handleTerminate", null);
exports.CheatGateway = CheatGateway = CheatGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:80'],
            credentials: true
        },
        namespace: '/cheat',
    }),
    __metadata("design:paramtypes", [cheat_service_1.CheatService])
], CheatGateway);
//# sourceMappingURL=cheat.gateway.js.map