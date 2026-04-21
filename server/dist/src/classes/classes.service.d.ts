import { PrismaService } from '../prisma/prisma.service';
export declare class ClassesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(teacherId: number, page?: number, limit?: number): Promise<({
        teachers: ({
            teacher: {
                email: string;
                name: string;
                id: number;
            };
        } & {
            role: string;
            teacherId: number;
            classId: number;
        })[];
        _count: {
            students: number;
        };
    } & {
        name: string;
        createdAt: Date;
        id: number;
        description: string | null;
        createdBy: number;
    })[] | {
        items: ({
            teachers: ({
                teacher: {
                    email: string;
                    name: string;
                    id: number;
                };
            } & {
                role: string;
                teacherId: number;
                classId: number;
            })[];
            _count: {
                students: number;
            };
        } & {
            name: string;
            createdAt: Date;
            id: number;
            description: string | null;
            createdBy: number;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findById(id: number): Promise<({
        students: {
            name: string;
            createdAt: Date;
            id: number;
            studentId: string;
            schoolName: string;
            loginAttempts: number;
            lockedUntil: Date | null;
            classId: number;
        }[];
        _count: {
            students: number;
        };
    } & {
        name: string;
        createdAt: Date;
        id: number;
        description: string | null;
        createdBy: number;
    }) | null>;
    create(data: {
        name: string;
        description?: string;
    }, teacherId: number): Promise<{
        name: string;
        createdAt: Date;
        id: number;
        description: string | null;
        createdBy: number;
    }>;
    update(id: number, data: {
        name?: string;
        description?: string;
    }): Promise<{
        name: string;
        createdAt: Date;
        id: number;
        description: string | null;
        createdBy: number;
    }>;
    delete(id: number): Promise<{
        name: string;
        createdAt: Date;
        id: number;
        description: string | null;
        createdBy: number;
    }>;
    addTeacher(classId: number, teacherId: number): Promise<{
        role: string;
        teacherId: number;
        classId: number;
    }>;
    removeTeacher(classId: number, teacherId: number): Promise<{
        role: string;
        teacherId: number;
        classId: number;
    }>;
    getClassStats(classId: number): Promise<{
        average: number;
        max: number;
        totalAnswered: number;
    }>;
}
