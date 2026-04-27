import { PrismaService } from '../prisma/prisma.service';
export type TeacherActor = {
    id: number;
    role: string;
};
export declare function isAdminRole(role: string): boolean;
export declare function isViewerRole(role: string): boolean;
export declare function ensureRoleCanGrade(role: string): void;
export declare function ensureClassAccess(prisma: PrismaService, actor: TeacherActor, classId: number): Promise<void>;
export declare function ensureStudentAccess(prisma: PrismaService, actor: TeacherActor, studentId: number): Promise<number>;
export declare function ensureExamAccess(prisma: PrismaService, actor: TeacherActor, examId: number): Promise<void>;
export declare function ensureQuestionAccess(prisma: PrismaService, actor: TeacherActor, questionId: number): Promise<number>;
