import { TeachersService } from './teachers.service';
export declare class UpdatePasswordDto {
    password: string;
}
export declare class CreateTeacherDto {
    email: string;
    password: string;
    name: string;
    role?: string;
}
export declare class TeachersController {
    private teachersService;
    constructor(teachersService: TeachersService);
    getProfile(req: any): Promise<{
        email: string;
        name: string;
        role: string;
        createdAt: Date;
        id: number;
    } | null>;
    findAll(): Promise<{
        email: string;
        name: string;
        role: string;
        createdAt: Date;
        id: number;
    }[]>;
    create(dto: CreateTeacherDto): Promise<{
        email: string;
        name: string;
        role: string;
        createdAt: Date;
        id: number;
    }>;
    updatePassword(id: string, dto: UpdatePasswordDto): Promise<{
        email: string;
        name: string;
        role: string;
        createdAt: Date;
        id: number;
    }>;
    invite(email: string): Promise<{
        email: string;
        token: string;
        expires: Date;
    }>;
    remove(req: {
        user: {
            id: number;
        };
    }, id: string): Promise<{
        ok: boolean;
        id: number;
    }>;
}
