import { AuthService } from './auth.service';
export declare class TeacherLoginDto {
    email: string;
    password: string;
}
export declare class StudentLoginDto {
    studentId: string;
    name: string;
}
export declare class RequestResetDto {
    email: string;
}
export declare class ResetPasswordDto {
    token: string;
    newPassword: string;
}
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    teacherLogin(dto: TeacherLoginDto): Promise<{
        accessToken: string;
        teacher: {
            id: number;
            email: string;
            name: string;
            role: string;
        };
    }>;
    studentVerify(dto: StudentLoginDto): Promise<{
        student: {
            id: number;
            studentId: string;
            name: string;
            classId: number;
        };
    }>;
    requestReset(dto: RequestResetDto): Promise<{
        message: string;
        token: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
}
