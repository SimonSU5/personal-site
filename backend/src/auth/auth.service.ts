import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { AppConfigService } from '../config/config.service';
import { ErrorCode } from '../common/error-code';
import { User } from '../seed/user.schema';
import {
  LoginResponseDto,
  RefreshResponseDto,
  UserPublicDto,
} from './dto/login.dto';
import { RefreshToken } from './refresh-token.schema';
import { RateLimit } from './rate-limit.schema';

/**
 * SPEC §4 — Auth domain core logic.
 *
 * Owns login (3-layer Mongo throttle + enumeration-resistant verify + token
 * issuance), refresh rotation (atomic consume + family replay detection + 30d
 * absolute cap), idempotent logout, and `/me` (fresh findById, never trusts
 * the JWT payload).
 *
 * Security invariants:
 * - Raw refresh tokens NEVER stored / logged. Mongo stores sha256(raw).hex().
 * - Access tokens NEVER logged.
 * - Unknown-identifier login runs bcrypt.compare vs a precomputed DUMMY_HASH so
 *   the timing + response match a wrong-password attempt (enumeration
 *   resistance, AC §4.6).
 * - Refresh rotation is an atomic findOneAndUpdate({tokenHash, consumed:false})
 *   so concurrent replays produce exactly one winner (AC-8).
 */

// --- Login throttle constants (SPEC §2.3 / AC-4) ---
/** Per-IP request rate: 5 login requests / 15s. */
const LOGIN_REQ_LIMIT = 5;
const LOGIN_REQ_WINDOW_S = 15;
/** Per-IP failure lockout: 10 fails / 15min -> 15min lockout. */
const LOGIN_FAIL_IP_LIMIT = 10;
/** Per-username failure lockout: 5 fails / 15min -> 15min lockout. */
const LOGIN_FAIL_USER_LIMIT = 5;
const LOGIN_FAIL_WINDOW_S = 15 * 60;
const LOGIN_LOCKOUT_S = 15 * 60;
/** Refresh request rate: 30 / 60s / IP. */
const REFRESH_REQ_LIMIT = 30;
const REFRESH_REQ_WINDOW_S = 60;
/** Upper bound for Retry-After (SPEC §2.3: "(0, 900] seconds"). */
const RETRY_AFTER_MAX_S = 900;

/** Sliding refresh lifetime (SPEC default 7d). */
const REFRESH_SLIDING_S = 7 * 24 * 60 * 60;

/** Structured log event classes (SPEC §4.4 AC-OBS). */
type AuthEvent =
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILURE'
  | 'AUTH_TOKEN_REVOKED'
  | 'AUTH_RATE_LIMITED'
  | 'AUTH_ORIGIN_FORBIDDEN'
  | 'AUTH_INVALID_TOKEN';

interface LogContext {
  userId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  tokenHash?: string;
  familyId?: string;
  reason?: string;
}

/** sha256 hex of the raw refresh cookie value — the only form stored/logged. */
function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** Generate a fresh opaque 64-byte base64url refresh cookie value. */
function generateRefreshToken(): string {
  return randomBytes(64).toString('base64url');
}

/** Parse a JWT TTL string ('15m', '7d', '900') into whole seconds. */
function ttlToSeconds(ttl: string): number {
  const trimmed = ttl.trim();
  const match = /^(\d+)([smhd])?$/.exec(trimmed);
  if (match) {
    const n = Number.parseInt(match[1], 10);
    const unit = match[2] ?? 's';
    const mult =
      unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
    return n * mult;
  }
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : 900;
}

