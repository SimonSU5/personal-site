"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.XffThrottlerGuard = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
let XffThrottlerGuard = class XffThrottlerGuard extends throttler_1.ThrottlerGuard {
    async getTracker(req) {
        const xff = req.headers?.['x-forwarded-for'];
        const raw = Array.isArray(xff) ? xff[0] : xff;
        if (typeof raw === 'string' && raw.length > 0) {
            const first = raw.split(',')[0].trim();
            if (first.length > 0)
                return first;
        }
        return req.ip ?? '';
    }
    async shouldThrow(_err) {
        return true;
    }
    async shouldSkip(_context) {
        return false;
    }
};
exports.XffThrottlerGuard = XffThrottlerGuard;
exports.XffThrottlerGuard = XffThrottlerGuard = __decorate([
    (0, common_1.Injectable)()
], XffThrottlerGuard);
//# sourceMappingURL=xff-throttler.guard.js.map