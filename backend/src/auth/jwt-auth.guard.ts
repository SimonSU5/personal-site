import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { ErrorCode } from '../common/error-code';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * SPEC §4.3 / §4.6 — JwtAuthGuard.
 *
 * - Honors `@Public()`: short-circuits (returns true) when the handler/class
 *   carries IS_PUBLIC metadata, so login/refresh/logout work without an access
 *   token (AC-12: logout ALWAYS 200 even with expired/missing access).
 * - Distinguishes two failure modes:
 *     * token PRESENT (Bearer scheme) but bad/expired/alg-none/tampered or a
 *       strategy error -> 401 `INVALID_TOKEN` + `WWW-Authenticate:
 *       Bearer error="invalid_token"` (AC-16).
 *     * token MISSING or wrong scheme -> 401 `UNAUTHORIZED` (no WWW-Authenticate
 *       error param).
 *
 * Thrown HttpExceptions carry an explicit `code` on the response body, which
 * the global exception filter honors (ErrorCode membership) and maps to the
 * canonical envelope + status.
 *
 * Observability (AC-OBS): the invalid-access-token path emits a structured
 * AUTH_INVALID_TOKEN log line so token-tampering / brute-force attempts against
 * protected routes are captured in the same six event classes as the service
 * paths.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger('AuthService');

  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser | undefined,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (user) {
      return user;
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const authHeader = request?.headers?.['authorization'];
    // A Bearer token is present only if the scheme is `Bearer` followed by a
    // non-empty token. Anything else (missing header, Basic, empty token) is
    // treated as missing -> UNAUTHORIZED.
    const hasBearer =
      typeof authHeader === 'string' && /^bearer\s+\S+/i.test(authHeader);

    const response = http.getResponse<Response>();
    if (hasBearer || err) {
      // Token was supplied but verification failed (bad signature, expired,
      // alg:none, malformed) OR the strategy threw. -> INVALID_TOKEN.
      this.emitInvalidToken(request);
      if (response && !response.headersSent) {
        response.setHeader(
          'WWW-Authenticate',
          'Bearer error="invalid_token"',
        );
      }
      throw new HttpException(
        {
          code: ErrorCode.INVALID_TOKEN,
          message: 'Invalid or expired access token.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // No usable Bearer credential at all -> UNAUTHORIZED (no error param).
    throw new HttpException(
      {
        code: ErrorCode.UNAUTHORIZED,
        message: 'Authentication required.',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }

  /** Emit AUTH_INVALID_TOKEN structured event (AC-OBS). Never logs the token. */
  private emitInvalidToken(req: Request | undefined): void {
    const ua = (req?.headers?.['user-agent'] as string | undefined) ?? '';
    const ip =
      (req?.headers?.['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
      req?.ip ||
      null;
    this.logger.log(
      JSON.stringify({
        event: 'AUTH_INVALID_TOKEN',
        userId: null,
        ip,
        userAgent: ua.slice(0, 256),
        timestamp: new Date().toISOString(),
      }),
    );
  }
}
