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
exports.TypedHttpException = exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const mongodb_1 = require("mongodb");
const error_code_1 = require("./error-code");
const request_id_middleware_1 = require("./request-id.middleware");
function isObject(value) {
    return typeof value === 'object' && value !== null;
}
function extractValidationDetails(response) {
    if (Array.isArray(response)) {
        const fields = response
            .filter(isObject)
            .map((entry) => {
            const property = typeof entry.property === 'string' ? entry.property : '';
            const constraints = entry.constraints;
            if (isObject(constraints)) {
                const messages = Object.values(constraints).filter((v) => typeof v === 'string');
                return { field: property, message: messages.join(', ') };
            }
            return null;
        })
            .filter((v) => v !== null);
        if (fields.length > 0) {
            return { message: 'Validation failed', details: { fields } };
        }
    }
    if (isObject(response) && Array.isArray(response.message)) {
        const messages = response.message.filter((v) => typeof v === 'string');
        if (messages.length > 0) {
            return {
                message: 'Validation failed',
                details: { fields: messages.map((m) => ({ message: m })) },
            };
        }
    }
    return undefined;
}
function statusToCode(status, response) {
    switch (status) {
        case common_1.HttpStatus.UNPROCESSABLE_ENTITY:
            return error_code_1.ErrorCode.VALIDATION_ERROR;
        case common_1.HttpStatus.BAD_REQUEST:
            return error_code_1.ErrorCode.BAD_REQUEST;
        case common_1.HttpStatus.PAYLOAD_TOO_LARGE:
            return error_code_1.ErrorCode.PAYLOAD_TOO_LARGE;
        case common_1.HttpStatus.NOT_FOUND:
            return error_code_1.ErrorCode.NOT_FOUND;
        case common_1.HttpStatus.METHOD_NOT_ALLOWED:
            return error_code_1.ErrorCode.METHOD_NOT_ALLOWED;
        case common_1.HttpStatus.TOO_MANY_REQUESTS:
            return error_code_1.ErrorCode.TOO_MANY_REQUESTS;
        case common_1.HttpStatus.SERVICE_UNAVAILABLE:
            return error_code_1.ErrorCode.NOT_READY;
        default:
            if (isObject(response) && (0, error_code_1.isErrorCode)(response.code)) {
                return response.code;
            }
            if (status >= 500)
                return error_code_1.ErrorCode.INTERNAL_ERROR;
            if (status >= 400)
                return error_code_1.ErrorCode.BAD_REQUEST;
            return error_code_1.ErrorCode.INTERNAL_ERROR;
    }
}
function extractAllow(response) {
    if (isObject(response) && Array.isArray(response.message)) {
    }
    if (isObject(response)) {
        const allow = response.allow;
        if (Array.isArray(allow)) {
            return allow.filter((v) => typeof v === 'string');
        }
    }
    return undefined;
}
let GlobalExceptionFilter = class GlobalExceptionFilter {
    httpAdapterHost;
    logger = new common_1.Logger('ExceptionFilter');
    constructor(httpAdapterHost) {
        this.httpAdapterHost = httpAdapterHost;
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const requestId = (request &&
            typeof request[request_id_middleware_1.REQUEST_ID_STATE_KEY] === 'string' &&
            request[request_id_middleware_1.REQUEST_ID_STATE_KEY]) ||
            (typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : '');
        const isProduction = process.env.NODE_ENV === 'production' ||
            process.env.NODE_ENV === 'test'
            ? process.env.NODE_ENV === 'production'
            : false;
        let httpStatus;
        let detail;
        if (exception instanceof common_1.HttpException) {
            httpStatus = exception.getStatus();
            const resp = exception.getResponse();
            const respObject = typeof resp === 'string' ? { message: resp } : resp;
            const code = statusToCode(httpStatus, respObject);
            let details;
            let message;
            if (code === error_code_1.ErrorCode.VALIDATION_ERROR) {
                const v = extractValidationDetails(respObject);
                message = v?.message;
                details = v?.details;
            }
            else if (code === error_code_1.ErrorCode.METHOD_NOT_ALLOWED) {
                const allow = extractAllow(respObject);
                if (allow && allow.length > 0)
                    details = { path: request.path, allow };
                else
                    details = { path: request.path };
            }
            else if (code === error_code_1.ErrorCode.NOT_FOUND && isObject(respObject)) {
                details = { path: request.path };
                if (typeof respObject.message === 'string') {
                    message = respObject.message;
                }
            }
            else if (isObject(respObject)) {
                if (typeof respObject.message === 'string') {
                    message = respObject.message;
                }
                if (respObject.details !== undefined)
                    details = respObject.details;
            }
            httpStatus = error_code_1.HTTP_STATUS_BY_ERROR_CODE[code] ?? httpStatus;
            detail = (0, error_code_1.buildErrorBody)(code, message, details).error;
        }
        else if (this.isMongoFatal(exception)) {
            httpStatus = error_code_1.HTTP_STATUS_BY_ERROR_CODE[error_code_1.ErrorCode.DEPENDENCY_DOWN];
            detail = (0, error_code_1.buildErrorBody)(error_code_1.ErrorCode.DEPENDENCY_DOWN, 'A required dependency is unavailable.').error;
            this.logger.error(`[${requestId}] Mongo dependency error: ${this.formatError(exception)}`);
        }
        else {
            httpStatus = error_code_1.HTTP_STATUS_BY_ERROR_CODE[error_code_1.ErrorCode.INTERNAL_ERROR];
            detail = (0, error_code_1.buildErrorBody)(error_code_1.ErrorCode.INTERNAL_ERROR, isProduction ? undefined : this.safeMessage(exception)).error;
            this.logger.error(`[${requestId}] Unhandled exception`, exception instanceof Error ? exception.stack : String(exception));
        }
        if (!response.headersSent) {
            response.setHeader('X-Request-Id', requestId);
        }
        if (!response.headersSent) {
            response.status(httpStatus).json({
                success: false,
                error: detail,
                requestId,
            });
        }
        else {
            this.logger.warn(`[${requestId}] Exception after response started; cannot write error body.`);
        }
    }
    isMongoFatal(exception) {
        if (exception instanceof mongodb_1.MongoError) {
            const code = exception.code;
            return (code === undefined ||
                code === 6 ||
                code === 89 ||
                code === 91 ||
                code === 10009 ||
                code === 133);
        }
        const name = exception?.name;
        return (name === 'MongooseError' ||
            name === 'DisconnectedError' ||
            name === 'MongoServerError' ||
            name === 'MongoNetworkError');
    }
    safeMessage(exception) {
        if (exception instanceof Error && exception.message) {
            return exception.message;
        }
        if (typeof exception === 'string')
            return exception;
        return undefined;
    }
    formatError(exception) {
        if (exception instanceof Error) {
            return `${exception.name}: ${exception.message}`;
        }
        try {
            return JSON.stringify(exception);
        }
        catch {
            return String(exception);
        }
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = __decorate([
    (0, common_1.Catch)(),
    __metadata("design:paramtypes", [core_1.HttpAdapterHost])
], GlobalExceptionFilter);
class TypedHttpException extends common_1.HttpException {
    constructor(code, status, options = {}) {
        const body = (0, error_code_1.buildErrorBody)(code, options.message, options.details).error;
        super(body, status);
    }
}
exports.TypedHttpException = TypedHttpException;
//# sourceMappingURL=exception.filter.js.map