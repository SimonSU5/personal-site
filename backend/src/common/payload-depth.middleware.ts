import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ErrorCode } from './error-code';

/**
 * SPEC §3.4 FR-13/14 — PAYLOAD_TOO_DEEP guard.
 *
 * Runs AFTER body-parser has parsed the JSON and BEFORE the controller.
 * If the parsed body's maximum nesting depth exceeds `PAYLOAD_MAX_DEPTH`,
 * the request is rejected with 400 PAYLOAD_TOO_DEEP (mapped by the global
 * exception filter, which honors the response's explicit ErrorCode). This
 * catches pathological nested payloads that would otherwise pass JSON
 * parsing but stress downstream logic.
 */

function computeDepth(value: unknown, current = 0): number {
  if (Array.isArray(value)) {
    let maxChild = current;
    for (const v of value) {
      const d = computeDepth(v, current + 1);
      if (d > maxChild) maxChild = d;
    }
    return maxChild;
  }
  if (value !== null && typeof value === 'object') {
    let maxChild = current;
    for (const v of Object.values(value as Record<string, unknown>)) {
      const d = computeDepth(v, current + 1);
      if (d > maxChild) maxChild = d;
    }
    return maxChild;
  }
  return current;
}

@Injectable()
export class PayloadDepthMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const limitRaw = Number.parseInt(
      process.env.PAYLOAD_MAX_DEPTH ?? '8',
      10,
    );
    const limit = Number.isFinite(limitRaw) ? limitRaw : 8;

    const body = (req as { body?: unknown }).body;
    if (body === undefined || body === null) {
      next();
      return;
    }
    const depth = computeDepth(body);
    if (depth > limit) {
      throw new BadRequestException({
        code: ErrorCode.PAYLOAD_TOO_DEEP,
        message: `Request body nesting depth ${depth} exceeds maximum ${limit}`,
        details: { maxDepth: limit, observedDepth: depth },
      });
    }
    next();
  }
}
