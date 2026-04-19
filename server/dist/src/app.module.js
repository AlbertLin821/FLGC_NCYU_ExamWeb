"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const guards_1 = require("./auth/guards");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const teachers_module_1 = require("./teachers/teachers.module");
const classes_module_1 = require("./classes/classes.module");
const students_module_1 = require("./students/students.module");
const exams_module_1 = require("./exams/exams.module");
const questions_module_1 = require("./questions/questions.module");
const scoring_module_1 = require("./scoring/scoring.module");
const cheat_module_1 = require("./cheat/cheat.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            teachers_module_1.TeachersModule,
            classes_module_1.ClassesModule,
            students_module_1.StudentsModule,
            exams_module_1.ExamsModule,
            questions_module_1.QuestionsModule,
            scoring_module_1.ScoringModule,
            cheat_module_1.CheatModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService, guards_1.RolesGuard],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map