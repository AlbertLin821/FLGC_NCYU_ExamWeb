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
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const scoring_service_1 = require("../scoring/scoring.service");
const exam_time_util_1 = require("./exam-time.util");
const sessionReviewFlags_1 = require("./sessionReviewFlags");
const access_1 = require("../auth/access");
function parseTeacherExamDate(input) {
    const trimmed = String(input).trim();
    if (!trimmed) {
        throw new common_1.BadRequestException('考試時間不可為空');
    }
    const normalized = /(?:Z|[+-]\d{2}:\d{2})$/i.test(trimmed)
        ? trimmed
        : `${trimmed}+08:00`;
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
        throw new common_1.BadRequestException('考試時間格式無效');
    }
    return parsed;
}
let ExamsService = class ExamsService {
    prisma;
    scoringService;
    constructor(prisma, scoringService) {
        this.prisma = prisma;
        this.scoringService = scoringService;
    }
    async findAll(actor, classId, page, limit) {
        if (classId) {
            await (0, access_1.ensureClassAccess)(this.prisma, actor, classId);
        }
        const andWhere = [
            { deletedAt: null },
        ];
        if (classId) {
            andWhere.push({ examClasses: { some: { classId } } });
        }
        if (!(0, access_1.isAdminRole)(actor.role)) {
            andWhere.push({
                examClasses: { some: { class: { teachers: { some: { teacherId: actor.id } } } } },
            });
        }
        const where = {
            deletedAt: null,
            AND: andWhere,
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
    async findById(id, actor) {
        await (0, access_1.ensureExamAccess)(this.prisma, actor, id);
        return this.prisma.exam.findFirst({
            where: { id, deletedAt: null },
            include: {
                questions: { orderBy: { orderNum: 'asc' } },
                examClasses: { include: { class: { select: { id: true, name: true } } } },
            },
        });
    }
    async create(data, actor) {
        const uniqueClassIds = [...new Set(data.classIds)].filter((id) => Number.isInteger(id) && id > 0);
        if (uniqueClassIds.length === 0) {
            throw new common_1.BadRequestException('至少選擇一個適用班級');
        }
        for (const classId of uniqueClassIds) {
            await (0, access_1.ensureClassAccess)(this.prisma, actor, classId);
        }
        return this.prisma.$transaction(async (tx) => {
            const exam = await tx.exam.create({
                data: {
                    title: data.title,
                    difficulty: data.difficulty,
                    timeLimit: data.timeLimit,
                    startTime: parseTeacherExamDate(data.startTime),
                    endTime: parseTeacherExamDate(data.endTime),
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
    async update(id, data, actor) {
        await (0, access_1.ensureExamAccess)(this.prisma, actor, id);
        const { classIds, ...rest } = data;
        const updateData = { ...rest };
        if (data.startTime)
            updateData.startTime = parseTeacherExamDate(data.startTime);
        if (data.endTime)
            updateData.endTime = parseTeacherExamDate(data.endTime);
        if (classIds !== undefined) {
            const uniqueClassIds = [...new Set(classIds)].filter((cid) => Number.isInteger(cid) && cid > 0);
            if (uniqueClassIds.length === 0) {
                throw new common_1.BadRequestException('至少選擇一個適用班級');
            }
            for (const classId of uniqueClassIds) {
                await (0, access_1.ensureClassAccess)(this.prisma, actor, classId);
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
    async delete(id, actor) {
        await (0, access_1.ensureExamAccess)(this.prisma, actor, id);
        return this.prisma.exam.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
    async publish(id, actor) {
        await (0, access_1.ensureExamAccess)(this.prisma, actor, id);
        const exam = await this.prisma.exam.findFirst({ where: { id, deletedAt: null } });
        if (!exam)
            throw new common_1.NotFoundException('考卷不存在或已移除');
        const questionCount = await this.prisma.question.count({ where: { examId: id } });
        if (questionCount === 0) {
            throw new common_1.BadRequestException('考卷尚未建立題目，無法發放');
        }
        return this.prisma.exam.update({
            where: { id },
            data: { status: 'published' },
        });
    }
    async unpublish(id, actor) {
        await (0, access_1.ensureExamAccess)(this.prisma, actor, id);
        const exam = await this.prisma.exam.findFirst({ where: { id, deletedAt: null } });
        if (!exam)
            throw new common_1.NotFoundException('考卷不存在或已移除');
        if (exam.status !== 'published') {
            throw new common_1.BadRequestException('僅已發放之考卷可取消發放');
        }
        const sessionCount = await this.prisma.examSession.count({ where: { examId: id } });
        if (sessionCount > 0) {
            throw new common_1.BadRequestException('已有學生產生考試紀錄，無法取消發放');
        }
        return this.prisma.exam.update({
            where: { id },
            data: { status: 'draft' },
        });
    }
    async startSession(studentId, examId) {
        const student = await this.prisma.student.findUnique({
            where: { id: studentId },
            select: { id: true, classId: true },
        });
        if (!student)
            throw new common_1.NotFoundException('學生不存在');
        const exam = await this.prisma.exam.findFirst({
            where: {
                id: examId,
                deletedAt: null,
                examClasses: { some: { classId: student.classId } },
            },
            include: { questions: { orderBy: { orderNum: 'asc' } } },
        });
        if (!exam)
            throw new common_1.NotFoundException('考卷不存在或未分配給此班級');
        if (exam.status !== 'published')
            throw new common_1.BadRequestException('考卷未開放');
        if (exam.questions.length === 0)
            throw new common_1.BadRequestException('考卷尚未建立題目');
        const now = new Date();
        if (now < exam.startTime || now > exam.endTime) {
            throw new common_1.BadRequestException('不在考試時間內');
        }
        const existingSession = await this.prisma.examSession.findUnique({
            where: { studentId_examId: { studentId: student.id, examId } },
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
                where: { studentId_examId: { studentId: student.id, examId } },
                update: { status: 'in_progress', startedAt: new Date() },
                create: {
                    studentId: student.id,
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
                    where: { studentId_examId: { studentId: student.id, examId } },
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
        const question = await this.prisma.question.findUnique({
            where: { id: questionId },
            select: { id: true, examId: true },
        });
        if (!question || question.examId !== session.examId) {
            throw new common_1.BadRequestException('題目不屬於此考卷');
        }
        return this.prisma.$transaction(async (tx) => {
            const row = await tx.answer.upsert({
                where: { sessionId_questionId: { sessionId, questionId } },
                update: { content },
                create: { sessionId, questionId, content },
            });
            const agg = await tx.$queryRaw(client_1.Prisma.sql `SELECT COUNT(*)::int AS c FROM "answers" WHERE "session_id" = ${sessionId} AND "content" IS NOT NULL AND TRIM("content") <> ''`);
            const answeredQuestionCount = Number(agg[0]?.c ?? 0);
            await tx.examSession.update({
                where: { id: sessionId },
                data: { answeredQuestionCount },
            });
            return row;
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
    async getResults(actor, classId, examId, page, limit) {
        await (0, access_1.ensureClassAccess)(this.prisma, actor, classId);
        if (examId) {
            await (0, access_1.ensureExamAccess)(this.prisma, actor, examId);
        }
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