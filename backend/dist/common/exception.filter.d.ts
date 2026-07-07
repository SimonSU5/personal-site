import { ArgumentsHost, ExceptionFilter, HttpException } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request, Response } from 'express';
import { ErrorCode } from './error-code';
export declare class GlobalExceptionFilter implements ExceptionFilter {
    private readonly httpAdapterHost;
    private readonly logger;
    constructor(httpAdapterHost: HttpAdapterHost);
    catch(exception: unknown, host: ArgumentsHost): void;
    private isMongoFatal;
    private safeMessage;
    private formatError;
}
export declare class TypedHttpException extends HttpException {
    constructor(code: ErrorCode, status: number, options?: {
        message?: string;
        details?: unknown;
    });
}
export { Request, Response as ExpressResponse };
