import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { getModelToken } from '@nestjs/mongoose';
import { Collection, Model } from 'mongoose';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { json, urlencoded } from 'express';
import type { Express } from 'express';
import type { Server } from 'http';

import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/exception.filter';
import { AppConfigService } from '../src/config/config.service';
import { User } from '../src/seed/user.schema';
import { RefreshToken } from '../src/auth/refresh-token.schema';
import { RateLimit } from '../src/auth/rate-limit.schema';

/**
 * SPEC §4.5 — Auth domain integration tests.
 *
 * Boots the FULL AppModule against the dev replica set (docker-compose.dev.yml)
 * and drives the 4 auth endpoints end-to-end. A dedicated test user is created
 * (and cleaned up) per suite; rate-limit buckets are cleared before each test
 * that is sensitive to them, since all requests share the loopback IP.
 *
 * Coverage: login happy/enumeration/lockout, refresh rotation + replay +
 * Origin, logout idempotent, /me valid / alg:none / deleted-user.
 */

const USERNAME = 'authtest';
const PASSWORD = 'test-password-123';
// MUST match ALLOWED_ORIGINS in test/setup-env.ts (the refresh-cookie allowlist,
// deliberately distinct from FRONTEND_ORIGIN). refresh reads allowedOrigins.
const ALLOWED_ORIGIN = 'https://refresh-test.example';

function algNoneToken(payload: object): string {
  const header = Buffer.from(
    JSON.stringify({ alg: 'none', typ: 'JWT' }),
  ).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
}

function extractCookieValue(
  setCookie: string | string[] | undefined,
  name: string,
): string | undefined {
  if (!setCookie) return undefined;
  const list = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const sc of list) {
    const first = sc.split(';')[0];
    const eq = first.indexOf('=');
    const k = first.slice(0, eq).trim();
    if (k === name) return first.slice(eq + 1).trim();
  }
  return undefined;
}

