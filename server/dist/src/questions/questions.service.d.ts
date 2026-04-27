import { PrismaService } from '../prisma/prisma.service';
import { type TeacherActor } from '../auth/access';
export declare class QuestionsService {
    private prisma;
    constructor(prisma: PrismaService);
    findByExam(examId: number, actor: TeacherActor): Promise<{
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
    }, actor: TeacherActor): Promise<{
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
    }, actor: TeacherActor): Promise<{
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
    delete(id: number, actor: TeacherActor): Promise<{
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
    }[], actor: TeacherActor): Promise<import("@prisma/client").Prisma.BatchPayload>;
    reorder(questions: {
        id: number;
        orderNum: number;
    }[], actor: TeacherActor): Promise<{
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
