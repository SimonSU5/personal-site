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
exports.HealthService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_service_1 = require("../config/config.service");
let HealthService = class HealthService {
    connection;
    config;
    logger = new common_1.Logger('HealthService');
    constructor(connection, config) {
        this.connection = connection;
        this.config = config;
    }
    async checkMongo(perDepTimeoutMs) {
        return this.withTimeout((async () => {
            if (this.connection.readyState !== 1) {
                return {
                    status: 'down',
                    error: `connection not ready (state=${this.connection.readyState})`,
                };
            }
            const start = Date.now();
            try {
                const admin = this.connection.db?.admin();
                if (!admin) {
                    return {
                        status: 'down',
                        error: 'admin handle unavailable',
                    };
                }
                await admin.ping();
                return {
                    status: 'up',
                    latencyMs: Date.now() - start,
                };
            }
            catch (err) {
                return {
                    status: 'down',
                    error: err instanceof Error ? err.message : String(err),
                };
            }
        })(), perDepTimeoutMs, 'mongo');
    }
    async checkOss(perDepTimeoutMs) {
        if (!this.config.enableOssReadyCheck) {
            return { status: 'skipped' };
        }
        return this.withTimeout(Promise.resolve((() => {
            if (!this.config.ossRegion ||
                !this.config.ossBucket ||
                !this.config.ossAccessKeyId ||
                !this.config.ossAccessKeySecret) {
                return { status: 'down', error: 'OSS env not configured' };
            }
            return { status: 'up', latencyMs: 0 };
        })()), perDepTimeoutMs, 'oss');
    }
    async runReadinessChecks() {
        const perDep = this.config.ossHeadBucketTimeoutMs;
        const [mongo, oss] = await Promise.all([
            this.checkMongo(perDep),
            this.checkOss(perDep),
        ]);
        return { mongo, oss };
    }
    isReady(report) {
        const deps = [report.mongo, report.oss];
        return deps.every((d) => d.status === 'up' || d.status === 'skipped');
    }
    async withTimeout(promise, ms, label) {
        let timer;
        const timeout = new Promise((resolve) => {
            timer = setTimeout(() => {
                resolve({
                    status: 'down',
                    error: `timeout after ${ms}ms`,
                });
            }, ms);
        });
        try {
            return await Promise.race([promise, timeout]);
        }
        finally {
            if (timer)
                clearTimeout(timer);
            void label;
        }
    }
};
exports.HealthService = HealthService;
exports.HealthService = HealthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        config_service_1.AppConfigService])
], HealthService);
//# sourceMappingURL=health.service.js.map