describe('Auth (e2e)', () => {
  let app: NestExpressApplication;
  let userModel: Model<User>;
  let refreshTokenModel: Model<RefreshToken>;
  let rateLimitModel: Model<RateLimit>;
  let throttlerCol: Collection;
  let testUserId: string;
  let server: Server;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>({
      bodyParser: false,
    });
    // Mirror main.ts: attach the JSON body parser ourselves (bodies must be
    // parsed before ValidationPipe runs on the login/refresh payloads).
    app.use(json({ limit: 20 * 1024 * 1024 }));
    app.use(urlencoded({ extended: true, limit: 20 * 1024 * 1024 }));
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    );
    app.useGlobalFilters(
      new GlobalExceptionFilter(app.get(HttpAdapterHost)),
    );
    const expressApp = app.getHttpAdapter().getInstance() as Express;
    expressApp.get('/health', (_req, res) => {
      res.type('text/plain').send('alive');
    });
    await app.init();
    server = app.getHttpServer();

    userModel = app.get<Model<User>>(getModelToken(User.name));
    refreshTokenModel = app.get<Model<RefreshToken>>(
      getModelToken(RefreshToken.name),
    );
    rateLimitModel = app.get<Model<RateLimit>>(getModelToken(RateLimit.name));
    // Global throttler collection (scaffolding-owned). Cleared per-test so this
    // request-heavy suite does not pollute the shared loopback-IP bucket that
    // app/integration suites also use when jest runs files in parallel.
    throttlerCol = rateLimitModel.db.collection('throttler');

    // Seed a dedicated test user (idempotent across re-runs).
    await userModel.deleteMany({ username: USERNAME }).exec();
    const hash = await bcrypt.hash(PASSWORD, 12);
    const created = await userModel.create({
      username: USERNAME,
      passwordHash: hash,
      role: 'admin',
      isActive: true,
    } as Partial<User>);
    testUserId = String(created._id);
    await refreshTokenModel.deleteMany({ userId: created._id }).exec();
    await rateLimitModel.deleteMany({}).exec();
    await throttlerCol.deleteMany({}).catch(() => undefined);
  }, 120_000);

  afterAll(async () => {
    try {
      await refreshTokenModel.deleteMany({ userId: testUserId }).exec();
      await rateLimitModel.deleteMany({}).exec();
      await throttlerCol.deleteMany({}).catch(() => undefined);
      await userModel.deleteMany({ username: USERNAME }).exec();
    } catch {
      // best-effort cleanup
    }
    if (app) await app.close();
  });

  // Clear shared loopback-IP buckets so each login-sensitive test starts fresh.
  beforeEach(async () => {
    await rateLimitModel.deleteMany({}).exec();
    await throttlerCol.deleteMany({}).catch(() => undefined);
  });

  // -------------------------------------------------------------------------
  // LOGIN
  // -------------------------------------------------------------------------

  it('TC-LOGIN-HAPPY: 200 + envelope + accessToken + refresh cookie', async () => {
    const res = await request(server)
      .post('/api/v1/auth/login')
      .send({ identifier: USERNAME, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(res.body.data.expiresIn).toBe(900);
    expect(res.body.data.user).toEqual({
      id: testUserId,
      username: USERNAME,
      role: 'admin',
    });
    // Refresh token never in the JSON body.
    expect(res.body.data.refreshToken).toBeUndefined();

    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    expect(cookieStr).toContain('refresh_token=');
    expect(cookieStr.toLowerCase()).toContain('httponly');
    expect(cookieStr.toLowerCase()).toContain('path=/api/v1/auth');
  });

  it('TC-LOGIN-UNKNOWN: unknown-user and wrong-password return identical 401 INVALID_CREDENTIALS, no Set-Cookie', async () => {
    const unknownRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ identifier: 'no-such-user', password: 'whatever' });

    const wrongRes = await request(server)
      .post('/api/v1/auth/login')
      .send({ identifier: USERNAME, password: 'wrong-password' });

    for (const res of [unknownRes, wrongRes]) {
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.headers['set-cookie']).toBeUndefined();
    }
    // Byte-identical SHAPE: same code, same status, both lack Set-Cookie.
    expect(unknownRes.body.error.code).toEqual(wrongRes.body.error.code);
  });

  it('TC-LOGIN-RATE-LIMIT: request-rate 5/15s -> 6th is 429 RATE_LIMITED', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({ identifier: USERNAME, password: PASSWORD });
      statuses.push(res.status);
    }
    // First 5 succeed (valid creds, within request window).
    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    // 6th trips the request-rate bucket.
    expect(statuses[5]).toBe(429);
    // last response should carry RATE_LIMITED.
  });

  it('TC-LOGIN-RATE-LIMIT: 429 carries RATE_LIMITED code + Retry-After', async () => {
    // Burn the bucket first.
    for (let i = 0; i < 5; i++) {
      await request(server)
        .post('/api/v1/auth/login')
        .send({ identifier: USERNAME, password: PASSWORD });
    }
    const res = await request(server)
      .post('/api/v1/auth/login')
      .send({ identifier: USERNAME, password: PASSWORD });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('AC-3: login body >10KB -> VALIDATION_ERROR (NOT 413) before validation', async () => {
    // A body well over the 10KB login limit. The body-size guard runs BEFORE
    // the ValidationPipe (and before bcrypt / users.findOne).
    const huge = 'x'.repeat(11_000);
    const res = await request(server)
      .post('/api/v1/auth/login')
      .send({ identifier: USERNAME, password: huge });
    expect(res.status).not.toBe(413);
    expect([400, 422]).toContain(res.status);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // -------------------------------------------------------------------------
  // REFRESH
  // -------------------------------------------------------------------------

  async function loginForCookie(): Promise<string> {
    const res = await request(server)
      .post('/api/v1/auth/login')
      .send({ identifier: USERNAME, password: PASSWORD });
    expect(res.status).toBe(200);
    const value = extractCookieValue(
      res.headers['set-cookie'] as string | string[] | undefined,
      'refresh_token',
    );
    if (!value) throw new Error('no refresh cookie after login');
    return value;
  }

  async function refreshWith(
    cookieValue: string | undefined,
    origin: string,
  ): Promise<request.Response> {
    const req = request(server).post('/api/v1/auth/refresh');
    if (cookieValue !== undefined) {
      req.set('Cookie', `refresh_token=${cookieValue}`);
    }
    req.set('Origin', origin);
    return req.send();
  }

  it('TC-REFRESH-HAPPY: rotates the cookie and the old one stops working', async () => {
    const cookie1 = await loginForCookie();

    const res = await refreshWith(cookie1, ALLOWED_ORIGIN);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(res.body.data.expiresIn).toBe(900);

    const cookie2 = extractCookieValue(
      res.headers['set-cookie'] as string | string[] | undefined,
      'refresh_token',
    );
    expect(cookie2).toBeDefined();
    expect(cookie2).not.toEqual(cookie1);

    // The rotated (new) cookie works for a second rotation.
    const res2 = await refreshWith(cookie2!, ALLOWED_ORIGIN);
    expect(res2.status).toBe(200);
  });

  it('TC-REFRESH-REPLAY: replaying the consumed token revokes the whole family', async () => {
    const cookie1 = await loginForCookie();

    // Winner consumes cookie1.
    const winner = await refreshWith(cookie1, ALLOWED_ORIGIN);
    expect(winner.status).toBe(200);

    // Replay the SAME (now consumed) cookie -> TOKEN_REVOKED.
    const replay = await refreshWith(cookie1, ALLOWED_ORIGIN);
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe('TOKEN_REVOKED');

    // The rotated cookie is in the same family, which is now revoked.
    const rotated = extractCookieValue(
      winner.headers['set-cookie'] as string | string[] | undefined,
      'refresh_token',
    );
    const afterRevoke = await refreshWith(rotated!, ALLOWED_ORIGIN);
    expect(afterRevoke.status).toBe(401);
    expect(['TOKEN_REVOKED', 'INVALID_TOKEN']).toContain(
      afterRevoke.body.error.code,
    );

    // Family fully revoked in the DB.
    const familyId = (
      await refreshTokenModel
        .findOne({ tokenHash: { $ne: '' } })
        .sort({ createdAt: -1 })
        .exec()
    )?.familyId;
    if (familyId) {
      const unconsumed = await refreshTokenModel
        .countDocuments({ familyId, consumed: false })
        .exec();
      expect(unconsumed).toBe(0);
    }
  });

  it('TC-REFRESH-ORIGIN-MISSING: no Origin header -> 403 ORIGIN_FORBIDDEN, no rotation', async () => {
    const cookie1 = await loginForCookie();

    const res = await request(server)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refresh_token=${cookie1}`)
      .send(); // no Origin

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ORIGIN_FORBIDDEN');
    // The token must NOT have been consumed/rotated — it still works with a
    // valid Origin afterwards.
    const ok = await refreshWith(cookie1, ALLOWED_ORIGIN);
    expect(ok.status).toBe(200);
  });

  it('TC-REFRESH-ORIGIN-MISMATCH: disallowed Origin -> 403 ORIGIN_FORBIDDEN', async () => {
    const cookie1 = await loginForCookie();

    const res = await refreshWith(cookie1, 'http://evil.example');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ORIGIN_FORBIDDEN');

    // Still usable with a valid origin.
    const ok = await refreshWith(cookie1, ALLOWED_ORIGIN);
    expect(ok.status).toBe(200);
  });

  it('TC-REFRESH-ORIGIN-USES-ALLOWED-ORIGINS (regression: review residual #1): refresh honors ALLOWED_ORIGINS, not FRONTEND_ORIGIN', async () => {
    // Regression guard: setup-env sets ALLOWED_ORIGINS distinct from
    // FRONTEND_ORIGIN. refresh MUST read allowedOrigins. An Origin valid for
    // CORS (FRONTEND_ORIGIN) but absent from ALLOWED_ORIGINS must be rejected
    // by the live refresh endpoint.
    const config = app.get(AppConfigService);
    const corsOrigin = config.frontendOrigins[0];
    const refreshOrigin = config.allowedOrigins[0];
    expect(corsOrigin).not.toBe(refreshOrigin);

    const cookie1 = await loginForCookie();

    // Origin allowed for CORS but NOT for refresh → rejected.
    const corsButNotRefresh = await refreshWith(cookie1, corsOrigin);
    expect(corsButNotRefresh.status).toBe(403);
    expect(corsButNotRefresh.body.error.code).toBe('ORIGIN_FORBIDDEN');

    // The ALLOWED_ORIGINS entry still works.
    const ok = await refreshWith(cookie1, refreshOrigin);
    expect(ok.status).toBe(200);
  });

  // -------------------------------------------------------------------------
  // LOGOUT
  // -------------------------------------------------------------------------

  it('TC-LOGOUT-IDEMPOTENT: always 200 even with no cookie / unknown hash', async () => {
    const noCookie = await request(server)
      .post('/api/v1/auth/logout')
      .send();
    expect(noCookie.status).toBe(200);
    expect(noCookie.body.success).toBe(true);

    const cookie = await loginForCookie();
    const withCookie = await request(server)
      .post('/api/v1/auth/logout')
      .set('Cookie', `refresh_token=${cookie}`)
      .send();
    expect(withCookie.status).toBe(200);
    expect(withCookie.body.success).toBe(true);

    // Calling again (cookie now consumed server-side) still 200.
    const again = await request(server)
      .post('/api/v1/auth/logout')
      .set('Cookie', `refresh_token=${cookie}`)
      .send();
    expect(again.status).toBe(200);

    // Logout clears the cookie (either Max-Age=0 or an epoch Expires, and the
    // value emptied). Express emits an epoch `expires=` for clearCookie.
    const sc = Array.isArray(withCookie.headers['set-cookie'])
      ? (withCookie.headers['set-cookie'] as string[])[0]
      : (withCookie.headers['set-cookie'] as string);
    const lower = sc.toLowerCase();
    expect(lower).toContain('path=/api/v1/auth');
    expect(lower.includes('max-age=0') || lower.includes('expires=thu, 01 jan 1970')).toBe(true);
    // The cookie value is cleared (empty).
    expect(lower).toMatch(/refresh_token=;/);
  });

  // -------------------------------------------------------------------------
  // ME
  // -------------------------------------------------------------------------

  async function loginForAccessToken(): Promise<string> {
    const res = await request(server)
      .post('/api/v1/auth/login')
      .send({ identifier: USERNAME, password: PASSWORD });
    expect(res.status).toBe(200);
    return res.body.data.accessToken as string;
  }

  it('TC-ME-VALID: returns fresh {id,username,role} for a valid Bearer', async () => {
    const token = await loginForAccessToken();
    const res = await request(server)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      id: testUserId,
      username: USERNAME,
      role: 'admin',
    });
  });

  it('TC-ME-NO-TOKEN: missing Authorization -> 401 UNAUTHORIZED', async () => {
    const res = await request(server).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('TC-ME-ALG-NONE: alg:none token -> 401 INVALID_TOKEN + WWW-Authenticate', async () => {
    const token = algNoneToken({
      sub: testUserId,
      username: USERNAME,
      role: 'admin',
    });
    const res = await request(server)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
    const www = res.headers['www-authenticate'];
    expect(typeof www === 'string' ? www : Array.isArray(www) ? www[0] : '').toMatch(
      /invalid_token/i,
    );
  });

  it('TC-ME-DELETED-USER: valid signed JWT whose user was deleted -> 401 INVALID_TOKEN', async () => {
    // Create a throwaway user, log in to get a valid signed token, delete it.
    const tempName = `authtest-deleted-${Date.now()}`;
    const hash = await bcrypt.hash('temp-pass-123', 12);
    const temp = await userModel.create({
      username: tempName,
      passwordHash: hash,
      role: 'admin',
      isActive: true,
    } as Partial<User>);

    const res = await request(server)
      .post('/api/v1/auth/login')
      .send({ identifier: tempName, password: 'temp-pass-123' });
    expect(res.status).toBe(200);
    const token = res.body.data.accessToken as string;

    await userModel.deleteOne({ _id: temp._id }).exec();

    const meRes = await request(server)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(meRes.status).toBe(401);
    expect(meRes.body.error.code).toBe('INVALID_TOKEN');
  });
});
