import { PrismaService } from '../prisma/prisma.service';
import { ScoringService } from '../scoring/scoring.service';
export declare class ExamsService {
    private prisma;
    private scoringService;
    constructor(prisma: PrismaService, scoringService: ScoringService);
    findAll(classId?: number, page?: number, limit?: number): Promise<({
        class: {
            name: string;
            id: number;
        };
        _count: {
            sessions: number;
            questions: number;
        };
    } & {
        createdAt: Date;
        id: number;
        createdBy: number;
        title: string;
        difficulty: string | null;
        timeLimit: number;
        startTime: Date;
        endTime: Date;
        status: string;
        classId: number;
    })[] | {
        items: ({
            class: {
                name: string;
                id: number;
            };
            _count: {
                sessions: number;
                questions: number;
            };
        } & {
            createdAt: Date;
            id: number;
            createdBy: number;
            title: string;
            difficulty: string | null;
            timeLimit: number;
            startTime: Date;
            endTime: Date;
            status: string;
            classId: number;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findById(id: number): Promise<({
        class: {
            name: string;
            id: number;
        };
        questions: {
            id: number;
            type: string;
            content: string | null;
            options: import("@prisma/client/runtime/client").JsonValue | null;
            answer: string | null;
            word1: string | null;
            word2: string | null;
            orderNum: number;
            examId: number;
        }[];
    } & {
        createdAt: Date;
        id: number;
        createdBy: number;
        title: string;
        difficulty: string | null;
        timeLimit: number;
        startTime: Date;
        endTime: Date;
        status: string;
        classId: number;
    }) | null>;
    create(data: {
        title: string;
        classId: number;
        difficulty?: string;
        timeLimit: number;
        startTime: string;
        endTime: string;
        createdBy: number;
    }): Promise<{
        createdAt: Date;
        id: number;
        createdBy: number;
        title: string;
        difficulty: string | null;
        timeLimit: number;
        startTime: Date;
        endTime: Date;
        status: string;
        classId: number;
    }>;
    update(id: number, data: Partial<{
        title: string;
        difficulty: string;
        timeLimit: number;
        startTime: string;
        endTime: string;
        status: string;
    }>): Promise<{
        createdAt: Date;
        id: number;
        createdBy: number;
        title: string;
        difficulty: string | null;
        timeLimit: number;
        startTime: Date;
        endTime: Date;
        status: string;
        classId: number;
    }>;
    delete(id: number): Promise<{
        createdAt: Date;
        id: number;
        createdBy: number;
        title: string;
        difficulty: string | null;
        timeLimit: number;
        startTime: Date;
        endTime: Date;
        status: string;
        classId: number;
    }>;
    publish(id: number): Promise<{
        createdAt: Date;
        id: number;
        createdBy: number;
        title: string;
        difficulty: string | null;
        timeLimit: number;
        startTime: Date;
        endTime: Date;
        status: string;
        classId: number;
    }>;
    startSession(studentId: number, examId: number): Promise<{
        session: {
            id: number;
            studentId: number;
            status: string;
            examId: number;
            startedAt: Date | null;
            submittedAt: Date | null;
        };
        questions: {
            id: number;
            type: string;
            content: string | null;
            options: import("@prisma/client/runtime/client").JsonValue | null;
            answer: string | null;
            word1: string | null;
            word2: string | null;
            orderNum: number;
            examId: number;
        }[];
        timeLimit: number;
    }>;
    submitAnswer(sessionId: number, questionId: number, content: string): Promise<{
        createdAt: Date;
        id: number;
        content: string | null;
        aiScore: import("@prisma/client-runtime-utils").Decimal | null;
        sessionId: number;
        questionId: number;
        aiFeedback: string | null;
        aiModel: string | null;
    }>;
    submitExam(sessionId: number): Promise<{
        id: number;
        studentId: number;
        status: string;
        examId: number;
        startedAt: Date | null;
        submittedAt: Date | null;
    }>;
    getResults(classId: number, examId?: number, page?: number, limit?: number): Promise<({
        answers: ({
            question: {
                word1: string | null;
                word2: string | null;
            };
        } & {
            createdAt: Date;
            id: number;
            content: string | null;
            aiScore: import("@prisma/client-runtime-utils").Decimal | null;
            sessionId: number;
            questionId: number;
            aiFeedback: string | null;
            aiModel: string | null;
        })[];
        exam: {
            title: string;
        };
        student: {
            name: string;
            studentId: string;
        };
    } & {
        id: number;
        studentId: number;
        status: string;
        examId: number;
        startedAt: Date | null;
        submittedAt: Date | null;
    })[] | {
        items: ({
            answers: ({
                question: {
                    word1: string | null;
                    word2: string | null;
                };
            } & {
                createdAt: Date;
                id: number;
                content: string | null;
                aiScore: import("@prisma/client-runtime-utils").Decimal | null;
                sessionId: number;
                questionId: number;
                aiFeedback: string | null;
                aiModel: string | null;
            })[];
            exam: {
                title: string;
            };
            student: {
                name: string;
                studentId: string;
            };
        } & {
            id: number;
            studentId: number;
            status: string;
            examId: number;
            startedAt: Date | null;
            submittedAt: Date | null;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
}
