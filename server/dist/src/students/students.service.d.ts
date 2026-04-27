import { PrismaService } from '../prisma/prisma.service';
import { type TeacherActor } from '../auth/access';
export declare class StudentsService {
    private prisma;
    constructor(prisma: PrismaService);
    private getActorVisibleClassIds;
    findAllPaginated(page?: number, limit?: number): Promise<{
        items: ({
            classes: ({
                class: {
                    name: string;
                    id: number;
                };
            } & {
                studentId: number;
                classId: number;
            })[];
        } & {
            name: string;
            createdAt: Date;
            id: number;
            studentId: string;
            schoolName: string;
            loginAttempts: number;
            lockedUntil: Date | null;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findByClass(classId: number, actor: TeacherActor, page?: number, limit?: number): Promise<({
        classes: ({
            class: {
                name: string;
                id: number;
            };
        } & {
            studentId: number;
            classId: number;
        })[];
        sessions: ({
            answers: {
                question: {
                    maxPoints: number;
                };
                aiScore: import("@prisma/client-runtime-utils").Decimal | null;
            }[];
            exam: {
                title: string;
                startTime: Date;
                endTime: Date;
            };
        } & {
            id: number;
            studentId: number;
            status: string;
            examId: number;
            startedAt: Date | null;
            submittedAt: Date | null;
            answeredQuestionCount: number;
            overallFeedbackEn: string | null;
            overallFeedbackZh: string | null;
        })[];
    } & {
        name: string;
        createdAt: Date;
        id: number;
        studentId: string;
        schoolName: string;
        loginAttempts: number;
        lockedUntil: Date | null;
    })[] | {
        items: ({
            classes: ({
                class: {
                    name: string;
                    id: number;
                };
            } & {
                studentId: number;
                classId: number;
            })[];
            sessions: ({
                answers: {
                    question: {
                        maxPoints: number;
                    };
                    aiScore: import("@prisma/client-runtime-utils").Decimal | null;
                }[];
                exam: {
                    title: string;
                    startTime: Date;
                    endTime: Date;
                };
            } & {
                id: number;
                studentId: number;
                status: string;
                examId: number;
                startedAt: Date | null;
                submittedAt: Date | null;
                answeredQuestionCount: number;
                overallFeedbackEn: string | null;
                overallFeedbackZh: string | null;
            })[];
        } & {
            name: string;
            createdAt: Date;
            id: number;
            studentId: string;
            schoolName: string;
            loginAttempts: number;
            lockedUntil: Date | null;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findById(id: number, actor: TeacherActor): Promise<({
        classes: ({
            class: {
                name: string;
                id: number;
            };
        } & {
            studentId: number;
            classId: number;
        })[];
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
            answeredQuestionCount: number;
            overallFeedbackEn: string | null;
            overallFeedbackZh: string | null;
        })[];
    } & {
        name: string;
        createdAt: Date;
        id: number;
        studentId: string;
        schoolName: string;
        loginAttempts: number;
        lockedUntil: Date | null;
    }) | null>;
    bulkImport(students: {
        studentId: string;
        name: string;
        schoolName: string;
    }[], classId: number, actor: TeacherActor): Promise<{
        created: number;
        updated: number;
        errors: string[];
    }>;
    create(data: {
        studentId: string;
        name: string;
        schoolName: string;
        classId: number;
    }, actor: TeacherActor): Promise<{
        classes: ({
            class: {
                name: string;
                id: number;
            };
        } & {
            studentId: number;
            classId: number;
        })[];
    } & {
        name: string;
        createdAt: Date;
        id: number;
        studentId: string;
        schoolName: string;
        loginAttempts: number;
        lockedUntil: Date | null;
    }>;
    update(id: number, data: {
        name?: string;
        schoolName?: string;
    }, actor: TeacherActor): Promise<{
        name: string;
        createdAt: Date;
        id: number;
        studentId: string;
        schoolName: string;
        loginAttempts: number;
        lockedUntil: Date | null;
    }>;
    delete(id: number, actor: TeacherActor, classId?: number): Promise<{
        name: string;
        createdAt: Date;
        id: number;
        studentId: string;
        schoolName: string;
        loginAttempts: number;
        lockedUntil: Date | null;
    } | {
        ok: boolean;
        removedClassId: number;
        deletedStudent: boolean;
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
