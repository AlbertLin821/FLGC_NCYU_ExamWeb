import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthService {
    private prisma;
    private jwtService;
    private readonly logger;
    constructor(prisma: PrismaService, jwtService: JwtService);
    validateTeacher(email: string, password: string): Promise<{
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
    login(email: string, password: string): Promise<{
        accessToken: string;
        teacher: {
            id: number;
            email: string;
            name: string;
            role: string;
        };
    }>;
    hashPassword(password: string): Promise<string>;
    validateStudent(studentId: string): Promise<{
        classes: ({
            class: {
                name: string;
                id: number;
            };
        } & {
            studentId: number;
            classId: number;
        })[];
    } & {
        name: string;
        createdAt: Date;
        id: number;
        studentId: string;
        schoolName: string;
        loginAttempts: number;
        lockedUntil: Date | null;
    }>;
    requestPasswordReset(email: string): Promise<{
        message: string;
        token: string;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        message: string;
    }>;
}
