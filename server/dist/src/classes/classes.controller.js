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
exports.ClassesController = exports.AddTeacherDto = exports.CreateClassDto = void 0;
const common_1 = require("@nestjs/common");
const classes_service_1 = require("./classes.service");
const guards_1 = require("../auth/guards");
const class_validator_1 = require("class-validator");
class CreateClassDto {
    name;
    description;
}
exports.CreateClassDto = CreateClassDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateClassDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateClassDto.prototype, "description", void 0);
class AddTeacherDto {
    teacherId;
}
exports.AddTeacherDto = AddTeacherDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], AddTeacherDto.prototype, "teacherId", void 0);
let ClassesController = class ClassesController {
    classesService;
    constructor(classesService) {
        this.classesService = classesService;
    }
    findAll(req, page, limit) {
        return this.classesService.findAll(req.user, page ? parseInt(page) : undefined, limit ? parseInt(limit) : undefined);
    }
    findOne(id, req) {
        return this.classesService.findById(id, req.user);
    }
    getStats(id, req) {
        return this.classesService.getClassStats(id, req.user);
    }
    create(dto, req) {
        return this.classesService.create(dto, req.user.id);
    }
    update(id, dto, req) {
        return this.classesService.update(id, dto, req.user);
    }
    delete(id, req) {
        return this.classesService.delete(id, req.user);
    }
    addTeacher(id, dto, req) {
        return this.classesService.addTeacher(id, dto.teacherId, req.user);
    }
    removeTeacher(id, teacherId, req) {
        return this.classesService.removeTeacher(id, teacherId, req.user);
    }
};
exports.ClassesController = ClassesController;
__decorate([
    (0, common_1.Get)(),
    (0, guards_1.Roles)('teacher', 'admin', 'viewer'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ClassesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, guards_1.Roles)('teacher', 'admin', 'viewer'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ClassesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/stats'),
    (0, guards_1.Roles)('teacher', 'admin', 'viewer'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ClassesController.prototype, "getStats", null);
__decorate([
    (0, common_1.Post)(),
    (0, guards_1.Roles)('teacher', 'admin'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateClassDto, Object]),
    __metadata("design:returntype", void 0)
], ClassesController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, guards_1.Roles)('teacher', 'admin'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, CreateClassDto, Object]),
    __metadata("design:returntype", void 0)
], ClassesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, guards_1.Roles)('teacher', 'admin'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ClassesController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)(':id/teachers'),
    (0, guards_1.Roles)('teacher', 'admin'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, AddTeacherDto, Object]),
    __metadata("design:returntype", void 0)
], ClassesController.prototype, "addTeacher", null);
__decorate([
    (0, common_1.Delete)(':id/teachers/:teacherId'),
    (0, guards_1.Roles)('teacher', 'admin'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('teacherId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", void 0)
], ClassesController.prototype, "removeTeacher", null);
exports.ClassesController = ClassesController = __decorate([
    (0, common_1.Controller)('api/classes'),
    (0, common_1.UseGuards)(guards_1.JwtAuthGuard, guards_1.RolesGuard),
    __metadata("design:paramtypes", [classes_service_1.ClassesService])
], ClassesController);
//# sourceMappingURL=classes.controller.js.map