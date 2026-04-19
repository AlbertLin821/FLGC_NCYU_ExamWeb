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
    findOne(id: number): Promise<({
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
            options: import("@prisma/client/runtime/client").JsonValue | null;
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
    create(dto: CreateExamDto, req: any): Promise<{
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
    update(id: number, dto: UpdateExamDto): Promise<{
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
    startExam(examId: number, studentId: number): Promise<{
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
            maxPoints: number;
            examId: number;
        }[];
        timeLimit: number;
    }>;
    submitAnswer(sessionId: number, dto: SubmitAnswerDto): Promise<{
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
    getResults(classId: number, examId?: string, page?: string, limit?: string): Promise<({
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
