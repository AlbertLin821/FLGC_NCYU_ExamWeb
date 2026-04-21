import { ClassesService } from './classes.service';
export declare class CreateClassDto {
    name: string;
    description?: string;
}
export declare class AddTeacherDto {
    teacherId: number;
}
export declare class ClassesController {
    private classesService;
    constructor(classesService: ClassesService);
    findAll(req: any, page?: string, limit?: string): Promise<({
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
    findOne(id: number): Promise<({
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
    getStats(id: number): Promise<{
        average: number;
        max: number;
        totalAnswered: number;
    }>;
    create(dto: CreateClassDto, req: any): Promise<{
        name: string;
        createdAt: Date;
        id: number;
        description: string | null;
        createdBy: number;
    }>;
    update(id: number, dto: CreateClassDto): Promise<{
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
    addTeacher(id: number, dto: AddTeacherDto): Promise<{
        role: string;
        teacherId: number;
        classId: number;
    }>;
    removeTeacher(id: number, teacherId: number): Promise<{
        role: string;
        teacherId: number;
        classId: number;
    }>;
}
