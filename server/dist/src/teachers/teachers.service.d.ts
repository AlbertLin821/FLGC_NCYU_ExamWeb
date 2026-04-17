import { PrismaService } from '../prisma/prisma.service';
export declare class TeachersService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        email: string;
        name: string;
        role: string;
        createdAt: Date;
        id: number;
    }[]>;
    findById(id: number): Promise<{
        email: string;
        name: string;
        role: string;
        createdAt: Date;
        id: number;
    } | null>;
    findByEmail(email: string): Promise<{
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
    } | null>;
    create(data: any): Promise<{
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
    updatePassword(id: number, newPassword: string): Promise<{
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
    inviteTeacher(email: string): Promise<{
        email: string;
        token: string;
        expires: Date;
    }>;
    verifyInvite(email: string, token: string): Promise<{
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
    } | null>;
}
