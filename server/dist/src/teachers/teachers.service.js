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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeachersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcryptjs"));
let TeachersService = class TeachersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return this.prisma.teacher.findMany({
            select: { id: true, email: true, name: true, role: true, createdAt: true },
        });
    }
    async findById(id) {
        return this.prisma.teacher.findUnique({
            where: { id },
            select: { id: true, email: true, name: true, role: true, createdAt: true },
        });
    }
    async findByEmail(email) {
        return this.prisma.teacher.findUnique({ where: { email } });
    }
    async create(data) {
        const passwordHash = await bcrypt.hash(data.password, 12);
        return this.prisma.teacher.create({
            data: {
                email: data.email,
                name: data.name,
                passwordHash,
                role: data.role || 'teacher',
            },
            select: { id: true, email: true, name: true, role: true, createdAt: true },
        });
    }
    async updatePassword(id, newPassword) {
        const trimmed = typeof newPassword === 'string' ? newPassword.trim() : '';
        if (trimmed.length === 0) {
            throw new common_1.BadRequestException('密碼不可為空白');
        }
        if (trimmed.length < 8) {
            throw new common_1.BadRequestException('密碼至少須 8 個字元');
        }
        const exists = await this.prisma.teacher.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!exists) {
            throw new common_1.NotFoundException('找不到此教師帳號');
        }
        const passwordHash = await bcrypt.hash(trimmed, 12);
        return this.prisma.teacher.update({
            where: { id },
            data: { passwordHash },
            select: { id: true, email: true, name: true, role: true, createdAt: true },
        });
    }
    async deleteTeacher(actorId, targetId) {
        if (actorId === targetId) {
            throw new common_1.BadRequestException('不可刪除目前登入中的帳號');
        }
        const target = await this.prisma.teacher.findUnique({ where: { id: targetId } });
        if (!target) {
            throw new common_1.NotFoundException('找不到此教師帳號');
        }
        if (target.role === 'admin') {
            const adminCount = await this.prisma.teacher.count({ where: { role: 'admin' } });
            if (adminCount <= 1) {
                throw new common_1.ConflictException('系統至少需保留一位管理員');
            }
        }
        const classCount = await this.prisma.class.count({ where: { createdBy: targetId } });
        if (classCount > 0) {
            throw new common_1.ConflictException(`此帳號為 ${classCount} 個班級的建立者，請先刪除相關班級或改由其他教師建立後再刪除帳號`);
        }
        const examCount = await this.prisma.exam.count({ where: { createdBy: targetId } });
        if (examCount > 0) {
            throw new common_1.ConflictException(`此帳號為 ${examCount} 份考卷的建立者，請先刪除或處理相關考卷後再刪除帳號`);
        }
        await this.prisma.cheatLog.updateMany({
            where: { resolvedBy: targetId },
            data: { resolvedBy: null },
        });
        await this.prisma.teacher.delete({ where: { id: targetId } });
        return { ok: true, id: targetId };
    }
    async inviteTeacher(email) {
        const token = Math.random().toString(36).substring(2, 15);
        const expires = new Date();
        expires.setHours(expires.getHours() + 24);
        await this.prisma.teacher.upsert({
            where: { email },
            update: {
                inviteToken: token,
                inviteExpires: expires,
            },
            create: {
                email,
                passwordHash: '',
                name: 'Pending Teacher',
                role: 'teacher',
                inviteToken: token,
                inviteExpires: expires,
            },
        });
        console.log(`[INVITE] Teacher invited: ${email}. Token: ${token}`);
        return { email, token, expires };
    }
    async verifyInvite(email, token) {
        const teacher = await this.prisma.teacher.findUnique({
            where: { email },
        });
        if (!teacher || teacher.inviteToken !== token || !teacher.inviteExpires || teacher.inviteExpires < new Date()) {
            return null;
        }
        await this.prisma.teacher.update({
            where: { id: teacher.id },
            data: {
                inviteToken: null,
                inviteExpires: null,
            },
        });
        return teacher;
    }
};
exports.TeachersService = TeachersService;
exports.TeachersService = TeachersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TeachersService);
//# sourceMappingURL=teachers.service.js.map