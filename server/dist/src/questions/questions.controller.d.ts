import { QuestionsService } from './questions.service';
declare class QuestionItem {
    word1: string;
    word2: string;
}
export declare class BulkCreateDto {
    questions: QuestionItem[];
}
export declare class ReorderDto {
    questions: {
        id: number;
        orderNum: number;
    }[];
}
export declare class QuestionsController {
    private questionsService;
    constructor(questionsService: QuestionsService);
    findByExam(examId: number): Promise<{
        id: number;
        type: string;
        content: string | null;
        options: import("@prisma/client/runtime/client").JsonValue | null;
        answer: string | null;
        word1: string | null;
        word2: string | null;
        orderNum: number;
        examId: number;
    }[]>;
    create(examId: number, dto: QuestionItem & {
        orderNum: number;
    }): Promise<{
        id: number;
        type: string;
        content: string | null;
        options: import("@prisma/client/runtime/client").JsonValue | null;
        answer: string | null;
        word1: string | null;
        word2: string | null;
        orderNum: number;
        examId: number;
    }>;
    bulkCreate(examId: number, dto: BulkCreateDto): Promise<import("@prisma/client").Prisma.BatchPayload>;
    update(id: number, dto: Partial<QuestionItem>): Promise<{
        id: number;
        type: string;
        content: string | null;
        options: import("@prisma/client/runtime/client").JsonValue | null;
        answer: string | null;
        word1: string | null;
        word2: string | null;
        orderNum: number;
        examId: number;
    }>;
    reorder(dto: ReorderDto): Promise<{
        id: number;
        type: string;
        content: string | null;
        options: import("@prisma/client/runtime/client").JsonValue | null;
        answer: string | null;
        word1: string | null;
        word2: string | null;
        orderNum: number;
        examId: number;
    }[]>;
    delete(id: number): Promise<{
        id: number;
        type: string;
        content: string | null;
        options: import("@prisma/client/runtime/client").JsonValue | null;
        answer: string | null;
        word1: string | null;
        word2: string | null;
        orderNum: number;
        examId: number;
    }>;
}
export {};
