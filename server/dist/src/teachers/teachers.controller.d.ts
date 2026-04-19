import { TeachersService } from './teachers.service';
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
    updatePassword(id: string, pass: string): Promise<{
        email: string;
        passwordHash: string;
        name: string;
        role: string;
        createdAt: Date;
        inviteToken: string | null;
        inviteExpires: Date | null;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        id: number;
    }>;
    invite(email: string): Promise<{
        email: string;
        token: string;
        expires: Date;
    }>;
}
