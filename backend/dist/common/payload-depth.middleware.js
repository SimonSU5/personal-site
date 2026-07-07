"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayloadDepthMiddleware = void 0;
exports.setMaxPayloadDepth = setMaxPayloadDepth;
const common_1 = require("@nestjs/common");
const error_code_1 = require("./error-code");
const MAX_DEPTH_TOKEN = 'surong:maxPayloadDepth';
function setMaxPayloadDepth(res, depth) {
    res.locals[MAX_DEPTH_TOKEN] = depth;
}
function computeDepth(value, current = 0) {
    if (Array.isArray(value)) {
        let maxChild = current;
        for (const v of value) {
            const d = computeDepth(v, current + 1);
            if (d > maxChild)
                maxChild = d;
        }
        return maxChild;
    }
    if (value !== null && typeof value === 'object') {
        let maxChild = current;
        for (const v of Object.values(value)) {
            const d = computeDepth(v, current + 1);
            if (d > maxChild)
                maxChild = d;
        }
        return maxChild;
    }
    return current;
}
let PayloadDepthMiddleware = class PayloadDepthMiddleware {
    use(req, res, next) {
        const limitRaw = res.locals[MAX_DEPTH_TOKEN] ??
            Number.parseInt(process.env.PAYLOAD_MAX_DEPTH ?? '8', 10);
        const limit = Number.isFinite(limitRaw)
            ? limitRaw
            : 8;
        const body = req.body;
        if (body === undefined || body === null) {
            next();
            return;
        }
        const depth = computeDepth(body);
        if (depth > limit) {
            throw new common_1.BadRequestException({
                code: error_code_1.ErrorCode.PAYLOAD_TOO_DEEP,
                message: `Request body nesting depth ${depth} exceeds maximum ${limit}`,
                details: { maxDepth: limit, observedDepth: depth },
            });
        }
        next();
    }
};
exports.PayloadDepthMiddleware = PayloadDepthMiddleware;
exports.PayloadDepthMiddleware = PayloadDepthMiddleware = __decorate([
    (0, common_1.Injectable)()
], PayloadDepthMiddleware);
//# sourceMappingURL=payload-depth.middleware.js.map