"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeachersController = exports.CreateTeacherDto = exports.UpdatePasswordDto = void 0;
const common_1 = require("@nestjs/common");
const teachers_service_1 = require("./teachers.service");
const guards_1 = require("../auth/guards");
const class_validator_1 = require("class-validator");
class UpdatePasswordDto {
    password;
}
exports.UpdatePasswordDto = UpdatePasswordDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(8, { message: '密碼至少須 8 個字元' }),
    __metadata("design:type", String)
], UpdatePasswordDto.prototype, "password", void 0);
class CreateTeacherDto {
    email;
    password;
    name;
    role;
}
exports.CreateTeacherDto = CreateTeacherDto;
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateTeacherDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, { message: '密碼至少須 8 個字元' }),
    __metadata("design:type", String)
], CreateTeacherDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTeacherDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTeacherDto.prototype, "role", void 0);
let TeachersController = class TeachersController {
    teachersService;
    constructor(teachersService) {
        this.teachersService = teachersService;
    }
    getProfile(req) {
        return this.teachersService.findById(req.user.id);
    }
    findAll() {
        return this.teachersService.findAll();
    }
    create(dto) {
        return this.teachersService.create(dto);
    }
    updatePassword(id, dto) {
        const tid = Number.parseInt(id, 10);
        if (!Number.isFinite(tid) || tid < 1) {
            throw new common_1.BadRequestException('無效的教師編號');
        }
        return this.teachersService.updatePassword(tid, dto.password);
    }
    invite(email) {
        return this.teachersService.inviteTeacher(email);
    }
    remove(req, id) {
        return this.teachersService.deleteTeacher(req.user.id, +id);
    }
};
exports.TeachersController = TeachersController;
__decorate([
    (0, common_1.Get)('me'),
    (0, guards_1.Roles)('teacher', 'admin', 'viewer'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TeachersController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Get)(),
    (0, guards_1.Roles)('admin'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TeachersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, guards_1.Roles)('admin'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateTeacherDto]),
    __metadata("design:returntype", void 0)
], TeachersController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id/password'),
    (0, guards_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdatePasswordDto]),
    __metadata("design:returntype", void 0)
], TeachersController.prototype, "updatePassword", null);
__decorate([
    (0, common_1.Post)('invite'),
    (0, guards_1.Roles)('admin'),
    __param(0, (0, common_1.Body)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TeachersController.prototype, "invite", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, guards_1.Roles)('admin'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TeachersController.prototype, "remove", null);
exports.TeachersController = TeachersController = __decorate([
    (0, common_1.Controller)('api/teachers'),
    (0, common_1.UseGuards)(guards_1.JwtAuthGuard, guards_1.RolesGuard),
    __metadata("design:paramtypes", [teachers_service_1.TeachersService])
], TeachersController);
//# sourceMappingURL=teachers.controller.js.map