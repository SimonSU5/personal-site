import {
  BadRequestException,
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  HttpCode,
  HttpException,
  Injectable,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppConfigService } from '../config/config.service';
import { ErrorCode } from '../common/error-code';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from './public.decorator';
import { CurrentUser } from './current-user.decorator';

/**
 * SPEC §4.1 — Auth REST endpoints.
 *
 * The controller is class-level `@UseGuards(JwtAuthGuard)`; login / refresh /
 * logout opt out via `@Public()` (the guard short-circuits on that metadata).
 * `/me` is the only guarded route.
 *
 * Refresh-cookie attributes (AC-COOKIE): HttpOnly; SameSite=Strict(prod)/Lax(dev);
 * Secure(prod); Path=/api/v1/auth; NO Domain; Max-Age=604800 (7d). On any login
 * 401/429 NO Set-Cookie is emitted (AC-NOSET-on-fail) — the controller only
 * sets the cookie on a successful return.
 */

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/v1/auth';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** SPEC §4.1 AC-3: a login body > 10KB is rejected as VALIDATION_ERROR. */
const LOGIN_BODY_LIMIT_BYTES = 10 * 1024;

/** Extract the client IP for rate-limit bucketing (XFF leftmost, else req.ip). */
function extractIp(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  const raw = Array.isArray(xff) ? xff[0] : xff;
  if (typeof raw === 'string' && raw.length > 0) {
    return raw.split(',')[0].trim();
  }
  return req.ip ?? 'unknown';
}

/** Parse a named cookie out of the raw Cookie header (no cookie-parser dep). */
function getCookie(req: Request, name: string): string | undefined {
  const header = req.headers['cookie'];
  if (typeof header !== 'string' || header.length === 0) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    const k = (eq === -1 ? part : part.slice(0, eq)).trim();
    if (k === name) {
      return (eq === -1 ? '' : part.slice(eq + 1)).trim();
    }
  }
  return undefined;
}

function applyCookieAttrs(isProduction: boolean): {
  httpOnly: true;
  sameSite: 'strict' | 'lax';
  secure: boolean;
  path: string;
} {
  return {
    httpOnly: true,
    sameSite: isProduction ? 'strict' : 'lax',
    secure: isProduction,
    path: REFRESH_COOKIE_PATH,
  };
}

/**
 * AC-3: reject a login body > 10KB as VALIDATION_ERROR (NOT 413) BEFORE the
 * ValidationPipe runs. Guards execute before pipes, so bcrypt / users.findOne
 * are never invoked. Relies on Content-Length (set honestly by clients /
 * supertest); the global body-parser limit (>=1MB) still caps absurd bodies.
 */
@Injectable()
class LoginBodySizeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request<{ body?: unknown }>>();
    const contentLength = Number.parseInt(
      String(request.headers['content-length'] ?? '0'),
      10,
    );
    if (Number.isFinite(contentLength) && contentLength > LOGIN_BODY_LIMIT_BYTES) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Login request body exceeds the 10KB limit.',
      });
    }
    return true;
  }
}

/** Surface a RATE_LIMITED `details.retryAfter` (or stashed) onto Retry-After. */
function maybeSetRetryAfter(err: unknown, res: Response): void {
  if (!(err instanceof HttpException)) return;
  const resp = err.getResponse();
  const details =
    typeof resp === 'object' && resp !== null
      ? (resp as { details?: { retryAfter?: number } }).details
      : undefined;
  const stashed = (
    err as HttpException & { retryAfter?: number }
  ).retryAfter;
  const retryAfter = stashed ?? details?.retryAfter;
  if (typeof retryAfter === 'number' && !res.headersSent) {
    res.setHeader('Retry-After', String(Math.max(1, Math.ceil(retryAfter))));
  }
}

@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: AppConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @UseGuards(LoginBodySizeGuard)
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.auth.login(
        body.identifier,
        body.password,
        extractIp(req),
        String(req.headers['user-agent'] ?? ''),
      );
      // Success only — Set-Cookie emitted here. On any thrown error we never
      // reach this line, so 401/429 send NO Set-Cookie (AC-NOSET-on-fail).
      res.cookie(REFRESH_COOKIE, result.refreshToken, {
        ...applyCookieAttrs(this.config.isProduction),
        maxAge: REFRESH_COOKIE_MAX_AGE_MS,
      });
      return {
        accessToken: result.accessToken,
        user: result.user,
        expiresIn: result.expiresIn,
      };
    } catch (err) {
      maybeSetRetryAfter(err, res);
      throw err;
    }
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = getCookie(req, REFRESH_COOKIE);
    const origin =
      (req.headers['origin'] as string | undefined) ??
      (req.headers['referer'] as string | undefined);
    try {
      const result = await this.auth.refresh(raw, extractIp(req), origin);
      res.cookie(REFRESH_COOKIE, result.refreshToken, {
        ...applyCookieAttrs(this.config.isProduction),
        maxAge: REFRESH_COOKIE_MAX_AGE_MS,
      });
      return { accessToken: result.accessToken, expiresIn: result.expiresIn };
    } catch (err) {
      // On any refresh failure (Origin / token / replay) clear the cookie so
      // the browser drops it and the client re-logs in.
      if (err instanceof HttpException && !res.headersSent) {
        res.clearCookie(REFRESH_COOKIE, applyCookieAttrs(this.config.isProduction));
      }
      maybeSetRetryAfter(err, res);
      throw err;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(getCookie(req, REFRESH_COOKIE));
    res.clearCookie(REFRESH_COOKIE, applyCookieAttrs(this.config.isProduction));
    // Idempotent: ALWAYS 200 with the success envelope (data:null).
    return null;
  }

  @Get('me')
  async me(@CurrentUser() userId: string) {
    return this.auth.me(userId);
  }
}
