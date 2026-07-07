"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigModule = exports.EnvValidationError = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const config_service_1 = require("./config.service");
const env_validation_1 = require("./env.validation");
class EnvValidationError extends Error {
    errors;
    constructor(errors) {
        super('Environment validation failed');
        this.errors = errors;
        this.name = 'EnvValidationError';
    }
}
exports.EnvValidationError = EnvValidationError;
const validate = (raw) => {
    const result = (0, env_validation_1.validateEnvironment)(raw);
    if (!result.ok) {
        throw new EnvValidationError(result.errors);
    }
    return result.config;
};
let ConfigModule = class ConfigModule {
};
exports.ConfigModule = ConfigModule;
exports.ConfigModule = ConfigModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                cache: true,
                validate,
            }),
        ],
        providers: [config_service_1.AppConfigService],
        exports: [config_service_1.AppConfigService, config_1.ConfigModule],
    })
], ConfigModule);
//# sourceMappingURL=config.module.js.map