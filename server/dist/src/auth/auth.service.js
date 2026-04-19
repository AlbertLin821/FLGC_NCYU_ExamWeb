"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcryptjs"));
const crypto = __importStar(require("crypto"));
const prisma_service_1 = require("../prisma/prisma.service");
const common_2 = require("@nestjs/common");
let AuthService = AuthService_1 = class AuthService {
    prisma;
    jwtService;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async validateTeacher(email, password) {
        const teacher = await this.prisma.teacher.findUnique({ where: { email } });
        if (!teacher) {
            throw new common_1.UnauthorizedException('帳號或密碼錯誤');
        }
        const isValid = await bcrypt.compare(password, teacher.passwordHash);
        if (!isValid) {
            throw new common_1.UnauthorizedException('帳號或密碼錯誤');
        }
        return teacher;
    }
    async login(email, password) {
        const teacher = await this.validateTeacher(email, password);
        const payload = { sub: teacher.id, email: teacher.email, role: teacher.role };
        try {
            const accessToken = this.jwtService.sign(payload);
            return {
                accessToken,
                teacher: {
                    id: teacher.id,
                    email: teacher.email,
                    name: teacher.name,
                    role: teacher.role,
                },
            };
        }
        catch (err) {
            this.logger.error(`JWT 簽章失敗（請檢查 JWT_SECRET、JWT_EXPIRES_IN）：teacherId=${teacher.id}`, err instanceof Error ? err.stack : String(err));
            throw err;
        }
    }
    async hashPassword(password) {
        return bcrypt.hash(password, 12);
    }
    async validateStudent(studentId, name) {
        const student = await this.prisma.student.findUnique({
            where: { studentId },
        });
        if (!student || student.name !== name) {
            if (student) {
                const attempts = student.loginAttempts + 1;
                const updateData = { loginAttempts: attempts };
                if (attempts >= 3) {
                    updateData.lockedUntil = new Date(Date.now() + 10 * 60 * 1000);
                }
                await this.prisma.student.update({
                    where: { id: student.id },
                    data: updateData,
                });
            }
            throw new common_1.UnauthorizedException('學號或姓名錯誤');
        }
        if (student.lockedUntil && student.lockedUntil > new Date()) {
            const remainMinutes = Math.ceil((student.lockedUntil.getTime() - Date.now()) / 60000);
            throw new common_1.UnauthorizedException(`帳號已鎖定，請 ${remainMinutes} 分鐘後再試`);
        }
        await this.prisma.student.update({
            where: { id: student.id },
            data: { loginAttempts: 0, lockedUntil: null },
        });
        return student;
    }
    async requestPasswordReset(email) {
        const teacher = await this.prisma.teacher.findUnique({ where: { email } });
        if (!teacher) {
            throw new common_2.NotFoundException('找不到此電子郵件對應的帳號');
        }
        const token = crypto.randomInt(100000, 999999).toString();
        const expires = new Date(Date.now() + 3600000);
        await this.prisma.teacher.update({
            where: { id: teacher.id },
            data: {
                resetPasswordToken: token,
                resetPasswordExpires: expires,
            },
        });
        console.log(`Password reset token for ${email}: ${token}`);
        return { message: '重設密碼驗證碼已發送至您的信箱', token };
    }
    async resetPassword(token, newPassword) {
        const teacher = await this.prisma.teacher.findFirst({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { gt: new Date() },
            },
        });
        if (!teacher) {
            throw new common_2.BadRequestException('驗證碼無效或已過期');
        }
        const passwordHash = await this.hashPassword(newPassword);
        await this.prisma.teacher.update({
            where: { id: teacher.id },
            data: {
                passwordHash,
                resetPasswordToken: null,
                resetPasswordExpires: null,
            },
        });
        return { message: '密碼重設成功，請重新登入' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map