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
let StudentsService = class StudentsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findByClass(classId, page, limit) {
        const where = { classId };
        const include = {
            sessions: {
                orderBy: { id: 'desc' },
                take: 1,
                include: { exam: true },
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
    async findById(id) {
        return this.prisma.student.findUnique({
            where: { id },
            include: {
                sessions: { include: { exam: true, answers: { include: { question: true } } } },
            },
        });
    }
    async bulkImport(students, classId) {
        const results = { created: 0, updated: 0, errors: [] };
        for (const s of students) {
            try {
                await this.prisma.student.upsert({
                    where: { studentId: s.studentId },
                    update: { name: s.name, classId },
                    create: { studentId: s.studentId, name: s.name, classId },
                });
                results.created++;
            }
            catch (err) {
                results.errors.push(`${s.studentId}: ${err.message}`);
            }
        }
        return results;
    }
    async create(data) {
        return this.prisma.student.create({ data });
    }
    async update(id, data) {
        return this.prisma.student.update({ where: { id }, data });
    }
    async delete(id) {
        return this.prisma.student.delete({ where: { id } });
    }
    async getStudentExams(studentId) {
        const student = await this.prisma.student.findUnique({
            where: { id: studentId },
        });
        if (!student)
            return [];
        const now = new Date();
        const exams = await this.prisma.exam.findMany({
            where: {
                deletedAt: null,
                examClasses: { some: { classId: student.classId } },
                status: 'published',
                startTime: { lte: now },
                endTime: { gte: now },
            },
            include: {
                questions: { select: { id: true } },
                sessions: { where: { studentId } },
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