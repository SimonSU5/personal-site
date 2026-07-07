"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUEST_ID_HEADER = exports.RequestIdMiddleware = exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const mongoose_1 = require("@nestjs/mongoose");
const event_emitter_1 = require("@nestjs/event-emitter");
const config_module_1 = require("./config/config.module");
const config_service_1 = require("./config/config.service");
const health_module_1 = require("./health/health.module");
const throttle_module_1 = require("./throttle/throttle.module");
const seed_module_1 = require("./seed/seed.module");
const request_id_middleware_1 = require("./common/request-id.middleware");
Object.defineProperty(exports, "RequestIdMiddleware", { enumerable: true, get: function () { return request_id_middleware_1.RequestIdMiddleware; } });
Object.defineProperty(exports, "REQUEST_ID_HEADER", { enumerable: true, get: function () { return request_id_middleware_1.REQUEST_ID_HEADER; } });
const payload_depth_middleware_1 = require("./common/payload-depth.middleware");
const exception_filter_1 = require("./common/exception.filter");
const response_interceptor_1 = require("./common/response.interceptor");
let AppModule = class AppModule {
    configure(consumer) {
        consumer
            .apply(request_id_middleware_1.RequestIdMiddleware, payload_depth_middleware_1.PayloadDepthMiddleware)
            .forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_module_1.ConfigModule,
            mongoose_1.MongooseModule.forRootAsync({
                inject: [config_service_1.AppConfigService],
                useFactory: (config) => {
                    const backoff = Math.min(config.mongoConnectBackoffMs, 16_000);
                    const maxRetries = config.mongoConnectMaxRetries;
                    return {
                        uri: config.mongoUri,
                        dbName: config.mongoDbName,
                        serverSelectionTimeoutMS: backoff * Math.max(maxRetries, 1),
                        retryAttempts: maxRetries,
                        retryDelay: backoff,
                        autoIndex: config.nodeEnv !== 'production',
                        heartbeatFrequencyMS: 10_000,
                    };
                },
            }),
            event_emitter_1.EventEmitterModule.forRoot({
                wildcard: true,
                maxListeners: 50,
            }),
            throttle_module_1.ThrottleModule,
            health_module_1.HealthModule,
            seed_module_1.SeedModule,
        ],
        providers: [
            { provide: core_1.APP_FILTER, useClass: exception_filter_1.GlobalExceptionFilter },
            { provide: core_1.APP_INTERCEPTOR, useClass: response_interceptor_1.ResponseInterceptor },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map