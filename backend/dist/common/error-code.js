"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTP_STATUS_BY_ERROR_CODE = exports.ErrorCode = void 0;
exports.isErrorCode = isErrorCode;
exports.buildErrorBody = buildErrorBody;
exports.ErrorCode = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    BAD_REQUEST: 'BAD_REQUEST',
    PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
    PAYLOAD_TOO_DEEP: 'PAYLOAD_TOO_DEEP',
    NOT_FOUND: 'NOT_FOUND',
    METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
    TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
    NOT_READY: 'NOT_READY',
    DEPENDENCY_DOWN: 'DEPENDENCY_DOWN',
    BIND_ERROR: 'BIND_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
};
exports.HTTP_STATUS_BY_ERROR_CODE = {
    [exports.ErrorCode.VALIDATION_ERROR]: 422,
    [exports.ErrorCode.BAD_REQUEST]: 400,
    [exports.ErrorCode.PAYLOAD_TOO_LARGE]: 413,
    [exports.ErrorCode.PAYLOAD_TOO_DEEP]: 400,
    [exports.ErrorCode.NOT_FOUND]: 404,
    [exports.ErrorCode.METHOD_NOT_ALLOWED]: 405,
    [exports.ErrorCode.TOO_MANY_REQUESTS]: 429,
    [exports.ErrorCode.NOT_READY]: 503,
    [exports.ErrorCode.DEPENDENCY_DOWN]: 503,
    [exports.ErrorCode.BIND_ERROR]: 500,
    [exports.ErrorCode.INTERNAL_ERROR]: 500,
};
function isErrorCode(value) {
    return (typeof value === 'string' &&
        Object.prototype.hasOwnProperty.call(exports.ErrorCode, value));
}
function buildErrorBody(code, message, details) {
    return {
        success: false,
        error: {
            code,
            ...(message !== undefined ? { message } : {}),
            ...(details !== undefined ? { details } : {}),
        },
    };
}
//# sourceMappingURL=error-code.js.map