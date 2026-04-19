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
exports.ExamsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const scoring_service_1 = require("../scoring/scoring.service");
const exam_time_util_1 = require("./exam-time.util");
const sessionReviewFlags_1 = require("./sessionReviewFlags");
let ExamsService = class ExamsService {
    prisma;
    scoringService;
    constructor(prisma, scoringService) {
        this.prisma = prisma;
        this.scoringService = scoringService;
    }
    async findAll(classId, page, limit) {
        const where = {
            deletedAt: null,
            ...(classId ? { examClasses: { some: { classId } } } : {}),
        };
        const include = {
            examClasses: { include: { class: { select: { id: true, name: true } } } },
            _count: { select: { questions: true, sessions: true } },
        };
        const orderBy = { createdAt: 'desc' };
        if (page === undefined && limit === undefined) {
            return this.prisma.exam.findMany({ where, include, orderBy });
        }
        const p = page || 1;
        const l = limit || 20;
        const skip = (p - 1) * l;
        const [items, total] = await Promise.all([
            this.prisma.exam.findMany({
                where,
                include,
                orderBy,
                skip,
                take: l,
            }),
            this.prisma.exam.count({ where }),
        ]);
        return { items, total, page: p, limit: l, totalPages: Math.ceil(total / l) };
    }
    async findById(id) {
        return this.prisma.exam.findFirst({
            where: { id, deletedAt: null },
            include: {
                questions: { orderBy: { orderNum: 'asc' } },
                examClasses: { include: { class: { select: { id: true, name: true } } } },
            },
        });
    }
    async create(data) {
        const uniqueClassIds = [...new Set(data.classIds)].filter((id) => Number.isInteger(id) && id > 0);
        if (uniqueClassIds.length === 0) {
            throw new common_1.BadRequestException('至少選擇一個適用班級');
        }
        return this.prisma.$transaction(async (tx) => {
            const exam = await tx.exam.create({
                data: {
                    title: data.title,
                    difficulty: data.difficulty,
                    timeLimit: data.timeLimit,
                    startTime: new Date(data.startTime),
                    endTime: new Date(data.endTime),
                    createdBy: data.createdBy,
                    examClasses: {
                        create: uniqueClassIds.map((classId) => ({ classId })),
                    },
                },
                include: {
                    examClasses: { include: { class: { select: { id: true, name: true } } } },
                },
            });
            return exam;
        });
    }
    async update(id, data) {
        const alive = await this.prisma.exam.findFirst({ where: { id, deletedAt: null } });
        if (!alive)
            throw new common_1.NotFoundException('考卷不存在或已移除');
        const { classIds, ...rest } = data;
        const updateData = { ...rest };
        if (data.startTime)
            updateData.startTime = new Date(data.startTime);
        if (data.endTime)
            updateData.endTime = new Date(data.endTime);
        if (classIds !== undefined) {
            const uniqueClassIds = [...new Set(classIds)].filter((cid) => Number.isInteger(cid) && cid > 0);
            if (uniqueClassIds.length === 0) {
                throw new common_1.BadRequestException('至少選擇一個適用班級');
            }
            return this.prisma.$transaction(async (tx) => {
                await tx.examClass.deleteMany({ where: { examId: id } });
                await tx.examClass.createMany({
                    data: uniqueClassIds.map((classId) => ({ examId: id, classId })),
                });
                const hasExamFieldUpdates = Object.keys(updateData).length > 0;
                if (hasExamFieldUpdates) {
                    return tx.exam.update({
                        where: { id },
                        data: updateData,
                        include: {
                            examClasses: { include: { class: { select: { id: true, name: true } } } },
                        },
                    });
                }
                return tx.exam.findUniqueOrThrow({
                    where: { id },
                    include: {
                        examClasses: { include: { class: { select: { id: true, name: true } } } },
                    },
                });
            });
        }
        return this.prisma.exam.update({ where: { id }, data: updateData });
    }
    async delete(id) {
        const exam = await this.prisma.exam.findFirst({ where: { id, deletedAt: null } });
        if (!exam)
            throw new common_1.NotFoundException('考卷不存在或已移除');
        return this.prisma.exam.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
    async publish(id) {
        const exam = await this.prisma.exam.findFirst({ where: { id, deletedAt: null } });
        if (!exam)
            throw new common_1.NotFoundException('考卷不存在或已移除');
        return this.prisma.exam.update({
            where: { id },
            data: { status: 'published' },
        });
    }
    async startSession(studentId, examId) {
        const exam = await this.prisma.exam.findFirst({
            where: { id: examId, deletedAt: null },
            include: { questions: { orderBy: { orderNum: 'asc' } } },
        });
        if (!exam)
            throw new common_1.NotFoundException('考卷不存在');
        if (exam.status !== 'published')
            throw new common_1.BadRequestException('考卷未開放');
        const now = new Date();
        if (now < exam.startTime || now > exam.endTime) {
            throw new common_1.BadRequestException('不在考試時間內');
        }
        const existingSession = await this.prisma.examSession.findUnique({
            where: { studentId_examId: { studentId, examId } },
        });
        if (existingSession && existingSession.status === 'submitted') {
            throw new common_1.BadRequestException('已完成此考試');
        }
        if (existingSession && (existingSession.status === 'in_progress' || existingSession.status === 'paused')) {
            const session = await this.prisma.examSession.findUniqueOrThrow({
                where: { id: existingSession.id },
                include: { exam: true },
            });
            const timeRemainingSeconds = (0, exam_time_util_1.computeTimeRemainingSeconds)(session.startedAt, exam.timeLimit, now, exam.endTime);
            return {
                session,
                questions: exam.questions,
                timeLimit: exam.timeLimit,
                timeRemainingSeconds,
            };
        }
        try {
            const session = await this.prisma.examSession.upsert({
                where: { studentId_examId: { studentId, examId } },
                update: { status: 'in_progress', startedAt: new Date() },
                create: {
                    studentId,
                    examId,
                    status: 'in_progress',
                    startedAt: new Date(),
                },
                include: { exam: true },
            });
            const timeRemainingSeconds = (0, exam_time_util_1.computeTimeRemainingSeconds)(session.startedAt, exam.timeLimit, now, exam.endTime);
            return {
                session,
                questions: exam.questions,
                timeLimit: exam.timeLimit,
                timeRemainingSeconds,
            };
        }
        catch (e) {
            if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
                const session = await this.prisma.examSession.findUniqueOrThrow({
                    where: { studentId_examId: { studentId, examId } },
                    include: { exam: true },
                });
                if (session.status === 'submitted') {
                    throw new common_1.BadRequestException('已完成此考試');
                }
                const timeRemainingSeconds = (0, exam_time_util_1.computeTimeRemainingSeconds)(session.startedAt, exam.timeLimit, now, exam.endTime);
                return {
                    session,
                    questions: exam.questions,
                    timeLimit: exam.timeLimit,
                    timeRemainingSeconds,
                };
            }
            throw e;
        }
    }
    async submitAnswer(sessionId, questionId, content) {
        const session = await this.prisma.examSession.findUnique({
            where: { id: sessionId },
            include: { exam: true },
        });
        if (!session)
            throw new common_1.NotFoundException('考試工作階段不存在');
        if (session.status !== 'in_progress') {
            throw new common_1.BadRequestException('目前狀態無法作答');
        }
        const remaining = (0, exam_time_util_1.computeTimeRemainingSeconds)(session.startedAt, session.exam.timeLimit, new Date(), session.exam.endTime);
        if (remaining <= 0) {
            throw new common_1.BadRequestException('作答時間已結束');
        }
        return this.prisma.answer.upsert({
            where: { sessionId_questionId: { sessionId, questionId } },
            update: { content },
            create: { sessionId, questionId, content },
        });
    }
    async submitExam(sessionId) {
        const existing = await this.prisma.examSession.findUnique({
            where: { id: sessionId },
            include: { exam: true },
        });
        if (!existing)
            throw new common_1.NotFoundException('考試工作階段不存在');
        if (existing.status === 'submitted') {
            throw new common_1.BadRequestException('已交卷');
        }
        if (existing.status !== 'in_progress') {
            throw new common_1.BadRequestException('目前狀態無法交卷');
        }
        const result = await this.prisma.examSession.updateMany({
            where: { id: sessionId, status: 'in_progress' },
            data: { status: 'submitted', submittedAt: new Date() },
        });
        if (result.count === 0) {
            throw new common_1.BadRequestException('已交卷');
        }
        const session = await this.prisma.examSession.findUniqueOrThrow({ where: { id: sessionId } });
        this.scoringService.scoreObjectiveOnly(sessionId).catch((err) => {
            console.error(`Objective scoring failed for session ${sessionId}:`, err);
        });
        return session;
    }
    async getResults(classId, examId, page, limit) {
        const where = {
            exam: { examClasses: { some: { classId } } },
            ...(examId ? { examId } : {}),
        };
        const include = {
            student: { select: { id: true, studentId: true, name: true } },
            exam: { select: { title: true } },
            answers: {
                include: {
                    question: {
                        select: { id: true, orderNum: true, word1: true, word2: true, maxPoints: true },
                    },
                },
            },
        };
        const orderBy = { submittedAt: 'desc' };
        if (page === undefined && limit === undefined) {
            const rows = await this.prisma.examSession.findMany({ where, include, orderBy });
            return (0, sessionReviewFlags_1.mapSessionsWithReviewFlags)(rows);
        }
        const p = page || 1;
        const l = limit || 20;
        const skip = (p - 1) * l;
        const [items, total] = await Promise.all([
            this.prisma.examSession.findMany({
                where,
                include,
                orderBy,
                skip,
                take: l,
            }),
            this.prisma.examSession.count({ where }),
        ]);
        return {
            items: (0, sessionReviewFlags_1.mapSessionsWithReviewFlags)(items),
            total,
            page: p,
            limit: l,
            totalPages: Math.ceil(total / l),
        };
    }
};
exports.ExamsService = ExamsService;
exports.ExamsService = ExamsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => scoring_service_1.ScoringService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        scoring_service_1.ScoringService])
], ExamsService);
//# sourceMappingURL=exams.service.js.map