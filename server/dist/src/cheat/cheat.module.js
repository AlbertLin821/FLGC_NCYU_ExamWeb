"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheatModule = void 0;
const common_1 = require("@nestjs/common");
const cheat_service_1 = require("./cheat.service");
const cheat_gateway_1 = require("./cheat.gateway");
const cheat_controller_1 = require("./cheat.controller");
let CheatModule = class CheatModule {
};
exports.CheatModule = CheatModule;
exports.CheatModule = CheatModule = __decorate([
    (0, common_1.Module)({
        controllers: [cheat_controller_1.CheatController],
        providers: [cheat_service_1.CheatService, cheat_gateway_1.CheatGateway],
        exports: [cheat_service_1.CheatService],
    })
], CheatModule);
//# sourceMappingURL=cheat.module.js.map