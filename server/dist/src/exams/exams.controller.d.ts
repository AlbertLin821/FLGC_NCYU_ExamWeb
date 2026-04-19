import { ExamsService } from './exams.service';
export declare class CreateExamDto {
    title: string;
    classIds: number[];
    difficulty?: string;
    timeLimit: number;
    startTime: string;
    endTime: string;
}
export declare class UpdateExamDto {
    title?: string;
    classIds?: number[];
    difficulty?: string;
    timeLimit?: number;
    startTime?: string;
    endTime?: string;
    status?: string;
}
export declare class SubmitAnswerDto {
    questionId: number;
    content: string;
}
export declare class ExamsController {
    private examsService;
    constructor(examsService: ExamsService);
    findAll(classId?: string, page?: string, limit?: string): Promise<({
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
    getResults(classId: number, examId?: string, page?: string, limit?: string): Promise<({
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
            aiScore: import("@prisma/client-runtime-utils").Decimal | null;
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
                aiScore: import("@prisma/client-runtime-utils").Decimal | null;
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
    findOne(id: number): Promise<({
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
            options: import("@prisma/client/runtime/client").JsonValue | null;
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
    create(dto: CreateExamDto, req: any): Promise<{
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
    update(id: number, dto: UpdateExamDto): Promise<{
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
    startExam(examId: number, studentId: number): Promise<{
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
            options: import("@prisma/client/runtime/client").JsonValue | null;
            word1: string | null;
            word2: string | null;
            orderNum: number;
            maxPoints: number;
        }[];
        timeLimit: number;
        timeRemainingSeconds: number;
    }>;
    submitAnswer(sessionId: number, dto: SubmitAnswerDto): Promise<{
        id: number;
        sessionId: number;
        questionId: number;
        content: string | null;
        aiScore: import("@prisma/client-runtime-utils").Decimal | null;
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
}
