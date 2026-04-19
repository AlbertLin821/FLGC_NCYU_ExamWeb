import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScoringService } from '../scoring/scoring.service';
export declare class ExamsService {
    private prisma;
    private scoringService;
    constructor(prisma: PrismaService, scoringService: ScoringService);
    findAll(classId?: number, page?: number, limit?: number): Promise<({
        examClasses: ({
            class: {
                name: string;
                id: number;
            };
        } & {
            classId: number;
            examId: number;
        })[];
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
        deletedAt: Date | null;
    })[] | {
        items: ({
            examClasses: ({
                class: {
                    name: string;
                    id: number;
                };
            } & {
                classId: number;
                examId: number;
            })[];
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
            deletedAt: Date | null;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findById(id: number): Promise<({
        examClasses: ({
            class: {
                name: string;
                id: number;
            };
        } & {
            classId: number;
            examId: number;
        })[];
        questions: {
            id: number;
            type: string;
            content: string | null;
            options: Prisma.JsonValue | null;
            answer: string | null;
            word1: string | null;
            word2: string | null;
            orderNum: number;
            maxPoints: number;
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
        deletedAt: Date | null;
    }) | null>;
    create(data: {
        title: string;
        classIds: number[];
        difficulty?: string;
        timeLimit: number;
        startTime: string;
        endTime: string;
        createdBy: number;
    }): Promise<{
        examClasses: ({
            class: {
                name: string;
                id: number;
            };
        } & {
            classId: number;
            examId: number;
        })[];
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
        deletedAt: Date | null;
    }>;
    update(id: number, data: Partial<{
        title: string;
        classIds: number[];
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
        deletedAt: Date | null;
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
        deletedAt: Date | null;
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
        deletedAt: Date | null;
    }>;
    startSession(studentId: number, examId: number): Promise<{
        session: {
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
        };
        questions: {
            id: number;
            type: string;
            content: string | null;
            options: Prisma.JsonValue | null;
            answer: string | null;
            word1: string | null;
            word2: string | null;
            orderNum: number;
            maxPoints: number;
            examId: number;
        }[];
        timeLimit: number;
        timeRemainingSeconds: number;
    }>;
    submitAnswer(sessionId: number, questionId: number, content: string): Promise<{
        createdAt: Date;
        id: number;
        content: string | null;
        sessionId: number;
        aiScore: Prisma.Decimal | null;
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
                maxPoints: number;
            };
        } & {
            createdAt: Date;
            id: number;
            content: string | null;
            sessionId: number;
            aiScore: Prisma.Decimal | null;
            questionId: number;
            aiFeedback: string | null;
            aiModel: string | null;
        })[];
        exam: {
            title: string;
        };
        student: {
            name: string;
            id: number;
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
                    maxPoints: number;
                };
            } & {
                createdAt: Date;
                id: number;
                content: string | null;
                sessionId: number;
                aiScore: Prisma.Decimal | null;
                questionId: number;
                aiFeedback: string | null;
                aiModel: string | null;
            })[];
            exam: {
                title: string;
            };
            student: {
                name: string;
                id: number;
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
