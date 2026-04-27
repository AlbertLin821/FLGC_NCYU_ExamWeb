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
exports.QuestionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const access_1 = require("../auth/access");
let QuestionsService = class QuestionsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findByExam(examId, actor) {
        await (0, access_1.ensureExamAccess)(this.prisma, actor, examId);
        return this.prisma.question.findMany({
            where: { examId },
            orderBy: { orderNum: 'asc' },
        });
    }
    async create(data, actor) {
        await (0, access_1.ensureExamAccess)(this.prisma, actor, data.examId);
        return this.prisma.question.create({ data });
    }
    async update(id, data, actor) {
        await (0, access_1.ensureQuestionAccess)(this.prisma, actor, id);
        return this.prisma.question.update({ where: { id }, data });
    }
    async delete(id, actor) {
        await (0, access_1.ensureQuestionAccess)(this.prisma, actor, id);
        return this.prisma.question.delete({ where: { id } });
    }
    async bulkCreate(examId, questions, actor) {
        await (0, access_1.ensureExamAccess)(this.prisma, actor, examId);
        const data = questions.map((q, i) => ({
            examId,
            ...q,
            orderNum: i + 1,
        }));
        return this.prisma.question.createMany({ data });
    }
    async reorder(questions, actor) {
        for (const q of questions) {
            await (0, access_1.ensureQuestionAccess)(this.prisma, actor, q.id);
        }
        const updates = questions.map((q) => this.prisma.question.update({
            where: { id: q.id },
            data: { orderNum: q.orderNum },
        }));
        return this.prisma.$transaction(updates);
    }
};
exports.QuestionsService = QuestionsService;
exports.QuestionsService = QuestionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], QuestionsService);
//# sourceMappingURL=questions.service.js.map