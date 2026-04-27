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
exports.ClassesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const access_1 = require("../auth/access");
let ClassesService = class ClassesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(actor, page, limit) {
        const where = (0, access_1.isAdminRole)(actor.role) ? {} : { teachers: { some: { teacherId: actor.id } } };
        const include = {
            _count: { select: { students: true } },
            teachers: {
                include: { teacher: { select: { id: true, name: true, email: true } } },
            },
        };
        if (page === undefined && limit === undefined) {
            return this.prisma.class.findMany({ where, include });
        }
        const p = page || 1;
        const l = limit || 20;
        const skip = (p - 1) * l;
        const [items, total] = await Promise.all([
            this.prisma.class.findMany({
                where,
                include,
                skip,
                take: l,
            }),
            this.prisma.class.count({ where }),
        ]);
        return { items, total, page: p, limit: l, totalPages: Math.ceil(total / l) };
    }
    async findById(id, actor) {
        await (0, access_1.ensureClassAccess)(this.prisma, actor, id);
        return this.prisma.class.findUnique({
            where: { id },
            include: {
                students: {
                    include: {
                        student: true,
                    },
                },
                _count: { select: { students: true } },
            },
        });
    }
    async create(data, teacherId) {
        return this.prisma.class.create({
            data: {
                name: data.name,
                description: data.description,
                createdBy: teacherId,
                teachers: {
                    create: { teacherId, role: 'owner' },
                },
            },
        });
    }
    async update(id, data, actor) {
        await (0, access_1.ensureClassAccess)(this.prisma, actor, id);
        return this.prisma.class.update({ where: { id }, data });
    }
    async delete(id, actor) {
        await (0, access_1.ensureClassAccess)(this.prisma, actor, id);
        return this.prisma.class.delete({ where: { id } });
    }
    async addTeacher(classId, teacherId, actor) {
        await (0, access_1.ensureClassAccess)(this.prisma, actor, classId);
        return this.prisma.teacherClass.create({
            data: { classId, teacherId, role: 'member' },
        });
    }
    async removeTeacher(classId, teacherId, actor) {
        await (0, access_1.ensureClassAccess)(this.prisma, actor, classId);
        return this.prisma.teacherClass.delete({
            where: { teacherId_classId: { teacherId, classId } },
        });
    }
    async getClassStats(classId, actor) {
        await (0, access_1.ensureClassAccess)(this.prisma, actor, classId);
        const aggregate = await this.prisma.answer.aggregate({
            where: {
                session: { exam: { examClasses: { some: { classId } } } },
                aiScore: { not: null },
            },
            _avg: { aiScore: true },
            _max: { aiScore: true },
            _count: { aiScore: true },
        });
        return {
            average: Math.round(Number(aggregate._avg.aiScore || 0) * 100) / 100,
            max: Number(aggregate._max.aiScore || 0),
            totalAnswered: aggregate._count.aiScore,
        };
    }
};
exports.ClassesService = ClassesService;
exports.ClassesService = ClassesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ClassesService);
//# sourceMappingURL=classes.service.js.map