"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestIdMiddleware = exports.REQUEST_ID_STATE_KEY = exports.REQUEST_ID_HEADER = void 0;
exports.getRequestId = getRequestId;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
exports.REQUEST_ID_HEADER = 'x-request-id';
exports.REQUEST_ID_STATE_KEY = '__requestId';
let RequestIdMiddleware = class RequestIdMiddleware {
    use(req, res, next) {
        const inbound = req.header(exports.REQUEST_ID_HEADER);
        const requestId = typeof inbound === 'string' && inbound.length > 0 && inbound.length <= 128
            ? inbound
            : (0, crypto_1.randomUUID)();
        req[exports.REQUEST_ID_STATE_KEY] = requestId;
        res.setHeader('X-Request-Id', requestId);
        next();
    }
};
exports.RequestIdMiddleware = RequestIdMiddleware;
exports.RequestIdMiddleware = RequestIdMiddleware = __decorate([
    (0, common_1.Injectable)()
], RequestIdMiddleware);
function getRequestId(req) {
    if (req && typeof req[exports.REQUEST_ID_STATE_KEY] === 'string') {
        return req[exports.REQUEST_ID_STATE_KEY];
    }
    return (0, crypto_1.randomUUID)();
}
//# sourceMappingURL=request-id.middleware.js.map