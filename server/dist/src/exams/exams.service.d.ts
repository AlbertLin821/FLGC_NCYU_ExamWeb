import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScoringService } from '../scoring/scoring.service';
import { type TeacherActor } from '../auth/access';
export declare class ExamsService {
    private prisma;
    private scoringService;
    constructor(prisma: PrismaService, scoringService: ScoringService);
    findAll(actor: TeacherActor, classId?: number, page?: number, limit?: number): Promise<({
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
    findById(id: number, actor: TeacherActor): Promise<({
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
    }, actor: TeacherActor): Promise<{
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
    }>, actor: TeacherActor): Promise<{
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
    delete(id: number, actor: TeacherActor): Promise<{
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
    publish(id: number, actor: TeacherActor): Promise<{
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
    unpublish(id: number, actor: TeacherActor): Promise<{
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
            answeredQuestionCount: number;
            overallFeedbackEn: string | null;
            overallFeedbackZh: string | null;
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
        aiModel: string | null;
        aiScore: Prisma.Decimal | null;
        questionId: number;
        aiFeedback: string | null;
    }>;
    submitExam(sessionId: number): Promise<{
        id: number;
        studentId: number;
        status: string;
        examId: number;
        startedAt: Date | null;
        submittedAt: Date | null;
        answeredQuestionCount: number;
        overallFeedbackEn: string | null;
        overallFeedbackZh: string | null;
    }>;
    getResults(actor: TeacherActor, classId: number, examId?: number, page?: number, limit?: number): Promise<({
        student: {
            name: string;
            id: number;
            studentId: string;
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
            createdAt: Date;
            id: number;
            content: string | null;
            sessionId: number;
            aiModel: string | null;
            aiScore: Prisma.Decimal | null;
            questionId: number;
            aiFeedback: string | null;
        })[];
        exam: {
            title: string;
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
    } & {
        hasPendingReview: boolean;
    })[] | {
        items: ({
            student: {
                name: string;
                id: number;
                studentId: string;
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
                createdAt: Date;
                id: number;
                content: string | null;
                sessionId: number;
                aiModel: string | null;
                aiScore: Prisma.Decimal | null;
                questionId: number;
                aiFeedback: string | null;
            })[];
            exam: {
                title: string;
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
        } & {
            hasPendingReview: boolean;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
}
