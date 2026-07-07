/**
 * Global error codes (SPEC §2.2 — global/cross-cutting codes owned by Scaffolding).
 *
 * Domain modules MAY extend this union with domain-specific codes; codes must
 * not collide with the global codes defined here.
 *
 * NOTE: this file is the backend-local mirror of the contract that will live
 * in `@surong-personal/shared`. It is intentionally self-contained so the
 * backend compiles standalone before the shared workspace is wired up.
 */

export const ErrorCode = {
  /** class-validator rejection (unknown field / type mismatch / range) */
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  /** malformed JSON body (trailing comma, unclosed brace) */
  BAD_REQUEST: 'BAD_REQUEST',
  /** body > BODY_LIMIT_BYTES (or per-route override) */
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  /** body nesting > PAYLOAD_MAX_DEPTH */
  PAYLOAD_TOO_DEEP: 'PAYLOAD_TOO_DEEP',
  /** unknown /api/v1 path OR resource id not found */
  NOT_FOUND: 'NOT_FOUND',
  /** known path + wrong method (details.allow:[...]) */
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  /** global API throttle exceeded (scaffolding Mongo throttler) */
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  /** readiness probe: a dependency is down */
  NOT_READY: 'NOT_READY',
  /** mid-flight Mongo drop on a DB-dependent request */
  DEPENDENCY_DOWN: 'DEPENDENCY_DOWN',
  /** app.listen EADDRINUSE / host invalid (process exits 1) */
  BIND_ERROR: 'BIND_ERROR',
  /** unhandled non-HttpException */
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Mapping from a global ErrorCode to its canonical HTTP status code.
 * Domain codes are mapped by their owning filters/guards.
 */
export const HTTP_STATUS_BY_ERROR_CODE: Readonly<Record<ErrorCode, number>> = {
  [ErrorCode.VALIDATION_ERROR]: 422,
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.PAYLOAD_TOO_LARGE]: 413,
  [ErrorCode.PAYLOAD_TOO_DEEP]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.METHOD_NOT_ALLOWED]: 405,
  [ErrorCode.TOO_MANY_REQUESTS]: 429,
  [ErrorCode.NOT_READY]: 503,
  [ErrorCode.DEPENDENCY_DOWN]: 503,
  [ErrorCode.BIND_ERROR]: 500,
  [ErrorCode.INTERNAL_ERROR]: 500,
};

export function isErrorCode(value: unknown): value is ErrorCode {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(ErrorCode, value)
  );
}

/** Build the canonical error envelope body (without requestId — added by filter). */
export function buildErrorBody(
  code: ErrorCode,
  message?: string,
  details?: unknown,
): { success: false; error: { code: ErrorCode; message?: string; details?: unknown } } {
  return {
    success: false,
    error: {
      code,
      ...(message !== undefined ? { message } : {}),
      ...(details !== undefined ? { details } : {}),
    },
  };
}
