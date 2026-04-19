import { PrismaService } from '../prisma/prisma.service';
export declare class StudentsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAllPaginated(page?: number, limit?: number): Promise<{
        items: ({
            class: {
                name: string;
                id: number;
            };
        } & {
            name: string;
            createdAt: Date;
            id: number;
            studentId: string;
            loginAttempts: number;
            lockedUntil: Date | null;
            classId: number;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findByClass(classId: number, page?: number, limit?: number): Promise<({
        sessions: ({
            answers: ({
                question: {
                    id: number;
                    orderNum: number;
                    maxPoints: number;
                };
            } & {
                createdAt: Date;
                id: number;
                content: string | null;
                sessionId: number;
                aiModel: string | null;
                aiScore: import("@prisma/client-runtime-utils").Decimal | null;
                questionId: number;
                aiFeedback: string | null;
            })[];
            exam: {
                createdAt: Date;
                id: number;
                createdBy: number;
                title: string;
                difficulty: string | null;
                timeLimit: number;
                startTime: Date;
                endTime: Date;
                status: string;
                deletedAt: Date | null;
            };
        } & {
            id: number;
            studentId: number;
            status: string;
            examId: number;
            startedAt: Date | null;
            submittedAt: Date | null;
            overallFeedbackEn: string | null;
            overallFeedbackZh: string | null;
        })[];
    } & {
        name: string;
        createdAt: Date;
        id: number;
        studentId: string;
        loginAttempts: number;
        lockedUntil: Date | null;
        classId: number;
    })[] | {
        items: ({
            sessions: ({
                answers: ({
                    question: {
                        id: number;
                        orderNum: number;
                        maxPoints: number;
                    };
                } & {
                    createdAt: Date;
                    id: number;
                    content: string | null;
                    sessionId: number;
                    aiModel: string | null;
                    aiScore: import("@prisma/client-runtime-utils").Decimal | null;
                    questionId: number;
                    aiFeedback: string | null;
                })[];
                exam: {
                    createdAt: Date;
                    id: number;
                    createdBy: number;
                    title: string;
                    difficulty: string | null;
                    timeLimit: number;
                    startTime: Date;
                    endTime: Date;
                    status: string;
                    deletedAt: Date | null;
                };
            } & {
                id: number;
                studentId: number;
                status: string;
                examId: number;
                startedAt: Date | null;
                submittedAt: Date | null;
                overallFeedbackEn: string | null;
                overallFeedbackZh: string | null;
            })[];
        } & {
            name: string;
            createdAt: Date;
            id: number;
            studentId: string;
            loginAttempts: number;
            lockedUntil: Date | null;
            classId: number;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findById(id: number): Promise<({
        sessions: ({
            answers: ({
                question: {
                    id: number;
                    type: string;
                    content: string | null;
                    options: import("@prisma/client/runtime/client").JsonValue | null;
                    answer: string | null;
                    word1: string | null;
                    word2: string | null;
                    orderNum: number;
                    maxPoints: number;
                    examId: number;
                };
            } & {
                createdAt: Date;
                id: number;
                content: string | null;
                sessionId: number;
                aiModel: string | null;
                aiScore: import("@prisma/client-runtime-utils").Decimal | null;
                questionId: number;
                aiFeedback: string | null;
            })[];
            exam: {
                createdAt: Date;
                id: number;
                createdBy: number;
                title: string;
                difficulty: string | null;
                timeLimit: number;
                startTime: Date;
                endTime: Date;
                status: string;
                deletedAt: Date | null;
            };
        } & {
            id: number;
            studentId: number;
            status: string;
            examId: number;
            startedAt: Date | null;
            submittedAt: Date | null;
            overallFeedbackEn: string | null;
            overallFeedbackZh: string | null;
        })[];
    } & {
        name: string;
        createdAt: Date;
        id: number;
        studentId: string;
        loginAttempts: number;
        lockedUntil: Date | null;
        classId: number;
    }) | null>;
    bulkImport(students: {
        studentId: string;
        name: string;
    }[], classId: number): Promise<{
        created: number;
        updated: number;
        errors: string[];
    }>;
    create(data: {
        studentId: string;
        name: string;
        classId: number;
    }): Promise<{
        name: string;
        createdAt: Date;
        id: number;
        studentId: string;
        loginAttempts: number;
        lockedUntil: Date | null;
        classId: number;
    }>;
    update(id: number, data: {
        name?: string;
        classId?: number;
    }): Promise<{
        name: string;
        createdAt: Date;
        id: number;
        studentId: string;
        loginAttempts: number;
        lockedUntil: Date | null;
        classId: number;
    }>;
    delete(id: number): Promise<{
        name: string;
        createdAt: Date;
        id: number;
        studentId: string;
        loginAttempts: number;
        lockedUntil: Date | null;
        classId: number;
    }>;
    getStudentExams(studentId: number): Promise<{
        id: number;
        title: string;
        difficulty: string | null;
        timeLimit: number;
        questionCount: number;
        startTime: Date;
        endTime: Date;
        sessionStatus: string;
    }[]>;
}
