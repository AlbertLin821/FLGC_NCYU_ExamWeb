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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("./prisma/prisma.service");
let AppService = class AppService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    getHello() {
        return 'NCYU Online English Exam API';
    }
    async getDashboardStats() {
        const now = new Date();
        const activeExams = await this.prisma.exam.count({
            where: {
                deletedAt: null,
                status: 'published',
                startTime: { lte: now },
                endTime: { gte: now },
            },
        });
        const pendingAlerts = await this.prisma.cheatLog.count({
            where: { resolution: null },
        });
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const totalSubmissions = await this.prisma.examSession.count({
            where: {
                status: { in: ['submitted', 'graded'] },
                submittedAt: { gte: oneWeekAgo },
            },
        });
        const sessionsAwaitingScore = await this.prisma.examSession.count({
            where: { status: 'submitted' },
        });
        const sessionsPendingReview = await this.prisma.examSession.count({
            where: {
                answers: { some: { aiModel: 'pending_review' } },
            },
        });
        const recentLogs = [
            { id: 1, type: 'info', message: '系統運行正常', time: new Date() },
        ];
        return {
            activeExams,
            pendingAlerts,
            totalSubmissions,
            sessionsAwaitingScore,
            sessionsPendingReview,
            recentLogs,
        };
    }
};
exports.AppService = AppService;
exports.AppService = AppService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AppService);
//# sourceMappingURL=app.service.js.map