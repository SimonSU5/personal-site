"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThrottleModule = exports.ThrottleStorageModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const mongoose_1 = require("@nestjs/mongoose");
const config_module_1 = require("../config/config.module");
const config_service_1 = require("../config/config.service");
const throttler_schema_1 = require("./throttler.schema");
const mongo_throttler_storage_1 = require("./mongo-throttler-storage");
const xff_throttler_guard_1 = require("./xff-throttler.guard");
let ThrottleStorageModule = class ThrottleStorageModule {
};
exports.ThrottleStorageModule = ThrottleStorageModule;
exports.ThrottleStorageModule = ThrottleStorageModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: throttler_schema_1.ThrottlerRecord.name, schema: throttler_schema_1.ThrottlerSchema },
            ]),
        ],
        providers: [mongo_throttler_storage_1.MongoThrottlerStorage],
        exports: [mongo_throttler_storage_1.MongoThrottlerStorage],
    })
], ThrottleStorageModule);
let ThrottleModule = class ThrottleModule {
};
exports.ThrottleModule = ThrottleModule;
exports.ThrottleModule = ThrottleModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_module_1.ConfigModule,
            ThrottleStorageModule,
            throttler_1.ThrottlerModule.forRootAsync({
                inject: [mongo_throttler_storage_1.MongoThrottlerStorage, config_service_1.AppConfigService],
                useFactory: (storage, config) => ({
                    throttlers: [
                        {
                            ttl: config.throttleTtlSeconds * 1000,
                            limit: config.throttleLimit,
                        },
                    ],
                    storage,
                }),
            }),
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: xff_throttler_guard_1.XffThrottlerGuard,
            },
        ],
        exports: [ThrottleStorageModule],
    })
], ThrottleModule);
//# sourceMappingURL=throttle.module.js.map