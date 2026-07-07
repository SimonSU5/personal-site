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
exports.HttpStatus = exports.HttpException = exports.RawHealthController = exports.RootController = exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
Object.defineProperty(exports, "HttpException", { enumerable: true, get: function () { return common_1.HttpException; } });
Object.defineProperty(exports, "HttpStatus", { enumerable: true, get: function () { return common_1.HttpStatus; } });
const health_service_1 = require("./health.service");
const error_code_1 = require("../common/error-code");
const response_interceptor_1 = require("../common/response.interceptor");
const config_service_1 = require("../config/config.service");
const SERVICE_NAME = 'surong-personal-backend';
let HealthController = class HealthController {
    health;
    config;
    constructor(health, config) {
        this.health = health;
        this.config = config;
    }
    liveness() {
        return {
            status: 'alive',
            timestamp: new Date().toISOString(),
            uptimeSeconds: Math.round(process.uptime()),
        };
    }
    async readiness(_req) {
        const report = await this.health.runReadinessChecks();
        if (this.health.isReady(report)) {
            return { status: 'ready', details: stripDetails(report) };
        }
        throw new common_1.ServiceUnavailableException({
            code: error_code_1.ErrorCode.NOT_READY,
            message: 'One or more dependencies are not ready',
            details: stripDetails(report),
        });
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], HealthController.prototype, "liveness", null);
__decorate([
    (0, common_1.Get)('ready'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "readiness", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)('health'),
    __metadata("design:paramtypes", [health_service_1.HealthService,
        config_service_1.AppConfigService])
], HealthController);
let RootController = class RootController {
    config;
    constructor(config) {
        this.config = config;
    }
    identity() {
        return {
            name: SERVICE_NAME,
            apiVersion: 'v1',
            prefix: '/api/v1',
            status: 'alive',
            timestamp: new Date().toISOString(),
        };
    }
};
exports.RootController = RootController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], RootController.prototype, "identity", null);
exports.RootController = RootController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [config_service_1.AppConfigService])
], RootController);
let RawHealthController = class RawHealthController {
    rawLiveness() {
        return 'alive';
    }
};
exports.RawHealthController = RawHealthController;
__decorate([
    (0, common_1.Get)('health'),
    (0, common_1.Header)('Content-Type', 'text/plain; charset=utf-8'),
    (0, response_interceptor_1.RawResponse)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], RawHealthController.prototype, "rawLiveness", null);
exports.RawHealthController = RawHealthController = __decorate([
    (0, common_1.Controller)()
], RawHealthController);
function stripDetails(report) {
    return {
        mongo: report.mongo,
        oss: report.oss,
    };
}
//# sourceMappingURL=health.controller.js.map