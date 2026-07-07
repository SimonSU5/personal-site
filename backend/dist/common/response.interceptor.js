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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseInterceptor = exports.RawResponse = exports.RAW_RESPONSE_KEY = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const core_1 = require("@nestjs/core");
exports.RAW_RESPONSE_KEY = 'surong:rawResponse';
const common_2 = require("@nestjs/common");
const RawResponse = () => (0, common_2.SetMetadata)(exports.RAW_RESPONSE_KEY, true);
exports.RawResponse = RawResponse;
let ResponseInterceptor = class ResponseInterceptor {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    intercept(context, next) {
        const isRaw = this.reflector.getAllAndOverride(exports.RAW_RESPONSE_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        const http = context.switchToHttp();
        const response = http.getResponse();
        if (isRaw && !response.headersSent) {
            response.setHeader('X-Surong-Raw-Response', '1');
        }
        return next.handle().pipe((0, rxjs_1.map)((data) => {
            if (isRaw) {
                return data;
            }
            return { success: true, data: data === undefined ? null : data };
        }));
    }
};
exports.ResponseInterceptor = ResponseInterceptor;
exports.ResponseInterceptor = ResponseInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], ResponseInterceptor);
//# sourceMappingURL=response.interceptor.js.map