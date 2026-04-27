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
exports.ScoringController = void 0;
const common_1 = require("@nestjs/common");
const scoring_service_1 = require("./scoring.service");
const guards_1 = require("../auth/guards");
const access_1 = require("../auth/access");
let ScoringController = class ScoringController {
    scoringService;
    constructor(scoringService) {
        this.scoringService = scoringService;
    }
    scoreSession(sessionId, req) {
        (0, access_1.ensureRoleCanGrade)(req.user.role);
        return this.scoringService.scoreSession(sessionId, req.user);
    }
    batchEssayGrade(examId, body, req) {
        (0, access_1.ensureRoleCanGrade)(req.user.role);
        const classId = Number(body?.classId);
        if (!Number.isInteger(classId) || classId <= 0) {
            throw new common_1.BadRequestException('classId 必填且須為正整數');
        }
        return this.scoringService.batchGradeEssaysForExamAndClass(examId, classId, req.user);
    }
    manualGradeAnswer(answerId, body, req) {
        (0, access_1.ensureRoleCanGrade)(req.user.role);
        return this.scoringService.manualGradeAnswer(answerId, body.aiScore, body.aiFeedback, req.user);
    }
};
exports.ScoringController = ScoringController;
__decorate([
    (0, common_1.Post)('session/:sessionId'),
    __param(0, (0, common_1.Param)('sessionId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ScoringController.prototype, "scoreSession", null);
__decorate([
    (0, common_1.Post)('exams/:examId/batch-essay-grade'),
    __param(0, (0, common_1.Param)('examId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], ScoringController.prototype, "batchEssayGrade", null);
__decorate([
    (0, common_1.Patch)('answers/:answerId'),
    __param(0, (0, common_1.Param)('answerId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], ScoringController.prototype, "manualGradeAnswer", null);
exports.ScoringController = ScoringController = __decorate([
    (0, common_1.Controller)('api/scoring'),
    (0, common_1.UseGuards)(guards_1.JwtAuthGuard, guards_1.RolesGuard),
    (0, guards_1.Roles)('teacher', 'admin'),
    __metadata("design:paramtypes", [scoring_service_1.ScoringService])
], ScoringController);
//# sourceMappingURL=scoring.controller.js.map