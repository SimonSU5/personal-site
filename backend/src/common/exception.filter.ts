import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request, Response } from 'express';
import { MongoError } from 'mongodb';
import {
  ErrorCode,
  HTTP_STATUS_BY_ERROR_CODE,
  buildErrorBody,
  isErrorCode,
} from './error-code';
import { REQUEST_ID_STATE_KEY, RequestIdRequest } from './request-id.middleware';

/**
 * SPEC §2.1 + §2.2 — Global exception filter.
 *
 * Maps every thrown exception (HttpException, ThrottlerException, MongoError,
 * raw Error) to the uniform error envelope:
 *
 *   { success:false, error:{ code, message?, details? }, requestId }
 *
 * Invariants:
 * - No NestJS default `{ statusCode, message }` body ever leaks.
 * - Stack traces NEVER appear in any response body in production
 *   (server-side logs only).
 * - `requestId` is ALWAYS present; matches the X-Request-Id header.
 */

type ErrorDetail = { code: ErrorCode; message?: string; details?: unknown };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractValidationDetails(
  response: unknown,
): { message: string; details: unknown } | undefined {
  // class-validator response shape (default or custom):
  //   { message: ['err1','err2', ...], error: 'Bad Request' }
  // OR an array of validation error objects with { property, constraints }
  if (Array.isArray(response)) {
    const fields = response
      .filter(isObject)
      .map((entry) => {
        const property = typeof entry.property === 'string' ? entry.property : '';
        const constraints = entry.constraints;
        if (isObject(constraints)) {
          const messages = Object.values(constraints).filter(
            (v): v is string => typeof v === 'string',
          );
          return { field: property, message: messages.join(', ') };
        }
        return null;
      })
      .filter((v): v is { field: string; message: string } => v !== null);
    if (fields.length > 0) {
      return { message: 'Validation failed', details: { fields } };
    }
  }
  if (isObject(response) && Array.isArray(response.message)) {
    const messages = response.message.filter(
      (v): v is string => typeof v === 'string',
    );
    if (messages.length > 0) {
      // If validationPipe produced structured entries, prefer them; else
      // fall back to the bare string list.
      return {
        message: 'Validation failed',
        details: { fields: messages.map((m) => ({ message: m })) },
      };
    }
  }
  return undefined;
}

function statusToCode(status: number, response: unknown): ErrorCode {
  // Honor an explicit ErrorCode carried on the response, regardless of status.
  // Lets handlers throw BadRequestException({ code: 'PAYLOAD_TOO_DEEP', ... })
  // and have the SPEC-correct code surface instead of being collapsed to the
  // status's default code (review finding #2).
  if (isObject(response) && isErrorCode((response as { code?: unknown }).code)) {
    return (response as { code: ErrorCode }).code;
  }
  switch (status) {
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return ErrorCode.VALIDATION_ERROR;
    case HttpStatus.BAD_REQUEST:
      // Anything reaching here at 400 without an explicit ErrorCode is a
      // malformed/generic bad request.
      return ErrorCode.BAD_REQUEST;
    case HttpStatus.PAYLOAD_TOO_LARGE:
      return ErrorCode.PAYLOAD_TOO_LARGE;
    case HttpStatus.NOT_FOUND:
      return ErrorCode.NOT_FOUND;
    case HttpStatus.METHOD_NOT_ALLOWED:
      return ErrorCode.METHOD_NOT_ALLOWED;
    case HttpStatus.TOO_MANY_REQUESTS:
      return ErrorCode.TOO_MANY_REQUESTS;
    case HttpStatus.SERVICE_UNAVAILABLE:
      return ErrorCode.NOT_READY;
    default:
      if (status >= 500) return ErrorCode.INTERNAL_ERROR;
      if (status >= 400) return ErrorCode.BAD_REQUEST;
      return ErrorCode.INTERNAL_ERROR;
  }
}

