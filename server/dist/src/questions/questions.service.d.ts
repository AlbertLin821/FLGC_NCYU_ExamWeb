import { PrismaService } from '../prisma/prisma.service';
export declare class QuestionsService {
    private prisma;
    constructor(prisma: PrismaService);
    findByExam(examId: number): Promise<{
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
    }[]>;
    create(data: {
        examId: number;
        type?: string;
        content?: string;
        options?: any;
        answer?: string;
        word1?: string;
        word2?: string;
        orderNum: number;
        maxPoints?: number;
    }): Promise<{
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
    }>;
    update(id: number, data: {
        type?: string;
        content?: string;
        options?: any;
        answer?: string;
        word1?: string;
        word2?: string;
        orderNum?: number;
        maxPoints?: number;
    }): Promise<{
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
    }>;
    delete(id: number): Promise<{
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
    }>;
    bulkCreate(examId: number, questions: {
        word1?: string;
        word2?: string;
        [key: string]: any;
    }[]): Promise<import("@prisma/client").Prisma.BatchPayload>;
    reorder(questions: {
        id: number;
        orderNum: number;
    }[]): Promise<{
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
    }[]>;
}
