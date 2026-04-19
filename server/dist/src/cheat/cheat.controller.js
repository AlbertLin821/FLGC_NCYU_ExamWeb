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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheatController = void 0;
const common_1 = require("@nestjs/common");
const cheat_service_1 = require("./cheat.service");
const guards_1 = require("../auth/guards");
let CheatController = class CheatController {
    cheatService;
    constructor(cheatService) {
        this.cheatService = cheatService;
    }
    getPendingAlerts(page, limit) {
        return this.cheatService.getPendingAlerts(page ? parseInt(page) : undefined, limit ? parseInt(limit) : undefined);
    }
    getSessionLogs(sessionId) {
        return this.cheatService.getLogsBySession(sessionId);
    }
    unlock(logId, req) {
        return this.cheatService.unlockSession(logId, req.user.id);
    }
    terminate(logId, req) {
        return this.cheatService.terminateSession(logId, req.user.id);
    }
};
exports.CheatController = CheatController;
__decorate([
    (0, common_1.Get)('alerts'),
    (0, guards_1.Roles)('teacher', 'admin', 'viewer'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CheatController.prototype, "getPendingAlerts", null);
__decorate([
    (0, common_1.Get)('session/:sessionId'),
    (0, guards_1.Roles)('teacher', 'admin', 'viewer'),
    __param(0, (0, common_1.Param)('sessionId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CheatController.prototype, "getSessionLogs", null);
__decorate([
    (0, common_1.Post)(':logId/unlock'),
    (0, guards_1.Roles)('teacher', 'admin', 'viewer'),
    __param(0, (0, common_1.Param)('logId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], CheatController.prototype, "unlock", null);
__decorate([
    (0, common_1.Post)(':logId/terminate'),
    (0, guards_1.Roles)('teacher', 'admin', 'viewer'),
    __param(0, (0, common_1.Param)('logId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], CheatController.prototype, "terminate", null);
exports.CheatController = CheatController = __decorate([
    (0, common_1.Controller)('api/cheat'),
    (0, common_1.UseGuards)(guards_1.JwtAuthGuard, guards_1.RolesGuard),
    __metadata("design:paramtypes", [cheat_service_1.CheatService])
], CheatController);
//# sourceMappingURL=cheat.controller.js.map