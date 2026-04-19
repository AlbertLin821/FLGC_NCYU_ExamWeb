import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScoringService } from '../scoring/scoring.service';
export declare class ExamsService {
    private prisma;
    private scoringService;
    constructor(prisma: PrismaService, scoringService: ScoringService);
    findAll(classId?: number, page?: number, limit?: number): Promise<({
        _count: {
            questions: number;
            sessions: number;
        };
        examClasses: ({
            class: {
                id: number;
                name: string;
            };
        } & {
            examId: number;
            classId: number;
        })[];
    } & {
        id: number;
        createdAt: Date;
        status: string;
        title: string;
        difficulty: string | null;
        timeLimit: number;
        startTime: Date;
        endTime: Date;
        createdBy: number;
        deletedAt: Date | null;
    })[] | {
        items: ({
            _count: {
                questions: number;
                sessions: number;
            };
            examClasses: ({
                class: {
                    id: number;
                    name: string;
                };
            } & {
                examId: number;
                classId: number;
            })[];
        } & {
            id: number;
            createdAt: Date;
            status: string;
            title: string;
            difficulty: string | null;
            timeLimit: number;
            startTime: Date;
            endTime: Date;
            createdBy: number;
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
                id: number;
                name: string;
            };
        } & {
            examId: number;
            classId: number;
        })[];
        questions: {
            id: number;
            content: string | null;
            answer: string | null;
            examId: number;
            type: string;
            options: Prisma.JsonValue | null;
            word1: string | null;
            word2: string | null;
            orderNum: number;
            maxPoints: number;
        }[];
    } & {
        id: number;
        createdAt: Date;
        status: string;
        title: string;
        difficulty: string | null;
        timeLimit: number;
        startTime: Date;
        endTime: Date;
        createdBy: number;
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
                id: number;
                name: string;
            };
        } & {
            examId: number;
            classId: number;
        })[];
    } & {
        id: number;
        createdAt: Date;
        status: string;
        title: string;
        difficulty: string | null;
        timeLimit: number;
        startTime: Date;
        endTime: Date;
        createdBy: number;
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
        id: number;
        createdAt: Date;
        status: string;
        title: string;
        difficulty: string | null;
        timeLimit: number;
        startTime: Date;
        endTime: Date;
        createdBy: number;
        deletedAt: Date | null;
    }>;
    delete(id: number): Promise<{
        id: number;
        createdAt: Date;
        status: string;
        title: string;
        difficulty: string | null;
        timeLimit: number;
        startTime: Date;
        endTime: Date;
        createdBy: number;
        deletedAt: Date | null;
    }>;
    publish(id: number): Promise<{
        id: number;
        createdAt: Date;
        status: string;
        title: string;
        difficulty: string | null;
        timeLimit: number;
        startTime: Date;
        endTime: Date;
        createdBy: number;
        deletedAt: Date | null;
    }>;
    startSession(studentId: number, examId: number): Promise<{
        session: {
            exam: {
                id: number;
                createdAt: Date;
                status: string;
                title: string;
                difficulty: string | null;
                timeLimit: number;
                startTime: Date;
                endTime: Date;
                createdBy: number;
                deletedAt: Date | null;
            };
        } & {
            id: number;
            examId: number;
            studentId: number;
            status: string;
            startedAt: Date | null;
            submittedAt: Date | null;
            overallFeedbackEn: string | null;
            overallFeedbackZh: string | null;
        };
        questions: {
            id: number;
            content: string | null;
            answer: string | null;
            examId: number;
            type: string;
            options: Prisma.JsonValue | null;
            word1: string | null;
            word2: string | null;
            orderNum: number;
            maxPoints: number;
        }[];
        timeLimit: number;
        timeRemainingSeconds: number;
    }>;
    submitAnswer(sessionId: number, questionId: number, content: string): Promise<{
        id: number;
        sessionId: number;
        questionId: number;
        content: string | null;
        aiScore: Prisma.Decimal | null;
        aiFeedback: string | null;
        aiModel: string | null;
        createdAt: Date;
    }>;
    submitExam(sessionId: number): Promise<{
        id: number;
        examId: number;
        studentId: number;
        status: string;
        startedAt: Date | null;
        submittedAt: Date | null;
        overallFeedbackEn: string | null;
        overallFeedbackZh: string | null;
    }>;
    getResults(classId: number, examId?: number, page?: number, limit?: number): Promise<({
        exam: {
            title: string;
        };
        answers: ({
            question: {
                id: number;
                word1: string | null;
                word2: string | null;
                orderNum: number;
                maxPoints: number;
            };
        } & {
            id: number;
            sessionId: number;
            questionId: number;
            content: string | null;
            aiScore: Prisma.Decimal | null;
            aiFeedback: string | null;
            aiModel: string | null;
            createdAt: Date;
        })[];
        student: {
            id: number;
            name: string;
            studentId: string;
        };
    } & {
        id: number;
        examId: number;
        studentId: number;
        status: string;
        startedAt: Date | null;
        submittedAt: Date | null;
        overallFeedbackEn: string | null;
        overallFeedbackZh: string | null;
    } & {
        hasPendingReview: boolean;
    })[] | {
        items: ({
            exam: {
                title: string;
            };
            answers: ({
                question: {
                    id: number;
                    word1: string | null;
                    word2: string | null;
                    orderNum: number;
                    maxPoints: number;
                };
            } & {
                id: number;
                sessionId: number;
                questionId: number;
                content: string | null;
                aiScore: Prisma.Decimal | null;
                aiFeedback: string | null;
                aiModel: string | null;
                createdAt: Date;
            })[];
            student: {
                id: number;
                name: string;
                studentId: string;
            };
        } & {
            id: number;
            examId: number;
            studentId: number;
            status: string;
            startedAt: Date | null;
            submittedAt: Date | null;
            overallFeedbackEn: string | null;
            overallFeedbackZh: string | null;
        } & {
            hasPendingReview: boolean;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
}
