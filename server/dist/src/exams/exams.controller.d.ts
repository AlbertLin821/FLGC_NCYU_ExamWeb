import { ExamsService } from './exams.service';
export declare class CreateExamDto {
    title: string;
    classId: number;
    difficulty?: string;
    timeLimit: number;
    startTime: string;
    endTime: string;
}
export declare class SubmitAnswerDto {
    questionId: number;
    content: string;
}
export declare class ExamsController {
    private examsService;
    constructor(examsService: ExamsService);
    findAll(classId?: string, page?: string, limit?: string): Promise<({
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
    findOne(id: number): Promise<({
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
    create(dto: CreateExamDto, req: any): Promise<{
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
    update(id: number, dto: Partial<CreateExamDto>): Promise<{
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
