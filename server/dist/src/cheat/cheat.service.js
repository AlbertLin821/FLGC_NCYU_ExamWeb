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
var CheatService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheatService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const access_1 = require("../auth/access");
let CheatService = CheatService_1 = class CheatService {
    prisma;
    logger = new common_1.Logger(CheatService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async logCheatEvent(sessionId, eventType, details) {
        this.logger.warn(`Cheat event: session=${sessionId}, type=${eventType}`);
        const log = await this.prisma.cheatLog.create({
            data: { sessionId, eventType, details },
        });
        await this.prisma.examSession.update({
            where: { id: sessionId },
            data: { status: 'paused' },
        });
        return log;
    }
    async unlockSession(logId, teacherId, actor) {
        const logBeforeUpdate = await this.prisma.cheatLog.findUnique({
            where: { id: logId },
            select: {
                id: true,
                session: {
                    select: {
                        examId: true,
                        student: { select: { id: true } },
                    },
                },
            },
        });
        if (logBeforeUpdate) {
            await (0, access_1.ensureExamAccess)(this.prisma, actor, logBeforeUpdate.session.examId);
            await (0, access_1.ensureStudentAccess)(this.prisma, actor, logBeforeUpdate.session.student.id);
        }
        await this.prisma.cheatLog.update({
            where: { id: logId },
            data: { resolvedBy: teacherId, resolution: 'unlocked' },
        });
        const log = await this.prisma.cheatLog.findUnique({
            where: { id: logId },
            select: { sessionId: true },
        });
        if (log) {
            await this.prisma.examSession.update({
                where: { id: log.sessionId },
                data: { status: 'in_progress' },
            });
        }
        return { status: 'unlocked', sessionId: log?.sessionId };
    }
    async terminateSession(logId, teacherId, actor) {
        const logBeforeUpdate = await this.prisma.cheatLog.findUnique({
            where: { id: logId },
            select: {
                id: true,
                session: {
                    select: {
                        examId: true,
                        student: { select: { id: true } },
                    },
                },
            },
        });
        if (logBeforeUpdate) {
            await (0, access_1.ensureExamAccess)(this.prisma, actor, logBeforeUpdate.session.examId);
            await (0, access_1.ensureStudentAccess)(this.prisma, actor, logBeforeUpdate.session.student.id);
        }
        await this.prisma.cheatLog.update({
            where: { id: logId },
            data: { resolvedBy: teacherId, resolution: 'terminated' },
        });
        const log = await this.prisma.cheatLog.findUnique({
            where: { id: logId },
            select: { sessionId: true },
        });
        if (log) {
            await this.prisma.examSession.update({
                where: { id: log.sessionId },
                data: { status: 'submitted', submittedAt: new Date() },
            });
        }
        return { status: 'terminated', sessionId: log?.sessionId };
    }
    async getPendingAlerts(actor, page, limit) {
        const where = {
            resolution: null,
            ...(!(0, access_1.isAdminRole)(actor.role) && !(0, access_1.isViewerRole)(actor.role)
                ? {
                    session: {
                        exam: {
                            examClasses: {
                                some: {
                                    class: {
                                        teachers: {
                                            some: { teacherId: actor.id },
                                        },
                                    },
                                },
                            },
                        },
                    },
                }
                : {}),
        };
        const include = {
            session: {
                include: {
                    student: { select: { studentId: true, name: true } },
                    exam: { select: { title: true } },
                },
            },
        };
        const orderBy = { createdAt: 'desc' };
        if (page === undefined && limit === undefined) {
            return this.prisma.cheatLog.findMany({ where, include, orderBy });
        }
        const p = page || 1;
        const l = limit || 20;
        const skip = (p - 1) * l;
        const [items, total] = await Promise.all([
            this.prisma.cheatLog.findMany({
                where,
                include,
                orderBy,
                skip,
                take: l,
            }),
            this.prisma.cheatLog.count({ where }),
        ]);
        return { items, total, page: p, limit: l, totalPages: Math.ceil(total / l) };
    }
    async getLogsBySession(sessionId, actor) {
        const session = await this.prisma.examSession.findUnique({
            where: { id: sessionId },
            select: { examId: true, student: { select: { id: true } } },
        });
        if (session) {
            await (0, access_1.ensureExamAccess)(this.prisma, actor, session.examId);
            await (0, access_1.ensureStudentAccess)(this.prisma, actor, session.student.id);
        }
        return this.prisma.cheatLog.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getSessionIdByLogId(logId) {
        const log = await this.prisma.cheatLog.findUnique({
            where: { id: logId },
            select: { sessionId: true },
        });
        return log?.sessionId ?? null;
    }
};
exports.CheatService = CheatService;
exports.CheatService = CheatService = CheatService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CheatService);
//# sourceMappingURL=cheat.service.js.map