function extractAllow(response: unknown): string[] | undefined {
  if (isObject(response) && Array.isArray(response.message)) {
    // NestJS MethodNotAllowedException puts `message: '... method ...'` only.
  }
  // Some frameworks put `allow: [...]` on the response; surface if present.
  if (isObject(response)) {
    const allow = (response as { allow?: unknown }).allow;
    if (Array.isArray(allow)) {
      return allow.filter((v): v is string => typeof v === 'string');
    }
  }
  return undefined;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestIdRequest>();

    const requestId =
      (request &&
        typeof request[REQUEST_ID_STATE_KEY] === 'string' &&
        (request[REQUEST_ID_STATE_KEY] as string)) ||
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : '');

    const isProduction = process.env.NODE_ENV === 'production';

    let httpStatus: number;
    let detail: ErrorDetail;

    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const resp = exception.getResponse();
      const respObject = typeof resp === 'string' ? { message: resp } : resp;
      const code = statusToCode(httpStatus, respObject);

      // Enrich details per code.
      let details: unknown;
      let message: string | undefined;
      if (code === ErrorCode.VALIDATION_ERROR) {
        const v = extractValidationDetails(respObject);
        message = v?.message;
        details = v?.details;
      } else if (code === ErrorCode.METHOD_NOT_ALLOWED) {
        const allow = extractAllow(respObject);
        if (allow && allow.length > 0) details = { path: request.path, allow };
        else details = { path: request.path };
      } else if (code === ErrorCode.NOT_FOUND && isObject(respObject)) {
        // Unknown path: detail the path/method.
        details = { path: request.path };
        if (typeof respObject.message === 'string') {
          message = respObject.message;
        }
      } else if (isObject(respObject)) {
        if (typeof respObject.message === 'string') {
          message = respObject.message;
        }
        // Forward an existing `details` payload if present.
        if (respObject.details !== undefined) details = respObject.details;
      }

      httpStatus = HTTP_STATUS_BY_ERROR_CODE[code] ?? httpStatus;
      detail = buildErrorBody(code, message, details).error;
    } else if (this.isMongoFatal(exception)) {
      // Mid-flight Mongo drop on a DB-dependent request.
      httpStatus = HTTP_STATUS_BY_ERROR_CODE[ErrorCode.DEPENDENCY_DOWN];
      detail = buildErrorBody(
        ErrorCode.DEPENDENCY_DOWN,
        'A required dependency is unavailable.',
      ).error;
      this.logger.error(
        `[${requestId}] Mongo dependency error: ${this.formatError(exception)}`,
      );
    } else {
      // Unhandled non-HttpException → INTERNAL_ERROR (never leak stack).
      httpStatus = HTTP_STATUS_BY_ERROR_CODE[ErrorCode.INTERNAL_ERROR];
      detail = buildErrorBody(
        ErrorCode.INTERNAL_ERROR,
        isProduction ? undefined : this.safeMessage(exception),
      ).error;
      this.logger.error(
        `[${requestId}] Unhandled exception`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    // ALWAYS set X-Request-Id on the response (middleware may not have run if
    // the failure was very early; e.g. bind-time).
    if (!response.headersSent) {
      response.setHeader('X-Request-Id', requestId);
    }

    if (!response.headersSent) {
      response.status(httpStatus).json({
        success: false,
        error: detail,
        requestId,
      });
    } else {
      // Response already started (e.g. streamed); we cannot write a body.
      this.logger.warn(
        `[${requestId}] Exception after response started; cannot write error body.`,
      );
    }
  }

  private isMongoFatal(exception: unknown): boolean {
    if (exception instanceof MongoError) {
      // Common transient connection failures; treat as dependency down.
      const code = (exception as { code?: number }).code;
      return (
        code === undefined ||
        code === 6 || // HostUnreachable
        code === 89 || // NetworkTimeout
        code === 91 || // ShutdownInProgress
        code === 10009 || // FailedToSatisfyReplication (conn dropped)
        code === 133 // Reentrancy / connection failure
      );
    }
    const name = (exception as { name?: string })?.name;
    return (
      name === 'MongooseError' ||
      name === 'DisconnectedError' ||
      name === 'MongoServerError' ||
      name === 'MongoNetworkError'
    );
  }

  private safeMessage(exception: unknown): string | undefined {
    if (exception instanceof Error && exception.message) {
      return exception.message;
    }
    if (typeof exception === 'string') return exception;
    return undefined;
  }

  private formatError(exception: unknown): string {
    if (exception instanceof Error) {
      return `${exception.name}: ${exception.message}`;
    }
    try {
      return JSON.stringify(exception);
    } catch {
      return String(exception);
    }
  }
}

/** Re-export for handlers that need to throw with an explicit ErrorCode. */
export class TypedHttpException extends HttpException {
  constructor(
    code: ErrorCode,
    status: number,
    options: { message?: string; details?: unknown } = {},
  ) {
    const body = buildErrorBody(code, options.message, options.details).error;
    super(body, status);
  }
}

export { Request, Response as ExpressResponse };
