import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';

/**
 * SPEC §2.1 — Uniform Response Envelope.
 *
 * Wraps EVERY /api/v1 controller return into { success:true, data:T }.
 * `data` is null if the controller returned null/undefined.
 *
 * The raw `GET /health` route lives OUTSIDE /api/v1 and bypasses this
 * interceptor (it returns text/plain 'alive' literally).
 *
 * Controllers may opt-out per-handler via the `@RawResponse()` decorator —
 * used sparingly (e.g. stream endpoints). The /health raw route does not
 * need it because it is mounted on a separate router without the prefix.
 */

export const RAW_RESPONSE_KEY = 'surong:rawResponse';

import { SetMetadata } from '@nestjs/common';

/** Mark a handler as returning a raw response that must NOT be enveloped. */
export const RawResponse = () => SetMetadata(RAW_RESPONSE_KEY, true);

export interface ApiResponse<T> {
  success: true;
  data: T | null;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const isRaw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Mark the response so downstream (e.g. exception filter) knows whether
    // the route intended an envelope. We only set when not already set.
    const http = context.switchToHttp();
    const response = http.getResponse<Response>();
    if (isRaw && !response.headersSent) {
      response.setHeader('X-Surong-Raw-Response', '1');
    }

    return next.handle().pipe(
      map((data: T) => {
        if (isRaw) {
          // Returned as-is; express will send it verbatim.
          return data as unknown as ApiResponse<T>;
        }
        return { success: true, data: data === undefined ? null : data };
      }),
    );
  }
}