function clampRetryAfter(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds < 1) return 1;
  return Math.min(Math.ceil(seconds), RETRY_AFTER_MAX_S);
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');
  /** Precomputed once at construction so the unknown-user path runs a real
   * bcrypt.compare with the configured cost (timing matches a real user). */
  private readonly dummyHash: string;
  private readonly accessTtlSeconds: number;

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshToken>,
    @InjectModel(RateLimit.name) private readonly rateLimitModel: Model<RateLimit>,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {
    // Precompute the dummy hash once (module-load). Cost is the real cost so
    // the unknown-user bcrypt.compare takes the same time as a real compare.
    this.dummyHash = bcrypt.hashSync(
      'surong-dummy-password-do-not-match',
      this.config.bcryptCost,
    );
    this.accessTtlSeconds = ttlToSeconds(this.config.jwtAccessTtl);
  }

  // -------------------------------------------------------------------------
  // LOGIN
  // -------------------------------------------------------------------------

  /**
   * SPEC §4.1 login.
   *
   * Order: request-rate bucket -> IP-fail lockout -> username-fail lockout ->
   * bcrypt verify -> on success reset fail counters + issue tokens; on failure
   * bump fail counters (extending to lockout when threshold crossed) and return
   * byte-identical 401 INVALID_CREDENTIALS.
   */
  async login(
    identifier: string,
    password: string,
    ip: string,
    userAgent: string,
  ): Promise<LoginResponseDto> {
    const ua = (userAgent ?? '').slice(0, 256);
    const usernameKey = identifier.toLowerCase();

    // (1) Per-IP request rate (5/15s). Bumped on every request reaching here.
    await this.bumpRequestBucket(
      `login_req:${ip}`,
      LOGIN_REQ_LIMIT,
      LOGIN_REQ_WINDOW_S,
      { userId: null, ip, userAgent: ua },
    );

    // (2) IP failure lockout.
    await this.assertNotLocked(
      `login_fail_ip:${ip}`,
      { userId: null, ip, userAgent: ua },
    );
    // (3) Username failure lockout (NOT bypassable by IP rotation).
    await this.assertNotLocked(
      `login_fail_user:${usernameKey}`,
      { userId: null, ip, userAgent: ua },
    );

    // (4) Enumeration-resistant verify: load user (with passwordHash) and run
    // bcrypt in BOTH branches so timing + response are byte-identical.
    const user = await this.userModel
      .findOne({ username: identifier })
      .select('+passwordHash')
      .exec();
    const knownHash = user?.passwordHash ?? this.dummyHash;
    // Always run bcrypt.compare (constant-time-ish) regardless of user existence.
    const passwordOk = await bcrypt.compare(password, knownHash);

    const valid = Boolean(user && user.isActive && passwordOk);

    if (!valid) {
      // Bump both fail counters. If a threshold is crossed, extend the bucket
      // to a full lockout window.
      await this.recordFail(
        `login_fail_ip:${ip}`,
        LOGIN_FAIL_IP_LIMIT,
        { userId: user ? String(user._id) : null, ip, userAgent: ua },
      );
      await this.recordFail(
        `login_fail_user:${usernameKey}`,
        LOGIN_FAIL_USER_LIMIT,
        { userId: user ? String(user._id) : null, ip, userAgent: ua },
      );
      this.logEvent('AUTH_LOGIN_FAILURE', {
        userId: user ? String(user._id) : null,
        ip,
        userAgent: ua,
      });
      // Byte-identical 401 for both wrong-password and unknown-identifier.
      throw new HttpException(
        {
          code: ErrorCode.INVALID_CREDENTIALS,
          message: 'Invalid identifier or password.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Success: reset BOTH fail counters for this IP + username (AC-4d).
    await this.resetBucket(`login_fail_ip:${ip}`);
    await this.resetBucket(`login_fail_user:${usernameKey}`);

    const userId = String(user!._id);
    const accessToken = this.signAccess(userId, user!.username, user!.role);

    // New family on each login.
    const { refreshToken } = await this.issueRefreshToken(
      user!._id,
      randomUUID(),
    );

    this.logEvent('AUTH_LOGIN_SUCCESS', {
      userId,
      ip,
      userAgent: ua,
    });

    return {
      accessToken,
      user: { id: userId, username: user!.username, role: user!.role },
      expiresIn: this.accessTtlSeconds,
      refreshToken,
    };
  }

  // -------------------------------------------------------------------------
  // REFRESH
  // -------------------------------------------------------------------------

  /**
   * SPEC §4.1 refresh (cookie-only).
   *
   * Origin allowlist FIRST (absent OR mismatch -> 403 ORIGIN_FORBIDDEN + cookie
   * clear, NO rotation/revocation). Then atomic findOneAndUpdate to claim the
   * token; a consumed token on re-fetch means replay -> revoke whole family
   * (TOKEN_REVOKED). Rotate within the same family (inheriting familyExpiresAt);
   * enforce the 30d absolute cap (TOKEN_EXPIRED).
   */
  async refresh(
    rawToken: string | undefined,
    ip: string,
    origin: string | undefined,
  ): Promise<RefreshResponseDto> {
    // Origin allowlist — checked before any DB token op (AC-13a/b). Absent OR
    // mismatch is forbidden. Per SPEC §2.3/§2.5 the refresh-cookie endpoint uses
    // ALLOWED_ORIGINS (the CSRF-sensitive allowlist), NOT FRONTEND_ORIGIN (the
    // broader CORS list) — an operator may narrow ALLOWED_ORIGINS to lock down
    // refresh while keeping CORS permissive.
    if (!origin || !this.config.allowedOrigins.includes(origin)) {
      this.logEvent('AUTH_ORIGIN_FORBIDDEN', { ip, userAgent: null });
      throw new HttpException(
        {
          code: ErrorCode.ORIGIN_FORBIDDEN,
          message: 'Refresh origin not allowed.',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    if (!rawToken) {
      this.logEvent('AUTH_INVALID_TOKEN', { ip, userAgent: null });
      throw new HttpException(
        {
          code: ErrorCode.INVALID_TOKEN,
          message: 'Missing refresh token.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Per-IP refresh request rate (30/60s).
    await this.bumpRequestBucket(
      `refresh_req:${ip}`,
      REFRESH_REQ_LIMIT,
      REFRESH_REQ_WINDOW_S,
      { ip, userAgent: null },
    );

    const tokenHash = hashToken(rawToken);
    const now = new Date();

    // Atomic claim: only the first caller wins for an unconsumed token.
    const claimed = await this.refreshTokenModel
      .findOneAndUpdate(
        { tokenHash, consumed: false },
        { $set: { consumed: true, consumedAt: now } },
        { returnDocument: 'after' },
      )
      .exec();

    if (!claimed) {
      // Either the token is unknown, OR it was already consumed (replay).
      const existing = await this.refreshTokenModel
        .findOne({ tokenHash })
        .exec();
      if (existing && existing.consumed) {
        // Replay detected -> revoke the ENTIRE family.
        await this.revokeFamily(existing.familyId, 'replay_detected', now);
        this.logEvent('AUTH_TOKEN_REVOKED', {
          userId: String(existing.userId),
          ip,
          userAgent: null,
          tokenHash,
          familyId: existing.familyId,
        });
        throw new HttpException(
          {
            code: ErrorCode.TOKEN_REVOKED,
            message: 'Refresh token replay detected; family revoked.',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }
      // No token at all.
      this.logEvent('AUTH_INVALID_TOKEN', { ip, userAgent: null, tokenHash });
      throw new HttpException(
        {
          code: ErrorCode.INVALID_TOKEN,
          message: 'Unknown refresh token.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Enforce sliding + absolute caps (AC: 30d absolute family cap).
    if (now.getTime() > claimed.expiresAt.getTime()) {
      this.logEvent('AUTH_INVALID_TOKEN', {
        userId: String(claimed.userId),
        ip,
        userAgent: null,
        tokenHash,
        familyId: claimed.familyId,
      });
      throw new HttpException(
        {
          code: ErrorCode.TOKEN_EXPIRED,
          message: 'Refresh token expired.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (now.getTime() > claimed.familyExpiresAt.getTime()) {
      this.logEvent('AUTH_INVALID_TOKEN', {
        userId: String(claimed.userId),
        ip,
        userAgent: null,
        tokenHash,
        familyId: claimed.familyId,
      });
      throw new HttpException(
        {
          code: ErrorCode.TOKEN_EXPIRED,
          message: 'Refresh token family exceeded its absolute lifetime.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // The user must still exist (deleted user -> INVALID_TOKEN, never 200).
    const user = await this.userModel.findById(claimed.userId).exec();
    if (!user || !user.isActive) {
      this.logEvent('AUTH_INVALID_TOKEN', {
        userId: String(claimed.userId),
        ip,
        userAgent: null,
        tokenHash,
        familyId: claimed.familyId,
      });
      throw new HttpException(
        {
          code: ErrorCode.INVALID_TOKEN,
          message: 'Token subject no longer valid.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Rotate within the SAME family, inheriting familyExpiresAt.
    const newRaw = generateRefreshToken();
    const newHash = hashToken(newRaw);
    try {
      await this.refreshTokenModel.create({
        tokenHash: newHash,
        familyId: claimed.familyId,
        userId: claimed.userId,
        consumed: false,
        rotatedFrom: claimed._id,
        revokedReason: null,
        expiresAt: new Date(now.getTime() + REFRESH_SLIDING_S * 1000),
        familyExpiresAt: claimed.familyExpiresAt,
      });
    } catch (err) {
      // AC-14PW: partial-write. The old token stays consumed (NOT resurrected).
      // In-flight returns 500; the client's next /refresh finds the consumed
      // token -> replay path -> TOKEN_REVOKED + family revoke. Recovery = login.
      this.logger.error(
        `Refresh rotation insert failed (partial-write): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw new HttpException(
        {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Token rotation failed.',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const accessToken = this.signAccess(
      String(user._id),
      user.username,
      user.role,
    );

    return {
      accessToken,
      expiresIn: this.accessTtlSeconds,
      refreshToken: newRaw,
    };
  }

  // -------------------------------------------------------------------------
  // LOGOUT
  // -------------------------------------------------------------------------

  /**
   * SPEC §4.1 logout — ALWAYS succeeds (idempotent). Marks the matching
   * unconsumed token consumed with revokedReason 'logout' (preserved for
   * forensics). Unknown / already-consumed / absent cookie -> no-op.
   */
  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const tokenHash = hashToken(rawToken);
    const now = new Date();
    await this.refreshTokenModel
      .updateOne(
        { tokenHash, consumed: false },
        {
          $set: {
            consumed: true,
            consumedAt: now,
            revokedReason: 'logout',
            revokedAt: now,
          },
        },
      )
      .exec();
    // Idempotent: no throw regardless of whether a doc matched.
  }

  // -------------------------------------------------------------------------
  // ME
  // -------------------------------------------------------------------------

  /**
   * SPEC §4.1 /me — fresh findById (do NOT trust the JWT payload). A deleted
   * user -> 401 INVALID_TOKEN (never 404, never 200).
   */
  async me(userId: string): Promise<UserPublicDto> {
    let oid: Types.ObjectId;
    try {
      oid = new Types.ObjectId(userId);
    } catch {
      this.logEvent('AUTH_INVALID_TOKEN', { userId, ip: null, userAgent: null });
      throw new HttpException(
        {
          code: ErrorCode.INVALID_TOKEN,
          message: 'Invalid token subject.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
    const user = await this.userModel.findById(oid).exec();
    if (!user || !user.isActive) {
      this.logEvent('AUTH_INVALID_TOKEN', { userId, ip: null, userAgent: null });
      throw new HttpException(
        {
          code: ErrorCode.INVALID_TOKEN,
          message: 'Token subject no longer valid.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
    return { id: String(user._id), username: user.username, role: user.role };
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private signAccess(
    userId: string,
    username: string,
    role: 'admin' | 'user',
  ): string {
    // expiresIn as a number of seconds (exp - iat <= 900, AC-JWT-config).
    return this.jwt.sign(
      { sub: userId, username, role },
      { expiresIn: this.accessTtlSeconds },
    );
  }

  /**
   * Create the first refresh token of a new family (login). Returns the raw
   * cookie value (caller sets the cookie) + stores only the hash.
   */
  private async issueRefreshToken(
    userId: Types.ObjectId,
    familyId: string,
  ): Promise<{ refreshToken: string }> {
    const raw = generateRefreshToken();
    const tokenHash = hashToken(raw);
    const now = new Date();
    await this.refreshTokenModel.create({
      tokenHash,
      familyId,
      userId,
      consumed: false,
      rotatedFrom: null,
      revokedReason: null,
      expiresAt: new Date(now.getTime() + REFRESH_SLIDING_S * 1000),
      familyExpiresAt: new Date(
        now.getTime() +
          this.config.refreshAbsoluteLifetimeDays * 24 * 60 * 60 * 1000,
      ),
    });
    return { refreshToken: raw };
  }

  /** Revoke every UNCONSUMED token in a family (replay / partial-write). */
  private async revokeFamily(
    familyId: string,
    reason: 'replay_detected' | 'family_expired' | 'partial_write',
    now: Date,
  ): Promise<void> {
    await this.refreshTokenModel
      .updateMany(
        { familyId, consumed: false },
        {
          $set: {
            consumed: true,
            consumedAt: now,
            revokedReason: reason,
            revokedAt: now,
          },
        },
      )
      .exec();
  }

  /**
   * Bump a request-rate bucket; throw RATE_LIMITED once the count exceeds the
   * limit. The bucket expires at the end of its (short) window.
   */
  private async bumpRequestBucket(
    key: string,
    limit: number,
    windowS: number,
    logCtx: LogContext,
  ): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + windowS * 1000);
    const updated = await this.rateLimitModel
      .findOneAndUpdate(
        { key },
        {
          $inc: { count: 1 },
          $set: { updatedAt: now },
          $setOnInsert: { expiresAt },
        },
        { upsert: true, returnDocument: 'after' },
      )
      .exec();
    if (updated && updated.count > limit) {
      const retryAfter = clampRetryAfter(
        (updated.expiresAt.getTime() - now.getTime()) / 1000,
      );
      this.logEvent('AUTH_RATE_LIMITED', { ...logCtx, reason: key });
      const err = new HttpException(
        {
          code: ErrorCode.RATE_LIMITED,
          message: 'Too many requests. Please retry later.',
          details: { retryAfter },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
      // Stash retryAfter on the error so the controller can set Retry-After.
      (err as HttpException & { retryAfter?: number }).retryAfter = retryAfter;
      throw err;
    }
  }

  /** If a fail bucket has reached its threshold and not expired -> locked. */
  private async assertNotLocked(
    key: string,
    logCtx: LogContext,
  ): Promise<void> {
    const doc = await this.rateLimitModel.findOne({ key }).lean().exec();
    if (!doc) return;
    if (doc.count >= getFailLimitForKey(key) && doc.expiresAt > new Date()) {
      const retryAfter = clampRetryAfter(
        (doc.expiresAt.getTime() - Date.now()) / 1000,
      );
      this.logEvent('AUTH_RATE_LIMITED', { ...logCtx, reason: key });
      const err = new HttpException(
        {
          code: ErrorCode.RATE_LIMITED,
          message: 'Too many failed attempts. Account temporarily locked.',
          details: { retryAfter },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
      (err as HttpException & { retryAfter?: number }).retryAfter = retryAfter;
      throw err;
    }
  }

  /**
   * Increment a failure bucket. On insert the window is the fail window; when
   * the count crosses the threshold we extend the bucket to a full lockout
   * window so the lockout lasts a full 15min from the triggering failure.
   */
  private async recordFail(
    key: string,
    limit: number,
    logCtx: LogContext,
  ): Promise<void> {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + LOGIN_FAIL_WINDOW_S * 1000);
    const updated = await this.rateLimitModel
      .findOneAndUpdate(
        { key },
        {
          $inc: { count: 1 },
          $set: { updatedAt: now },
          $setOnInsert: { expiresAt: windowEnd },
        },
        { upsert: true, returnDocument: 'after' },
      )
      .exec();
    if (updated && updated.count >= limit) {
      // Extend to a full lockout window from now (threshold just crossed).
      await this.rateLimitModel
        .updateOne(
          { key },
          { $set: { expiresAt: new Date(now.getTime() + LOGIN_LOCKOUT_S * 1000) } },
        )
        .exec();
      this.logEvent('AUTH_RATE_LIMITED', { ...logCtx, reason: key });
    }
  }

  private async resetBucket(key: string): Promise<void> {
    await this.rateLimitModel.deleteOne({ key }).exec();
  }

  private logEvent(event: AuthEvent, ctx: LogContext): void {
    const line: Record<string, unknown> = {
      event,
      userId: ctx.userId ?? null,
      ip: ctx.ip ?? null,
      userAgent: (ctx.userAgent ?? '').slice(0, 256),
      timestamp: new Date().toISOString(),
    };
    if (ctx.tokenHash) line.tokenHash = ctx.tokenHash;
    if (ctx.familyId) line.familyId = ctx.familyId;
    if (ctx.reason) line.reason = ctx.reason;
    // NEVER log raw refresh token / accessToken.
    this.logger.log(JSON.stringify(line));
  }
}

/** Fail-limit lookup keyed by bucket name prefix. */
function getFailLimitForKey(key: string): number {
  if (key.startsWith('login_fail_user:')) return LOGIN_FAIL_USER_LIMIT;
  return LOGIN_FAIL_IP_LIMIT;
}
