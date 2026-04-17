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
exports.QuestionsController = exports.ReorderDto = exports.BulkCreateDto = void 0;
const common_1 = require("@nestjs/common");
const questions_service_1 = require("./questions.service");
const guards_1 = require("../auth/guards");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class QuestionItem {
    word1;
    word2;
}
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QuestionItem.prototype, "word1", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], QuestionItem.prototype, "word2", void 0);
class BulkCreateDto {
    questions;
}
exports.BulkCreateDto = BulkCreateDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => QuestionItem),
    __metadata("design:type", Array)
], BulkCreateDto.prototype, "questions", void 0);
class ReorderDto {
    questions;
}
exports.ReorderDto = ReorderDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], ReorderDto.prototype, "questions", void 0);
let QuestionsController = class QuestionsController {
    questionsService;
    constructor(questionsService) {
        this.questionsService = questionsService;
    }
    findByExam(examId) {
        return this.questionsService.findByExam(examId);
    }
    create(examId, dto) {
        return this.questionsService.create({ examId, ...dto });
    }
    bulkCreate(examId, dto) {
        return this.questionsService.bulkCreate(examId, dto.questions);
    }
    update(id, dto) {
        return this.questionsService.update(id, dto);
    }
    reorder(dto) {
        return this.questionsService.reorder(dto.questions);
    }
    delete(id) {
        return this.questionsService.delete(id);
    }
};
exports.QuestionsController = QuestionsController;
__decorate([
    (0, common_1.Get)('exam/:examId'),
    __param(0, (0, common_1.Param)('examId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], QuestionsController.prototype, "findByExam", null);
__decorate([
    (0, common_1.Post)('exam/:examId'),
    __param(0, (0, common_1.Param)('examId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], QuestionsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('exam/:examId/bulk'),
    __param(0, (0, common_1.Param)('examId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, BulkCreateDto]),
    __metadata("design:returntype", void 0)
], QuestionsController.prototype, "bulkCreate", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], QuestionsController.prototype, "update", null);
__decorate([
    (0, common_1.Put)('reorder'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ReorderDto]),
    __metadata("design:returntype", void 0)
], QuestionsController.prototype, "reorder", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], QuestionsController.prototype, "delete", null);
exports.QuestionsController = QuestionsController = __decorate([
    (0, common_1.Controller)('api/questions'),
    (0, common_1.UseGuards)(guards_1.JwtAuthGuard),
    __metadata("design:paramtypes", [questions_service_1.QuestionsService])
], QuestionsController);
//# sourceMappingURL=questions.controller.js.map