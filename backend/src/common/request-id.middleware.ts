import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * SPEC §2.4 — Request Correlation (X-Request-Id).
 *
 * - Inbound `X-Request-Id` present → echoed verbatim.
 * - Absent → uuid v4 generated.
 * - The same id is attached to req (for logging / error filter) and to the
 *   response header `X-Request-Id`.
 * - Used for CORRELATION ONLY — never for authorization / rate-limit bypass /
 *   user switching. No authz decision reads it.
 */

export const REQUEST_ID_HEADER = 'x-request-id';
export const REQUEST_ID_STATE_KEY = '__requestId';

export interface RequestIdRequest extends Request {
  [REQUEST_ID_STATE_KEY]?: string;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestIdRequest, res: Response, next: NextFunction): void {
    const inbound = req.header(REQUEST_ID_HEADER);
    const requestId =
      typeof inbound === 'string' && inbound.length > 0 && inbound.length <= 128
        ? inbound
        : randomUUID();

    req[REQUEST_ID_STATE_KEY] = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  }
}

/** Helper for handlers/filters that need the current request id. */
export function getRequestId(req: RequestIdRequest | undefined): string {
  if (req && typeof req[REQUEST_ID_STATE_KEY] === 'string') {
    return req[REQUEST_ID_STATE_KEY] as string;
  }
  return randomUUID();
}
