import { StudentsService } from './students.service';
declare class StudentImportItem {
    studentId: string;
    name: string;
}
export declare class BulkImportDto {
    students: StudentImportItem[];
    classId: number;
}
export declare class CreateStudentDto {
    studentId: string;
    name: string;
    classId: number;
}
export declare class StudentsController {
    private studentsService;
    constructor(studentsService: StudentsService);
    findByClass(classId: number, page?: string, limit?: string): Promise<({
        sessions: ({
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
        })[];
    } & {
        name: string;
        createdAt: Date;
        id: number;
        studentId: string;
        loginAttempts: number;
        lockedUntil: Date | null;
        classId: number;
    })[] | {
        items: ({
            sessions: ({
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
            })[];
        } & {
            name: string;
            createdAt: Date;
            id: number;
            studentId: string;
            loginAttempts: number;
            lockedUntil: Date | null;
            classId: number;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findOne(id: number): Promise<({
        sessions: ({
            answers: ({
                question: {
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
                };
            } & {
                createdAt: Date;
                id: number;
                content: string | null;
                sessionId: number;
                aiScore: import("@prisma/client-runtime-utils").Decimal | null;
                questionId: number;
                aiFeedback: string | null;
                aiModel: string | null;
            })[];
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
        })[];
    } & {
        name: string;
        createdAt: Date;
        id: number;
        studentId: string;
        loginAttempts: number;
        lockedUntil: Date | null;
        classId: number;
    }) | null>;
    getStudentExams(id: number): Promise<{
        id: number;
        title: string;
        difficulty: string | null;
        timeLimit: number;
        questionCount: number;
        startTime: Date;
        endTime: Date;
        sessionStatus: string;
    }[]>;
    bulkImport(dto: BulkImportDto): Promise<{
        created: number;
        updated: number;
        errors: string[];
    }>;
    create(dto: CreateStudentDto): Promise<{
        name: string;
        createdAt: Date;
        id: number;
        studentId: string;
        loginAttempts: number;
        lockedUntil: Date | null;
        classId: number;
    }>;
    update(id: number, dto: Partial<CreateStudentDto>): Promise<{
        name: string;
        createdAt: Date;
        id: number;
        studentId: string;
        loginAttempts: number;
        lockedUntil: Date | null;
        classId: number;
    }>;
    delete(id: number): Promise<{
        name: string;
        createdAt: Date;
        id: number;
        studentId: string;
        loginAttempts: number;
        lockedUntil: Date | null;
        classId: number;
    }>;
}
export {};
