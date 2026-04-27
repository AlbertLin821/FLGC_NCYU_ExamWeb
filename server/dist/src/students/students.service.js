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
exports.StudentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const access_1 = require("../auth/access");
let StudentsService = class StudentsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getActorVisibleClassIds(actor) {
        if (actor.role === 'admin') {
            return null;
        }
        const memberships = await this.prisma.teacherClass.findMany({
            where: { teacherId: actor.id },
            select: { classId: true },
        });
        return memberships.map((row) => row.classId);
    }
    async findAllPaginated(page, limit) {
        const p = page || 1;
        const l = limit || 20;
        const skip = (p - 1) * l;
        const where = {};
        const orderBy = { id: 'asc' };
        const [items, total] = await Promise.all([
            this.prisma.student.findMany({
                where,
                include: {
                    classes: {
                        include: {
                            class: { select: { id: true, name: true } },
                        },
                        orderBy: { classId: 'asc' },
                    },
                },
                orderBy,
                skip,
                take: l,
            }),
            this.prisma.student.count({ where }),
        ]);
        return {
            items,
            total,
            page: p,
            limit: l,
            totalPages: Math.ceil(total / l),
        };
    }
    async findByClass(classId, actor, page, limit) {
        await (0, access_1.ensureClassAccess)(this.prisma, actor, classId);
        const where = { classes: { some: { classId } } };
        const include = {
            sessions: {
                where: {
                    exam: {
                        examClasses: {
                            some: { classId },
                        },
                    },
                },
                orderBy: { id: 'desc' },
                include: {
                    exam: {
                        select: { title: true, startTime: true, endTime: true },
                    },
                    answers: {
                        select: {
                            aiScore: true,
                            question: { select: { maxPoints: true } },
                        },
                    },
                },
            },
            classes: {
                include: {
                    class: { select: { id: true, name: true } },
                },
                orderBy: { classId: 'asc' },
            },
        };
        const orderBy = { studentId: 'asc' };
        if (page === undefined && limit === undefined) {
            return this.prisma.student.findMany({ where, include, orderBy });
        }
        const p = page || 1;
        const l = limit || 20;
        const skip = (p - 1) * l;
        const [items, total] = await Promise.all([
            this.prisma.student.findMany({
                where,
                include,
                orderBy,
                skip,
                take: l,
            }),
            this.prisma.student.count({ where }),
        ]);
        return { items, total, page: p, limit: l, totalPages: Math.ceil(total / l) };
    }
    async findById(id, actor) {
        await (0, access_1.ensureStudentAccess)(this.prisma, actor, id);
        const visibleClassIds = await this.getActorVisibleClassIds(actor);
        return this.prisma.student.findUnique({
            where: { id },
            include: {
                classes: {
                    where: visibleClassIds ? { classId: { in: visibleClassIds } } : undefined,
                    include: {
                        class: { select: { id: true, name: true } },
                    },
                    orderBy: { classId: 'asc' },
                },
                sessions: {
                    where: visibleClassIds
                        ? {
                            exam: {
                                examClasses: {
                                    some: {
                                        classId: { in: visibleClassIds },
                                    },
                                },
                            },
                        }
                        : undefined,
                    include: { exam: true, answers: { include: { question: true } } },
                },
            },
        });
    }
    async bulkImport(students, classId, actor) {
        await (0, access_1.ensureClassAccess)(this.prisma, actor, classId);
        const results = { created: 0, updated: 0, errors: [] };
        const chunkSize = 40;
        for (let i = 0; i < students.length; i += chunkSize) {
            const chunk = students.slice(i, i + chunkSize);
            const outcomes = await Promise.all(chunk.map(async (s) => {
                const data = {
                    studentId: s.studentId.trim(),
                    name: s.name.trim(),
                    schoolName: s.schoolName.trim(),
                };
                try {
                    await this.prisma.$transaction(async (tx) => {
                        const student = await tx.student.upsert({
                            where: { studentId: data.studentId },
                            update: { name: data.name, schoolName: data.schoolName },
                            create: data,
                        });
                        await tx.studentClass.upsert({
                            where: {
                                studentId_classId: {
                                    studentId: student.id,
                                    classId,
                                },
                            },
                            update: {},
                            create: {
                                studentId: student.id,
                                classId,
                            },
                        });
                    });
                    return { ok: true, studentId: data.studentId, created: true };
                }
                catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    return { ok: false, studentId: s.studentId, message };
                }
            }));
            for (const o of outcomes) {
                if (o.ok)
                    results.created++;
                else
                    results.errors.push(`${o.studentId}: ${o.message}`);
            }
        }
        return results;
    }
    async create(data, actor) {
        await (0, access_1.ensureClassAccess)(this.prisma, actor, data.classId);
        return this.prisma.$transaction(async (tx) => {
            const student = await tx.student.upsert({
                where: { studentId: data.studentId.trim() },
                update: {
                    name: data.name.trim(),
                    schoolName: data.schoolName.trim(),
                },
                create: {
                    studentId: data.studentId.trim(),
                    name: data.name.trim(),
                    schoolName: data.schoolName.trim(),
                },
            });
            await tx.studentClass.upsert({
                where: {
                    studentId_classId: {
                        studentId: student.id,
                        classId: data.classId,
                    },
                },
                update: {},
                create: {
                    studentId: student.id,
                    classId: data.classId,
                },
            });
            return tx.student.findUniqueOrThrow({
                where: { id: student.id },
                include: {
                    classes: {
                        include: {
                            class: { select: { id: true, name: true } },
                        },
                        orderBy: { classId: 'asc' },
                    },
                },
            });
        });
    }
    async update(id, data, actor) {
        await (0, access_1.ensureStudentAccess)(this.prisma, actor, id);
        return this.prisma.student.update({
            where: { id },
            data: {
                ...(data.name !== undefined ? { name: data.name.trim() } : {}),
                ...(data.schoolName !== undefined ? { schoolName: data.schoolName.trim() } : {}),
            },
        });
    }
    async delete(id, actor, classId) {
        const classIds = await (0, access_1.ensureStudentAccess)(this.prisma, actor, id);
        if (classId !== undefined) {
            if (!classIds.includes(classId)) {
                return { ok: true, removedClassId: classId, deletedStudent: false };
            }
            await (0, access_1.ensureClassAccess)(this.prisma, actor, classId);
            await this.prisma.studentClass.delete({
                where: {
                    studentId_classId: {
                        studentId: id,
                        classId,
                    },
                },
            });
            const remaining = await this.prisma.studentClass.count({ where: { studentId: id } });
            if (remaining === 0) {
                await this.prisma.student.delete({ where: { id } });
                return { ok: true, removedClassId: classId, deletedStudent: true };
            }
            return { ok: true, removedClassId: classId, deletedStudent: false };
        }
        return this.prisma.student.delete({ where: { id } });
    }
    async getStudentExams(studentId) {
        const student = await this.prisma.student.findUnique({
            where: { id: studentId },
            include: {
                classes: { select: { classId: true } },
            },
        });
        if (!student)
            return [];
        const classIds = student.classes.map((row) => row.classId);
        if (classIds.length === 0)
            return [];
        const now = new Date();
        const exams = await this.prisma.exam.findMany({
            where: {
                deletedAt: null,
                examClasses: { some: { classId: { in: classIds } } },
                status: 'published',
                startTime: { lte: now },
                endTime: { gte: now },
            },
            include: {
                questions: { select: { id: true } },
                sessions: { where: { studentId: student.id } },
            },
        });
        return exams.map((exam) => ({
            id: exam.id,
            title: exam.title,
            difficulty: exam.difficulty,
            timeLimit: exam.timeLimit,
            questionCount: exam.questions.length,
            startTime: exam.startTime,
            endTime: exam.endTime,
            sessionStatus: exam.sessions[0]?.status || 'not_started',
        }));
    }
};
exports.StudentsService = StudentsService;
exports.StudentsService = StudentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StudentsService);
//# sourceMappingURL=students.service.js.map