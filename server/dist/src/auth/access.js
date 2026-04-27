"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdminRole = isAdminRole;
exports.isViewerRole = isViewerRole;
exports.ensureRoleCanGrade = ensureRoleCanGrade;
exports.ensureClassAccess = ensureClassAccess;
exports.ensureStudentAccess = ensureStudentAccess;
exports.ensureExamAccess = ensureExamAccess;
exports.ensureQuestionAccess = ensureQuestionAccess;
const common_1 = require("@nestjs/common");
function isAdminRole(role) {
    return role === 'admin';
}
function isViewerRole(role) {
    return role === 'viewer';
}
function ensureRoleCanGrade(role) {
    if (!isAdminRole(role)) {
        throw new common_1.ForbiddenException('僅管理端可批改題目');
    }
}
async function ensureClassAccess(prisma, actor, classId) {
    const classRow = await prisma.class.findUnique({
        where: { id: classId },
        select: { id: true },
    });
    if (!classRow) {
        throw new common_1.NotFoundException('班級不存在');
    }
    if (isAdminRole(actor.role)) {
        return;
    }
    const membership = await prisma.teacherClass.findUnique({
        where: {
            teacherId_classId: {
                teacherId: actor.id,
                classId,
            },
        },
        select: { teacherId: true },
    });
    if (!membership) {
        throw new common_1.ForbiddenException('無權存取此班級');
    }
}
async function ensureStudentAccess(prisma, actor, studentId) {
    const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { id: true, classId: true },
    });
    if (!student) {
        throw new common_1.NotFoundException('學生不存在');
    }
    await ensureClassAccess(prisma, actor, student.classId);
    return student.classId;
}
async function ensureExamAccess(prisma, actor, examId) {
    const exam = await prisma.exam.findFirst({
        where: { id: examId, deletedAt: null },
        select: {
            id: true,
            examClasses: {
                select: { classId: true },
            },
        },
    });
    if (!exam) {
        throw new common_1.NotFoundException('考卷不存在或已移除');
    }
    if (isAdminRole(actor.role)) {
        return;
    }
    const classIds = exam.examClasses.map((row) => row.classId);
    if (classIds.length === 0) {
        throw new common_1.ForbiddenException('此考卷尚未分配班級');
    }
    const membership = await prisma.teacherClass.findFirst({
        where: {
            teacherId: actor.id,
            classId: { in: classIds },
        },
        select: { teacherId: true },
    });
    if (!membership) {
        throw new common_1.ForbiddenException('無權存取此考卷');
    }
}
async function ensureQuestionAccess(prisma, actor, questionId) {
    const question = await prisma.question.findUnique({
        where: { id: questionId },
        select: { id: true, examId: true },
    });
    if (!question) {
        throw new common_1.NotFoundException('題目不存在');
    }
    await ensureExamAccess(prisma, actor, question.examId);
    return question.examId;
}
//# sourceMappingURL=access.js.map