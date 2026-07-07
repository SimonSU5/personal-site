# surong-personal — Backend Migration SPEC

> **Status:** Consolidated engineering spec. Authored by Lead Architect from 8 PM↔Architect consensus domain specs.
> **Target file:** `backend/docs/spec/SPEC.md`
> **Stack:** NestJS + MongoDB + JWT (access+refresh), pnpm monorepo (`frontend/` + `backend/` + `shared/`), deployed to Alibaba Cloud ECS + OSS behind nginx.
> **Stable API contract:** `/api/v1`. Future breaking changes go to `/api/v2`.

---

## 1. Overview

### 1.1 What we are migrating from

A Next.js 16.2.9 App Router **monolith** (`surong-personal`) with 14 API routes under `app/api/`, flat JSON-file persistence in `data/` (read/written via `fs/promises` inside route handlers), a single shared `ADMIN_PASSWORD` env var with an HMAC-signed `admin-session` cookie, an unwired `proxy.ts`, an in-memory rate-limit `Map`, local-disk image uploads to `public/uploads/`, and a GitHub sync that **wholesale-overwrites** `data/posts.json` + `data/works.json` (clobbering manual edits).

### 1.2 What we are migrating to

A **pnpm monorepo**:
- `backend/` — NestJS + TypeScript + Mongoose/MongoDB, API prefix `/api/v1`.
- `frontend/` — the existing Next.js app, moved verbatim, switched to backend fetch (RSC detail pages) + a unified `api-client.ts`.
- `shared/` — workspace package exporting the response envelope + DTO contract types (eliminates wire drift).

Deployed on a **single Alibaba Cloud ECS** host via `docker compose` (`mongo` + `backend` + `frontend` + `nginx`); images to **Alibaba OSS**. Synced GitHub markdown images stay on the **jsdelivr CDN** (hybrid).

### 1.3 Known bugs / inconsistencies fixed by this SPEC

| # | Bug in monolith | Fix in SPEC |
|---|---|---|
| 1 | Sync overwrites local edits | UPSERT with field-ownership matrix + `lockedFields`; never matches `source:'manual'` (§11.1) |
| 2 | `/api/github/sync` has no auth | `POST /api/v1/github/sync` behind `JwtAuthGuard`; webhook stays HMAC (§9) |
| 3 | PUT semantics inconsistent (content shallow-merge, about full-replace, posts/works differ) | UNIFY: PATCH-style partial update everywhere; uniform `{success,data}` envelope (§2.1) |
| 4 | `lib/types.ts` Work interface stale (`image?/tags?`) | Live JSON shape (`cover/tech/demo/repo/featured`) in shared DTOs (§7) |
| 5 | Two about data sources (`content.json.about` vs `about.json`) | Single `content` singleton; `about.json` + `config.json` DROPPED (§5) |
| 6 | `proxy.ts` not wired as middleware | Deleted; admin gating via `AuthContext` + api-client 401 redirect (§10) |
| 7 | Rate limiting in-memory `Map` (not cluster-safe) | Mongo + Redis-backed stores, cluster-safe (§2.8) |
| 8 | RSC pages read JSON directly (double source of truth) | RSC fetch backend public GET endpoints (§10) |
| 9 | Default `admin123` password / `dev-secret` defaults | Fail-closed bootstrap; no secret defaults (§3) |
| 10 | Plaintext GitHub PAT in `data/github-settings.json` | AES-256-GCM ciphertext, fixed mandatory key (§9) |

### 1.4 Locked decisions (do not re-litigate)

- **Stack:** NestJS + MongoDB + JWT (access 15min in JS memory + refresh 7d httpOnly cookie, rotated). Deploy: Alibaba ECS (docker compose) + OSS.
- **Monorepo:** existing Next.js → `frontend/`; new NestJS in `backend/`; `shared/` workspace package.
- **Users collection** with seeded admin (not a single shared password).
- **Drop** legacy `edit-about`, `edit-content`, `data/about.json`, `data/config.json`, `proxy.ts`.
- **Images:** jsdelivr for synced content + OSS for new uploads (hybrid).
- **Mongo as 1-node replica set** (transactions available for sync upsert + seed).

---

## 2. Cross-Cutting Concerns

### 2.1 Uniform Response Envelope

EVERY `/api/v1` controller return is wrapped by the global `ResponseInterceptor`. The ONLY exception is raw `GET /health` (text/plain `alive`, outside `/api/v1`).

**Success:**
```jsonc
{ "success": true, "data": <T> }      // data is null if controller returned null/undefined
```

**Error:**
```jsonc
{
  "success": false,
  "error": {
    "code": "<ErrorCode>",            // machine-readable, see §2.2
    "message": "<human-readable>",    // optional
    "details": { ... }                // optional, e.g. { field, message }[] or { path, method }
  },
  "requestId": "<uuid v4>"            // ALWAYS present; matches X-Request-Id header (§2.4)
}
```

**Rules:**
- No bare object/array/primitive/string escapes any `/api/v1` controller.
- No NestJS default `{ statusCode, message }` body leaks.
- The field is **`requestId`** (canonical, matches the `X-Request-Id` header). Earlier domain drafts used `correlationId` — that is a **reconciled alias**; implementations MUST use `requestId`.
- Stack traces NEVER appear in any response body in production (server-side logs only).

### 2.2 Unified Error Code Table

`ErrorCode` is exported from `@surong-personal/shared`. The **global/cross-cutting** codes are owned by Scaffolding; each domain may **extend** with domain-specific codes (listed in their sections). Domain codes must not collide with global codes.

| Code | HTTP | Owner | Meaning |
|---|---|---|---|
| `VALIDATION_ERROR` | 422 | global | class-validator rejection (unknown field / type mismatch / range). NOTE: replaces domain drafts `VALIDATION` and `VALIDATION_FAILED` — those are reconciled to this single code. |
| `BAD_REQUEST` | 400 | global | malformed JSON body (trailing comma, unclosed brace) |
| `PAYLOAD_TOO_LARGE` | 413 | global | body > `BODY_LIMIT_BYTES` (or per-route override) |
| `PAYLOAD_TOO_DEEP` | 400 | global | body nesting > `PAYLOAD_MAX_DEPTH` |
| `NOT_FOUND` | 404 | global | unknown `/api/v1` path OR resource id not found |
| `METHOD_NOT_ALLOWED` | 405 | global | known path + wrong method (`details.allow:[...]`) |
| `TOO_MANY_REQUESTS` | 429 | global | **global** API throttle exceeded (scaffolding Mongo throttler) |
| `UNAUTHORIZED` | 401 | auth | missing/wrong-scheme `Authorization` header on a protected route |
| `FORBIDDEN` | 403 | auth | valid token but insufficient role |
| `NOT_READY` | 503 | global | readiness probe: a dependency is down |
| `DEPENDENCY_DOWN` | 503 | global | mid-flight Mongo drop on a DB-dependent request |
| `BIND_ERROR` | 500 | global | `app.listen` EADDRINUSE / host invalid (process exits 1) |
| `INTERNAL_ERROR` | 500 | global | unhandled non-`HttpException` |
| `INVALID_CREDENTIALS` | 401 | auth | wrong password or unknown identifier (byte-identical) |
| `INVALID_TOKEN` | 401 | auth | malformed / expired / bad-signature / `alg:none` / deleted user (sets `WWW-Authenticate`) |
| `TOKEN_EXPIRED` | 401 | auth | refresh cookie beyond sliding 7d |
| `TOKEN_REVOKED` | 401 | auth | replay of consumed refresh token → family revoked |
| `RATE_LIMITED` | 429 | auth/upload | **per-route** throttle (login lockout, refresh, upload). Carries `Retry-After`. Distinct from global `TOO_MANY_REQUESTS`. |
| `ORIGIN_FORBIDDEN` | 403 | auth | `/auth/refresh` Origin/Referer not in allowlist |
| `VERSION_REQUIRED` | 400 | content | mutation missing `If-Match` |
| `CONFLICT` | 409 | content/posts/works | stale `If-Match` (optimistic lock) |
| `FEATURED_CAP_REACHED` | 409 | works | featured cap exceeded on false→true transition |
| `SYNC_RUNNING` | 409 | github | a sync is already in progress |
| `OSS_UNAVAILABLE` | 502 | upload | OSS PUT failed after 3 retries |
| `OSS_NOT_CONFIGURED` | 503 | upload | mandatory OSS env missing |
| `NO_FILE` / `MIME_MISMATCH` / `INVALID_IMAGE` / `DECOMPRESSION_BOMB` / `RESULT_TOO_LARGE` / `UNSUPPORTED_MEDIA_TYPE` | 400/415 | upload | upload validation (see §8) |

**Reconciliation note:** the four domain drafts (`VALIDATION`, `VALIDATION_FAILED`, `VALIDATION_ERROR`, `BAD_REQUEST`-for-validation) are unified to `VALIDATION_ERROR`. Per-route body-size rejections use `PAYLOAD_TOO_LARGE` (NOT a bare framework 413).

### 2.3 JWT Auth Flow

```
                          ┌─────────────────────────────┐
   Admin browser          │     NestJS backend          │
 ┌──────────────┐         │  /api/v1/auth/*             │
 │ AuthContext  │         │                             │
 │  accessToken │         │   users (Mongo)             │
 │  (JS memory  │         │   refreshTokens (Mongo,     │
 │   ONLY)      │         │     sha256-hashed, family-  │
 │              │         │     scoped, TTL-purged)     │
 └──────┬───────┘         │   rateLimits (Mongo)        │
        │                 └─────────────┬───────────────┘
        │                               │
  1) POST /api/v1/auth/login  ─────────►│ bcrypt.compare vs users; bucket check first
     {username,password}                │ (login_req/login_fail_ip/login_fail_user)
        │                               │
  ◄─────┴ 200 {success,data:{accessToken,expiresIn,user}}
           Set-Cookie: refresh_token (httpOnly, SameSite=Strict[prod]/Lax[dev],
                        Secure[prod], Path=/api/v1/auth, Max-Age=604800, NO Domain)
                                     familyId=uuid v4, absolute cap 30d

  ─────────────── 15 min later, accessToken expires ───────────────

  2) any api-client call ──► 401 UNAUTHORIZED
        │
        │ api-client: coalesce ALL concurrent 401s behind ONE in-flight refresh
        ▼
  3) POST /api/v1/auth/refresh ────────► Origin/Referer EXACT-match ALLOWED_ORIGINS
     (cookie auto-sent; NO body;        │ else 403 ORIGIN_FORBIDDEN
      NO Authorization header)          │ atomic findOneAndUpdate({tokenHash,consumed:false})
        │                               │   → winner: consume old, insert rotated (same familyId,
        │                               │     inherited familyExpiresAt, rotatedFrom=old._id)
        │                               │   → loser/reuse: 401 TOKEN_REVOKED + whole-family revoke
        │                               │ 30 req/60s/IP throttle (RATE_LIMITED + Retry-After)
  ◄─────┴ 200 {success,data:{accessToken,expiresIn}}
           Set-Cookie: rotated refresh_token (old invalidated)

  4) original request retried ONCE with new accessToken

  ─────────────── refresh fails (401/403/network) ───────────────
     api-client: clear memory token, best-effort POST /auth/logout,
                 window.location='/admin/login'. NO loop. Pending queue rejected.

  ─────────────── admin clicks Logout ───────────────
  5) POST /api/v1/auth/logout ─────────► @Public (no JwtAuthGuard, no Origin check,
     (Bearer optional; cookie sent)      works with expired/missing access)
                                        │ mark refreshTokens doc consumed=true,
                                        │   revokedReason='logout' (preserved for forensics)
  ◄─────┴ 200 {success:true} + Set-Cookie clear (Max-Age=0, Path=/api/v1/auth)
          ALWAYS 200, idempotent (even no cookie / unknown hash)
```

**Invariants:**
- Access token (HS256, `algorithms:['HS256']` pin, `clockTolerance<=30s`) lives ONLY in JS memory on the frontend — never localStorage/sessionStorage/cookie/URL.
- Refresh token is an **opaque** 64-byte `base64url` value; Mongo stores only `sha256(raw).hex()`.
- Refresh cookie: `Path=/api/v1/auth` (browser does NOT send it on `/content`, `/posts`, `/works`, `/upload`, `/github-sync`), `SameSite=Strict` in prod (same-origin via nginx) / `Lax` in dev (so cross-origin localhost refresh sends the cookie), `Secure=(NODE_ENV==='production')`, NO `Domain`.
- 3-layer login throttle (all Mongo, cluster-safe): request-rate `5/15s/IP`, IP failure-lockout `10 fails/15min→15min`, username failure-lockout `5 fails/15min→15min`. Lockout checked BEFORE validation and BEFORE bcrypt. Correct login resets failure counters. `Retry-After` in `(0,900]` seconds.

### 2.4 Request Correlation (`X-Request-Id`)

- Inbound `X-Request-Id` present → echoed verbatim; absent → uuid v4 generated.
- The same id appears in: the response header, every structured log line, and every error body's `requestId` field.
- Used for **correlation ONLY** — NEVER for authorization, rate-limit bypass, or user switching. No authz decision reads it.

### 2.5 Environment Variables (full list)

Validated at startup by `ConfigModule` against `ConfigEnvironmentDto` (class-validator/class-transformer, NOT Joi). **NO default fallback for any secret.** Missing/invalid required var, OR `JWT_ACCESS_SECRET === JWT_REFRESH_SECRET`, OR any secret below minimum, OR `GITHUB_ENCRYPTION_KEY` length ≠ 32 → `process.exit(1)` BEFORE `app.listen`, stderr lists EVERY offending var + reason in one block.

| Var | Required | Default | Constraint / description |
|---|---|---|---|
| `NODE_ENV` | yes | — | `development` \| `production` \| `test` |
| `PORT` | no | `3001` | backend listen port |
| `HOST` | no | `0.0.0.0` | bind host |
| `MONGO_URI` | yes | — | `mongodb(+srv)?://…` — **must target a 1-node replica set** (`?replSet=…`) |
| `MONGO_DB_NAME` | yes | — | database name |
| `MONGO_CONNECT_MAX_RETRIES` | no | `5` | startup connect retries |
| `MONGO_CONNECT_BACKOFF_MS` | no | `1000` | exponential backoff base (cap 16s) |
| `JWT_ACCESS_SECRET` | yes | — | ≥32 random bytes; must differ from refresh |
| `JWT_ACCESS_TTL` | no | `15m` | access token lifetime |
| `JWT_REFRESH_SECRET` | yes | — | ≥32 random bytes; must differ from access (refresh is opaque, but secret enforces distinctness at boot) |
| `JWT_REFRESH_TTL` | no | `7d` | sliding refresh lifetime |
| `REFRESH_ABSOLUTE_LIFETIME_DAYS` | no | `30` | absolute family cap |
| `ALLOWED_ORIGINS` | yes | — | comma-separated exact-match origins for `/auth/refresh` (dev includes `http://localhost:3000`; prod https-only). Empty in prod → fail-closed. |
| `GITHUB_ENCRYPTION_KEY` | yes | — | **exactly** 32 bytes (AES-256-GCM key) |
| `GITHUB_WEBHOOK_SECRET` | yes | — | HMAC secret for `/api/v1/github/webhook`; empty → webhook refuses all (manual sync still works) |
| `GITHUB_TOKEN` | no | — | bootstrap fallback PAT (DB `githubsettings` wins) |
| `GITHUB_REPO` | no | — | bootstrap fallback repo (DB wins) |
| `GITHUB_SYNC_CONCURRENCY` | no | `3` | concurrent GitHub file fetches per run |
| `GITHUB_FILE_TIMEOUT_MS` | no | `15000` | per-file fetch timeout |
| `GITHUB_AUTO_UNPUBLISH_STALE_COUNT` | no | `3` | `0` disables auto-unpublish of stale github docs |
| `OSS_REGION` | yes | — | Alibaba OSS region |
| `OSS_BUCKET` | yes | — | OSS bucket name |
| `OSS_ACCESS_KEY_ID` | yes | — | OSS AK (never logged, never in response) |
| `OSS_ACCESS_KEY_SECRET` | yes | — | OSS SK (never logged, never in response) |
| `OSS_ENDPOINT` | no | — | optional custom OSS endpoint |
| `OSS_PUBLIC_BASE_URL` | no | `https://<OSS_BUCKET>.<OSS_REGION>.aliyuncs.com` | CDN/host for returned URLs; CSP `img-src` must include it |
| `OSS_HEAD_BUCKET_TIMEOUT` | no | `2000` | readiness head-bucket timeout |
| `ENABLE_OSS_READY_CHECK` | no | `true` | include OSS in `/health/ready` |
| `FRONTEND_ORIGIN` | yes | — | comma-separated allowlist for CORS (with credentials). NEVER `*`. |
| `ADMIN_BOOTSTRAP_USERNAME` | yes | — | `/^[A-Za-z0-9_.-]{3,32}$/` |
| `ADMIN_BOOTSTRAP_PASSWORD` | yes | — | ≥8 chars (seeded once; rotation is auth-domain) |
| `BCRYPT_COST` | no | `12` | min 12 enforced at boot |
| `THROTTLE_TTL` | no | `60` | global throttle window seconds |
| `THROTTLE_LIMIT` | no | `100` | global throttle requests/window/IP |
| `BODY_LIMIT_BYTES` | no | `20971520` (20MB) | JSON body limit (aligned with nginx) |
| `PAYLOAD_MAX_DEPTH` | no | `8` | nested object/array depth |
| `SHUTDOWN_GRACE_MS` | no | `10000` | SIGTERM drain grace |
| `LOG_LEVEL` | no | `info` | `fatal\|error\|warn\|info\|debug\|silly` |
| `MAX_FEATURED_WORKS` | no | `8` | works featured cap |
| `BACKEND_INTERNAL_URL` | no | `http://backend:3001/api/v1` | server-only; RSC fetch target (frontend reads this) |
| `NEXT_PUBLIC_API_URL` | no | `/api/v1` (prod) | browser-facing API base (frontend) |

`.env.example` MUST be committed listing every var with a one-line description and an obviously-fake example (`JWT_ACCESS_SECRET='change-me-32-bytes-min'`).

### 2.6 Deployment Topology (Alibaba ECS + OSS)

```
                  ┌────────────────────────────────────────────┐
                  │            single Alibaba ECS host          │
   internet ─────►│            nginx (TLS terminator)          │
                  │  /api/v1/* ──► http://backend:3001         │
                  │  /uploads/* ─► @json_413 / catch-all 302   │
                  │  /*        ──► http://frontend:3000        │
                  │  client_max_body_size 20m; gzip; sec-hdrs  │
                  └──────────────┬──────────────────────────────┘
                                 │
        ┌────────────────────────┼──────────────────────────────┐
        ▼                        ▼                              ▼
 ┌──────────────┐        ┌──────────────┐               ┌──────────────┐
 │  frontend    │        │   backend    │               │    mongo     │
 │ Next.js      │───────►│   NestJS     │──────────────►│  (replSet)   │
 │ standalone   │ RSC:   │  /api/v1     │  Mongoose     │  volume:     │
 │ output       │ BACKEND│              │  (retry+reconnect) mongo-data │
 │ :3000        │ _INTERNAL_URL         │               │  :27017      │
 └──────────────┘        └──────┬───────┘               └──────────────┘
                                 │
                                 ▼  ali-oss SDK (3x retry, exp backoff)
                          ┌──────────────┐
                          │ Alibaba OSS  │  bucket public-read POLICY
                          │  (images)    │  optional CDN host = OSS_PUBLIC_BASE_URL
                          └──────────────┘
```

- `docker compose up --build` from fresh checkout reaches ALL services healthy.
- `mongo` configured as **1-node replica set** (`--replSet` + init step) so transactions are available.
- `backend` non-root multi-stage Dockerfile, final stage `FROM node:20-slim` (NOT alpine — sharp + bcrypt native bindings break on musl).
- TLS terminated at nginx (so `Secure` cookies + `SameSite=Strict` work in prod).
- nginx `error_page 413` returns a static JSON envelope `{success:false,error:{code:'PAYLOAD_TOO_LARGE',message:'Request body exceeds the 20MB limit'}}` (NOT default HTML).

### 2.7 Bootstrap Order (`backend/src/main.ts`)

ConfigModule (validated) → `setGlobalPrefix('api/v1')` → global `ValidationPipe(whitelist,forbidNonWhitelisted,transform,enableImplicitConversion)` → global `ExceptionFilter` → global `ResponseInterceptor` (envelope) → `RequestIdMiddleware` → `helmet({contentSecurityPolicy:false})` → `enableCors({origin:FRONTEND_ORIGIN[],credentials:true})` → wire global filters/interceptors → `enableShutdownHooks` → register raw `GET /health` OUTSIDE the prefix → `app.listen(PORT,HOST)`. A boot test asserts this exact order.

### 2.8 Throttling Strategy (cluster-safe)

Two layers, both shared across replicas (NO in-memory `Map` anywhere):

1. **Global API throttle** — `@nestjs/throttler` with a **Mongo-backed** `ThrottlerStorageService` writing the `throttler` collection (composite key `${routeName}:${tracker}`, `tracker` = `X-Forwarded-For` FIRST/leftmost entry, TTL index on `expiresAt`). `>THROTTLE_LIMIT/min/IP` → `429 TOO_MANY_REQUESTS`. If the throttler store is unreachable → **fail-closed 503** (NEVER silently allowed).
2. **Per-route domain throttle** — auth (login 3-layer, refresh 30/60s) and upload (30/min/admin) use a **`rateLimits`** Mongo collection (TTL-purged). Returns `429 RATE_LIMITED` + `Retry-After`.

`grep -R "new Map(" backend/src` MUST return zero throttle/rate-limit hits.

---

## 3. Domain: Scaffolding & Infrastructure

**Purpose:** NestJS bootstrap, pnpm monorepo, validated fail-closed config, helmet, CORS allowlist w/ credentials, global ValidationPipe, uniform envelope + global exception filter, structured JSON logging with `X-Request-Id` correlation, Mongo-backed throttling, Mongoose async connection with startup retry + mid-flight resilience, idempotent admin seeding, liveness/readiness/raw health, graceful SIGTERM drain, port-bind error handling, payload depth/size limits, nginx 413 mapping, container/nginx topology. **Foundation domain — owns the `users` core seed contract + `throttler` collection + `SeedService`. Does NOT own JWT endpoints or business logic.**

### 3.1 REST Endpoints

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/health` | none | 200 `text/plain` body literally `alive` (outside `/api/v1`; bypasses interceptor; reserved for nginx/LB) |
| GET | `/api/v1` | none | 200 `{success:true,data:{name,apiVersion:'v1',prefix:'/api/v1',status:'alive',timestamp}}` |
| GET | `/api/v1/health` | none | 200 `{success:true,data:{status:'alive',timestamp,uptimeSeconds}}` — ZERO mongo/OSS round-trips; <500ms p99 even when deps down |
| GET | `/api/v1/health/ready` | none | deps up → 200 `{success:true,data:{status:'ready',details:{mongo,oss}}}`; any down → 503 `{success:false,error:{code:'NOT_READY',details:{mongo,oss}},requestId}`. Total budget 500ms; per-dep timeout `OSS_HEAD_BUCKET_TIMEOUT`. |
| OPTIONS | any `/api/v1/*` | none | preflight NEVER requires auth, NEVER 401. Allowed origin → 204 + ACAO/ACAC/ACAM/ACAH/ACAMaxAge; disallowed → 204 with NO ACAO. |
| * | `/api/v1/<unknown>` | n/a | unknown path → 404 `NOT_FOUND`; known path + wrong method → 405 `METHOD_NOT_ALLOWED` (`details.allow`). |

### 3.2 Mongo Schema

**`users`** (core seed contract; owned here, consumed by Auth)

| field | type | required | index | notes |
|---|---|---|---|---|
| `_id` | ObjectId | yes | — | auto |
| `username` | string `/^[A-Za-z0-9_.-]{3,32}$/` | yes | UNIQUE | case-sensitive; seeded lowercased from `ADMIN_BOOTSTRAP_USERNAME` |
| `passwordHash` | string (bcrypt, cost ≥12) | yes | — | NEVER selected in public reads; NEVER logged |
| `role` | `'admin'\|'user'` | yes | — | `'admin'` for seeded admin |
| `isActive` | boolean | yes | — | `true` |
| `createdAt` / `updatedAt` | Date | yes | — | — |

**`throttler`** (global API throttle)

| field | type | required | index | notes |
|---|---|---|---|---|
| `_id` | string `${routeName}:${tracker}` | yes | PK | composite; `tracker` = XFF first entry |
| `tracker` | string (IP) | yes | yes | per-IP aggregation |
| `routeName` | string | yes | — | throttle context |
| `totalHits` | int | yes | — | — |
| `expiresAt` | Date | yes | TTL `expireAfterSeconds:0` | auto-evict |
| `blockedUntil` | Date? | no | — | set when limit exceeded |
| `updatedAt` | Date | yes | — | — |

### 3.3 Key DTOs

- `ApiResponseDto<T>` `{success:true, data:T}`
- `ErrorEnvelopeDto` `{success:false, error:{code,message,details?}, requestId}`
- `ErrorCode` enum (§2.2)
- `ConfigEnvironmentDto` (INTERNAL; validates `process.env` at startup — full field list in §2.5)
- `HealthLivenessDto`, `HealthReadyDto`, `ServiceIdentityDto`

### 3.4 Acceptance Criteria

- [ ] **FR-1 MONOREPO:** `pnpm-workspace.yaml` with `packages:[frontend,backend,shared]`; existing Next.js moved verbatim into `frontend/` (next.config.ts, app/, components/, lib/, public/, data/); `@/*` alias resolves at frontend root; `pnpm install` resolves all three; `pnpm --filter frontend build` + `next build && next start` still serves the live site; `pnpm --filter backend build` emits `dist/`; `pnpm --filter shared build` emits.
- [ ] **FR-2 ROOT TOOLCHAIN:** root `package.json` scripts `dev:frontend`, `dev:backend`, `dev` (concurrently), `build`, `lint`, `typecheck`; root `eslint.config.mjs`, `.prettierrc`, `tsconfig.base.json`, `pnpm-lock.yaml` committed.
- [ ] **FR-3 SHARED PACKAGE:** both sides import envelope + DTO types from `@surong-personal/shared`; no drift.
- [ ] **FR-5 UNIFORM ENVELOPE:** no bare primitive/object escapes any `/api/v1` controller; raw `GET /health` is the only exception.
- [ ] **FR-6 LIVENESS:** `GET /api/v1/health` <500ms p99 with NO mongo/OSS round-trip even when deps down.
- [ ] **FR-7 READINESS:** `GET /api/v1/health/ready` 200 when up, 503 `NOT_READY` when any down; total ≤500ms; never hangs.
- [ ] **FR-9 CONFIG FAIL-CLOSED:** missing/invalid secret → `exit(1)` before bind; one offending-var block on stderr; NO default for any secret.
- [ ] **FR-11 ADMIN SEED IDEMPOTENT:** `users.countDocuments()===0` → create exactly ONE admin (bcrypt ≥12); count>0 → skip (NEVER overwrite password); concurrent seeders race → unique index, E11000 swallowed; final count === 1.
- [ ] **FR-13/14 MALFORMED / SIZE / DEPTH:** invalid JSON → 400 `BAD_REQUEST` (never raw Nest parse string, never 500); >`BODY_LIMIT_BYTES` → 413 `PAYLOAD_TOO_LARGE`; >`PAYLOAD_MAX_DEPTH` → 400 `PAYLOAD_TOO_DEEP` before controller hand-off.
- [ ] **FR-21/22 THROTTLE MONGO + FAIL-CLOSED:** `>THROTTLE_LIMIT/min/IP` → 429 `TOO_MANY_REQUESTS`; store unreachable → 503.
- [ ] **FR-23 GRACEFUL SHUTDOWN:** SIGTERM → `/health/ready` 503 immediately; in-flight finish within `SHUTDOWN_GRACE_MS`; mongoose closed; exit 0.
- [ ] **FR-24 PORT-BIND:** `EADDRINUSE` / invalid HOST → `exit(1)` with human line naming `PORT`+`HOST` BEFORE the raw Node stack.
- [ ] **FR-27 HELMET:** `contentSecurityPolicy:false`; keeps hsts(prod), noSniff, frameguard DENY, CORP; MUST NOT strip `Set-Cookie`.
- [ ] **FR-28/29 NON-ROOT + COMPOSE:** final stage `node:20-slim`, non-root uid≥1000, secrets via `env_file`; `docker compose up --build` reaches all-healthy; `docker run --rm <image> id -u` ≠ 0.
- [ ] **FR-31 TS STRICT:** `backend/tsconfig.json` `strict:true`, `noImplicitAny:true`, `strictNullChecks:true`; `pnpm --filter backend typecheck` zero errors.

### 3.5 Key Test Cases

- TC-01 liveness has no dependency round-trip (mongo+OSS stopped → still 200 <500ms, no network call).
- TC-03 readiness mongo-down → 503 `NOT_READY {mongo:false,oss:true}`.
- TC-07/08/09/10 missing secret / short JWT / identical JWT secrets / wrong-length encryption key → `exit(1)` before bind.
- TC-13 payload too deep → 400 `PAYLOAD_TOO_DEEP` before controller.
- TC-22 throttle exceeded global → 429 `TOO_MANY_REQUESTS`; `throttler` doc exists.
- TC-23 throttle fail-closed → throttler store unreachable → 503.
- TC-24 graceful drain on SIGTERM → ready=503, in-flight completes, exit 0.
- TC-25 port-in-use → human error naming PORT/HOST before raw stack.
- TC-26/27/28 seed idempotent; password unchanged on re-seed; concurrent race → exactly ONE admin.
- TC-34 full-stack compose fresh checkout → all healthy; nginx-served `/api/v1/health` + frontend page respond.

### 3.6 Security Notes

- No default fallback for any secret (kills legacy `admin123` / `dev-secret` / plaintext PAT hazards).
- bcrypt cost ≥12; `passwordHash` never selected in public reads, never logged.
- CORS allowlist array, NEVER `*` with credentials; disallowed origin → no ACAO header.
- IP source = XFF first entry (consistent with nginx); documented caveat if deployed behind another upstream LB.
- Non-root container; secrets via `env_file` at runtime, never baked into image.
- NTP/clock-skew reliance documented in README (JWT TTL, throttle windows, log timestamps).

---

## 4. Domain: Auth

**Purpose:** JWT issuance, refresh rotation, logout, `/me`. Owns `users` (consumed from Scaffolding), `refreshTokens`, `rateLimits` collections. Exports `JwtAuthGuard`, `@Public()`, `@CurrentUser()` consumed by every admin feature domain. Depends ONLY on infrastructure (no feature domain).

### 4.1 REST Endpoints

| Method | Path | Auth | Key response |
|---|---|---|---|
| POST | `/api/v1/auth/login` | `@Public()` | 200 `{success:true,data:{accessToken,user:{id,username,role},expiresIn}}` + Set-Cookie `refresh_token` (Path=/api/v1/auth); 400 `VALIDATION_ERROR` (incl. body>10KB); 401 `INVALID_CREDENTIALS` (byte-identical for wrong-pw/unknown-user); 429 `RATE_LIMITED`+Retry-After |
| POST | `/api/v1/auth/refresh` | `@Public()` cookie-only | 200 `{success:true,data:{accessToken,expiresIn}}` + rotated cookie; 401 `TOKEN_REVOKED`/`TOKEN_EXPIRED`/`INVALID_TOKEN`; 403 `ORIGIN_FORBIDDEN`; 429 `RATE_LIMITED` |
| POST | `/api/v1/auth/logout` | `@Public()` (no JwtAuthGuard, no Origin check) | ALWAYS 200 `{success:true}` + Set-Cookie clear (Max-Age=0); idempotent (even no cookie / unknown hash) |
| GET | `/api/v1/auth/me` | `JwtAuthGuard` Bearer | 200 `{success:true,data:{id,username,role}}` from FRESH `findById(JWT.sub)` (does NOT trust payload); 401 `UNAUTHORIZED` (missing/wrong scheme) or `INVALID_TOKEN` (+`WWW-Authenticate`) |

> **Frontend contract reconciliation:** login + refresh responses include `expiresIn` (seconds, ~900) so the api-client can schedule proactive refresh. The `user` object on login matches the frontend `UserDto`.

### 4.2 Mongo Schema

**`refreshTokens`**

| field | type | required | index | notes |
|---|---|---|---|---|
| `_id` | ObjectId | yes | — | — |
| `tokenHash` | string (sha256 hex, 64) | yes | UNIQUE | of raw 64-byte base64url cookie value |
| `familyId` | string (UUID v4) — per-login chain | yes | yes | for O(1) whole-family revoke via `updateMany` |
| `userId` | ObjectId ref `users._id` | yes | yes | — |
| `consumed` | boolean | yes | — | default false |
| `rotatedFrom` | ObjectId? | yes | — | predecessor `_id` for forensic chain-walk |
| `revokedReason` | `'logout'\|'replay_detected'\|'family_expired'\|'partial_write'`? | yes | — | null until revoked |
| `expiresAt` | Date (issued + 7d, sliding) | yes | TTL `expireAfterSeconds:604800` | auto-purge 7d AFTER expiry (queryable in grace window) |
| `familyExpiresAt` | Date (issued + 30d, ABSOLUTE cap) | yes | — | inherited across rotations |
| `consumedAt` / `revokedAt` | Date? | yes | — | — |
| `createdAt` | Date | yes | — | — |

**`rateLimits`**

| field | type | required | index | notes |
|---|---|---|---|---|
| `_id` | ObjectId | yes | — | — |
| `key` | string (`login_req:<ip>`, `login_fail_ip:<ip>`, `login_fail_user:<username>`, `refresh_req:<ip>`) | yes | yes | bucket+identifier |
| `count` | int | yes | — | — |
| `expiresAt` | Date (window end) | yes | TTL `expireAfterSeconds:0` | — |
| `updatedAt` | Date | yes | — | — |

### 4.3 Key DTOs

- `LoginDto` `{identifier:1..255, password:1..256}` (whitelist+forbidNonWhitelisted)
- `UserPublicDto` `{id, username, role:'admin'}` (NEVER `passwordHash`)
- `LoginResponseDto` `{accessToken, user:UserPublicDto, expiresIn}`
- `RefreshResponseDto` `{accessToken, expiresIn}`
- Exported access-control primitives: `@Public()`, `JwtAuthGuard` (verifier `algorithms:['HS256']`, `clockTolerance<=30s`), `@CurrentUser()`.

### 4.4 Acceptance Criteria

- [ ] **AC-ENV** every auth response across all endpoints/status codes parses as the uniform envelope.
- [ ] **AC-COOKIE** refresh cookie attributes uniform across login/refresh/logout: `HttpOnly; SameSite=Strict(prod)/Lax(dev); Secure(prod); Path=/api/v1/auth; NO Domain`.
- [ ] **AC-RT** cookie `Path=/api/v1/auth` → browser does NOT send it on `/content`, `/posts`, `/works`, `/upload`, `/github-sync` (round-trip test).
- [ ] **AC-3** login body >10KB → 400 `VALIDATION_ERROR` (NOT 413; BodySizeGuard before ValidationPipe; body-parser limit ≥1MB); bcrypt NOT invoked; users.findOne NOT invoked.
- [ ] **AC-4a/b/c/d** request-rate 5/15s/IP; IP failure-lockout 10/15min→15min; username failure-lockout 5/15min/username→15min (not bypassable by IP rotation); correct login resets both counters.
- [ ] **AC-1** replay of consumed cookie → 401 `TOKEN_REVOKED` + whole-family revoke (`updateMany {familyId,consumed:false}`); other families untouched.
- [ ] **AC-8** two concurrent `/refresh` with same cookie → exactly ONE 200 winner + ONE 401 `TOKEN_REVOKED` (no both-win/both-lose).
- [ ] **AC-12** logout ALWAYS 200 even with no cookie / expired/missing access; idempotent.
- [ ] **AC-13a/b** `/refresh` Origin absent OR mismatch → 403 `ORIGIN_FORBIDDEN` + cookie clear, NO rotation, NO revocation.
- [ ] **AC-14PW** partial-write: old consume succeeds, new insert fails → old stays consumed (NOT resurrected); in-flight returns 500; client's next `/refresh` → 401 `TOKEN_REVOKED` + family revoke; recovery = explicit `/login`.
- [ ] **AC-15/SEED** concurrent seeders → exactly ONE admin; E11000 swallowed; restart with same env → passwordHash byte-identical.
- [ ] **AC-16** `alg:'none'` / tampered token → 401 `INVALID_TOKEN` + `WWW-Authenticate: Bearer error="invalid_token"`; handler body NOT executed.
- [ ] **AC-ME-deleted** valid signed JWT whose user was deleted → 401 `INVALID_TOKEN` (never 404, never 200).
- [ ] **AC-JWT-config** verifier constructed with explicit `algorithms:['HS256']`; `exp - iat <= 900`.
- [ ] **AC-OBS** six structured log event classes emitted (`AUTH_LOGIN_SUCCESS`, `AUTH_LOGIN_FAILURE`, `AUTH_TOKEN_REVOKED`, `AUTH_RATE_LIMITED`, `AUTH_ORIGIN_FORBIDDEN`, `AUTH_INVALID_TOKEN`) with `{event,userId|null,ip,userAgent<=256,timestamp,tokenHash|familyId}`; CI grep asserts NO raw refresh token / NO accessToken in any log line.
- [ ] **AC-NOSET-on-fail** login non-200 sends NO `Set-Cookie`.
- [ ] **AC-BOOT** production bootstrap THROWS (HTTP server never listens) when `ADMIN_BOOTSTRAP_PASSWORD` missing/placeholder (`{'admin123','changeme','password','replace-me','dev-secret-change-in-production-min-32-chars',''}`), OR `JWT_ACCESS_SECRET` <32 bytes/placeholder, OR `ALLOWED_ORIGINS` empty.

### 4.5 Key Test Cases

- TC-LOGIN-HAPPY, TC-LOGIN-UNKNOWN-IDENTIFIER-ENUMERATION (byte-identical body + dummy-hash compare), TC-LOGIN-USERNAME-LOCKOUT (EC-17), TC-LOGIN-CORRECT-RESETS-COUNTERS.
- TC-REFRESH-HAPPY-ROTATION, TC-REFRESH-REPLAY-REVOKES-FAMILY (EC-1), TC-REFRESH-CONCURRENT-ONE-WINNER (EC-8), TC-REFRESH-ORIGIN-MISSING/MISMATCH (EC-13).
- TC-LOGOUT-NO-ACCESS / IDEMPOTENT (EC-12).
- TC-ME-ALG-NONE (EC-16), TC-ME-DELETED-USER.
- TC-14PW-PARTIAL-WRITE (Gap 4 / EC-14).
- TC-SEED-RACE (EC-15), TC-SEED-IDEMPOTENT, TC-BOOT-FAIL-CLOSED (NFR-4).

### 4.6 Security Notes

- Access token only in JS memory (frontend enforces); refresh only as `sha256` hash in Mongo (DB dump yields no usable tokens).
- Atomic `findOneAndUpdate({tokenHash,consumed:false})` for replay/concurrency defense; bounded blast radius via 30d absolute family cap.
- JWT `algorithms:['HS256']` pin forbids `alg:'none'`; `clockTolerance<=30s`.
- Enumeration resistance: wrong-password and unknown-identifier return byte-identical 401; unknown-identifier runs `bcrypt.compare(password, DUMMY_HASH)` precomputed once.
- Hard cutover: legacy `admin-session` HMAC cookie NOT migrated/honored (different name `refresh_token`, different path, different mechanism); one re-login after frontend switches.
- No secrets in logs; six CI-enforced event classes.
- Password reset OUT OF SCOPE (single seeded admin); escape hatch = `backend/scripts/reset-admin.ts` CLI.

---

## 5. Domain: Content (singleton)

**Purpose:** Site-wide content singleton (one doc, fixed `_id:'content'`): `siteName`, `hero`, `about`, `services`, `education`, `experience`, `skills`, `sections`, `footer`, `socialLinks`, plus version + audit. Public read never 404s; every mutation JWT-guarded, optimistic-locked via `If-Match`, audit-logged, cache-invalidated. Legacy `data/content.json` + `data/about.json` + `data/config.json` migrated COPY-not-MOVE. Reference implementation for the uniform envelope that Posts/Works adopt.

### 5.1 REST Endpoints

| Method | Path | Auth | Key response |
|---|---|---|---|
| GET | `/api/v1/content` | none | 200 `{success:true,data:ContentDoc}` + headers `Cache-Control:public,max-age=30`, `ETag:'"<version>"'`, `X-Content-Source:'live'\|'stale'\|'default'`. Never 404/500 at runtime. Mongo down+cache → 200 stale; Mongo down+no cache → 503 `UNAVAILABLE`. |
| PATCH | `/api/v1/content` | Bearer | 200 `{success:true,data:ContentDoc}` (`version+1`, `seededAsDefault=false`). Requires `If-Match:<int>`. Recursive deep-merge on nested objects; top-level arrays + `socialLinks` wholesale-replaced (incl. `[]`). Unknown key at ANY depth → 400 `VALIDATION_ERROR`. `percentage` int [0,100]; XSS rejected; body ≤1MB → 413. |
| POST | `/api/v1/content/migrate` | Bearer | 200 `{success:true,data:{action:'skipped'\|'seeded'\|'merged', doc, diffReport}}`. COPY-not-MOVE (only READs `data/*.json`). `?force=true` fills ONLY gaps. |
| POST | `/api/v1/content/:array/items` | Bearer + If-Match | append one item (server-gen id); `:array∈{services,education,experience,skills}` else 404. Atomic transaction. |
| PATCH | `/api/v1/content/:array/items/:id` | Bearer + If-Match | partial item deep-merge; unknown id → 404 (NO upsert). |
| DELETE | `/api/v1/content/:array/items/:id` | Bearer + If-Match | IDEMPOTENT: 200 returns current doc; version bumped only if a removal occurred; audit row always written. Stale If-Match still → 409. |
| PUT | `/api/v1/content/:array/order` | Bearer + If-Match | `{ids:string[]}` must be a FULL permutation; else 400 `VALIDATION_ERROR`. |

### 5.2 Mongo Schema — `contents` (singleton, fixed `_id:'content'`)

| field | type | required | notes |
|---|---|---|---|
| `_id` | string literal `'content'` | yes | `CONTENT_ID` constant; no user `_id` accepted |
| `version` | int ≥0 | yes | EXPLICIT optimistic-lock (NOT Mongoose `__v`); +1 per mutation |
| `seededAsDefault` | boolean | yes | true ONLY for boot fallback; false after any real mutation/migration |
| `siteName` | string? | no | — |
| `hero` | `{warm?:{greeting?,title?,tagline?}, tech?:{greeting?,title?,tagline?}}` | yes | all sub-fields optional (live warm/3-field & tech/2-field both validate) |
| `about` | `{greeting:string, title:string, description:string[]}` | yes | newlines preserved byte-identical |
| `services` | `[{id,icon,title,description}]` | yes | id = `crypto.randomUUID()`, immutable |
| `education` | `[{id,title,period,description}]` | yes | — |
| `experience` | `[{id,title,period,description}]` | yes | description may contain `\n` |
| `skills` | `[{id,name,percentage:int 0..100}]` | yes | — |
| `sections` | `{works?:{warm?,tech?,warmSubtitle?,title?}, about?:{...}, contact?:{...}}` | yes | all optional sub-fields |
| `footer` | `{warm:string, tech:string}` | yes | — |
| `socialLinks` | `Record<string,string>` (open map) | yes | max 50 keys, non-empty keys/values, NO URL validation; wholesale-replace on PATCH |
| `updatedAt` | Date | yes | indexed |
| `updatedBy` | `{userId,userEmail}`? | yes | null for boot default-seed |

**`contentAudits`** — `{op,userId,userEmail,timestamp(TTL 90d),requestId,fieldsChanged[],arrayName?,itemId?,before,after}`. `before`/`after` are SPARSE changed-subset keyed by `fieldsChanged` (NOT full snapshot).

### 5.3 Key DTOs

`ContentDocDto`, `PatchContentDto` (`.strict()` at every depth), per-array `CreateItemDto`/`UpdateItemDto` (`.strict()`), `ReorderDto {ids:string[]}`, `MigrateResponseDto`.

### 5.4 Acceptance Criteria

- [ ] AC1 GET never 404/500 at runtime; headers present; `X-Content-Source` per source.
- [ ] AC2 singleton exists BEFORE public route accepts traffic; fresh deploy with `data/*.json` absent → hardcoded default doc (`seededAsDefault:true`, header `default`).
- [ ] AC3 every mutation requires valid Bearer whose subject exists in `users`; else 401, NO write, NO audit row.
- [ ] AC4 every mutation EXCEPT `/migrate` requires `If-Match:<int>`; missing → 400 `VERSION_REQUIRED`; stale → 409 `CONFLICT`.
- [ ] AC5 PATCH deep-merge preserves siblings; arrays + socialLinks wholesale-replaced.
- [ ] **AC6 strict nested validation:** unknown keys rejected at EVERY depth (`hero.warm`, `sections.works`, services/skills items, `about`) → 400 `VALIDATION_ERROR`. `.strict()` everywhere; no `.passthrough()`.
- [ ] AC7 `percentage` integer [0,100]; floats/NaN/strings → 400.
- [ ] AC8 `<script>`/unescaped HTML in any string → 400.
- [ ] AC9 socialLinks >50 keys / empty key / empty value → 400; non-URL values ACCEPTED.
- [ ] AC10 body >1MB (UTF-8 bytes) → 413.
- [ ] AC12 PATCH item unknown id → 404 (NO upsert); DELETE item idempotent.
- [ ] AC13 reorder ids[] wrong length/unknown/missing/duplicate → 400.
- [ ] AC14 item-level ops atomic in a single Mongo transaction (rollback on validation failure).
- [ ] AC15 every successful mutation returns IDENTICAL `{success:true,data:ContentDoc}`.
- [ ] AC16 every mutation attempt reaching validation writes EXACTLY ONE `contentAudits` doc (changed-subset before/after); 401/429/VERSION_REQUIRED/CONFLICT do NOT.
- [ ] AC17 `contentAudits.timestamp` TTL index `expireAfterSeconds:7776000` (90d).
- [ ] AC19 three cache layers: L1 in-process 10s; L2 Redis `content:public:cache`; L3 nginx proxy_cache 30s purge-on-PATCH.
- [ ] AC20 throttle Redis-backed: 60/min/userId AND 30/min/IP → 429 `RATE_LIMITED`.
- [ ] AC21 migration precedence: `content.json` authoritative; `about.json`/`config.json` fill GAPS ONLY (gap = ABSENT OR `''` OR `[]`); `?force=true` fills additional gaps but NEVER overwrites non-empty `content.json` values.
- [ ] AC22 migration server-generates id for every id-less services/education/experience/skills entry.
- [ ] AC23 migration COPY-not-MOVE (`data/*.json` byte-identical before/after; verified by sha256).
- [ ] AC24 migration idempotent (second run no `?force` → `action:'skipped'`).
- [ ] AC26 duplicate-doc guard: stray `_id != 'content'` never served; warn logged.
- [ ] AC28 `data.version` is an EXPLICIT integer (NOT Mongoose `__v`).

### 5.5 Key Test Cases

- GET public returns full doc never 404; GET serves stale on Mongo outage; GET 503 when Mongo down + no cache; GET default-seed at boot.
- Mutation rejects missing/revoked Bearer; If-Match missing → VERSION_REQUIRED; stale → CONFLICT.
- PATCH deep-merge preserves siblings; top-level array wholesale-replace incl clear.
- GAP-A unknown key at every depth rejected (5 cases).
- percentage range; XSS rejected; socialLinks capacity/emptiness; body 413; unknown `:array` → 404.
- POST item appends + generates id; PATCH item unknown id → 404 no upsert; DELETE item idempotent; reorder valid/invalid.
- Atomic rollback on item op; audit changed-subset sparse; migration skipped/merged/services-id-backfill/copy-not-move/UTF-8-newline-round-trip.

### 5.6 Security Notes

- Bearer-only API; no CSRF (pure bearer).
- Optimistic concurrency on every mutation; `data.version` explicit integer.
- Singleton `_id` fixed string constant; no user `_id` accepted (`.strict()`).
- Strict validation at every depth; server-side XSS rejection; input limits.
- Redis-backed throttle (in-memory Map FORBIDDEN).
- Audit trail (changed-subset, never secrets); TTL 90d.
- Stale-on-outage tagged (`X-Content-Source`), never silent.
- Migration COPY-not-MOVE and operator-gated; manual file cleanup gated on backend-live-24h + grep-clean + sign-off.

---

## 6. Domain: Posts

**Purpose:** Posts collection CRUD + public read (list+detail) + GitHub sync coexistence (sync itself owned by the GitHub domain, §9, which calls `PostsSyncService` in-process) + durable-delete tombstone. Public read anonymous; admin writes require admin JWT.

> **Reconciliation:** the Round-2 posts draft exposed its own `POST /api/v1/posts/sync`. That endpoint is **REMOVED**. The single manual sync endpoint is `/api/v1/github/sync` (owned by the GitHub domain), matching the locked decision. `PostsSyncService.syncAll()` is an internal service the GitHub domain calls.

### 6.1 REST Endpoints

| Method | Path | Auth | Key response |
|---|---|---|---|
| GET | `/api/v1/posts` | none (handler MUST NOT read Authorization) | 200 `{success:true,data:{items:PostListItem[],total,page,limit}}`; query `page,limit(max 50,clamp),category(exact),featured('true'\|'false'),q(title+excerpt only, regex-escaped),sort('-date'\|'date')`. Unknown params silently ignored. Status set 200/422/500 ONLY (no orphan 400). Header `Cache-Control:public,s-maxage=60,stale-while-revalidate=120`. |
| GET | `/api/v1/posts/:id` | none | 200 `{success:true,data:PostResponseDto}` (full markdown); 404 `NOT_FOUND`; strong ETag; `If-None-Match` → 304. `Cache-Control:public,s-maxage=300`. |
| POST | `/api/v1/posts` | Bearer + AdminRoleGuard | 201 `{success:true,data:PostResponseDto}` (server assigns id=`slugify(title)`; `source='manual'`; `githubPath=null`). FORBIDDEN client keys `{source,githubPath,id,manualOverride,lockedFields,published,createdAt,updatedAt}` → 422 `VALIDATION_ERROR`. Slug collision → `-2,-3,...`; exhausted → 409 `CONFLICT`. |
| PUT/PATCH | `/api/v1/posts/:id` | Bearer + AdminRoleGuard | aliases, identical partial-merge ($set of provided keys only; omitted NEVER cleared). FORBIDDEN keys → 422. Editing a `source='github'` post is handled per the **unified sync-preservation model** (§11.1): admin-edited fields are added to `lockedFields`; `source` STAYS `'github'` (no promotion); sync subsequently skips locked fields. |
| DELETE | `/api/v1/posts/:id` | Bearer + AdminRoleGuard | 200 `{success:true,data:{id}}` hard-delete. If `source='github'` AND `githubPath` non-null → tombstone written to `githubsettings.suppressedGithubPaths` (§11.2) so sync won't recreate. 404 if missing (STRICT). |
| GET | `/api/v1/posts/blocklist` | Bearer + AdminRoleGuard | 200 `{success:true,data:{items:[{githubPath,originalId,deletedAt}]}}` sorted by `deletedAt` desc. (Reads from the unified `githubsettings.suppressedGithubPaths` + an audit trail collection — see §11.2.) |
| DELETE | `/api/v1/posts/blocklist/:githubPath` | Bearer + AdminRoleGuard | 200 `{success:true,data:{githubPath}}` (URL-encoded path); idempotent; 404 if absent. Removing allows next sync to recreate. |

### 6.2 Mongo Schema — `posts`

| field | type | required | index | notes |
|---|---|---|---|---|
| `_id` | ObjectId | yes | — | internal PK, NEVER in public response |
| `id` | string | yes | UNIQUE | manual=`slugify(title)` (lowercase, unicode Letter chars KEPT); github=filename-minus-`.md` verbatim |
| `title` | string (trimmed, 1..200) | yes | — | github missing title → filename stem (NEVER `''`) |
| `excerpt` | string (≤1000) | yes | — | default `''` |
| `content` | string (raw markdown, image URLs preserved verbatim, ≤512000) | yes | — | default `''` |
| `category` | string (1..50) | yes | yes | default `'未分类'`; free-form |
| `date` | string `YYYY-MM-DD` | yes | yes | default today UTC |
| `readTime` | string | yes | — | provided → stored verbatim; omitted → CJK-aware `max(1,ceil(cjk/400 + latin/200))+'分钟'` (§11.4) |
| `cover` | string (http(s) or `''`) | yes | — | sync-owned raw cover (jsdelivr) |
| `tags` | string[] | yes | — | default `[]`; parsed from frontmatter `tags` (NEW, additive) |
| `source` | `'github'\|'manual'` | yes | yes | IMMUTABLE after creation (whitelist-stripped) |
| `githubPath` | string? | no | yes | present only when `source='github'`; upsert match key; IMMUTABLE |
| `featured` | boolean | yes | yes | admin-owned; default false |
| `manualOverride` | boolean | yes | — | true when a github post has been admin-edited (any edit sets this; sync still updates non-locked fields) |
| `lockedFields` | string[] | yes | — | field names admin pinned; READ by sync, WRITTEN by Posts admin PATCH (dedup); sync `$set` EXCLUDES these (§11.1) |
| `published` | boolean | yes | — | default `true` on `$setOnInsert`; sync only ever sets `false` via stale-unpublish; admin cannot toggle in v1 (deferred) |
| `syncedAt` | Date? | no | — | bumped ONLY on actual field change |
| `missingFromLastSync` / `staleSyncCount` / `staleSince` | boolean / int / Date? | no | — | stale-tracking (github-domain writes; §11.3) |
| `createdAt` / `updatedAt` | Date | yes | yes / — | `$setOnInsert` for createdAt; `$currentDate` for updatedAt |

### 6.3 Key DTOs

`CreatePostDto`, `UpdatePostDto` (partial, FORBIDDEN keys → 422), `PostsListQueryDto`, `PostListItemDto` (explicit allow-list mapper — excludes `content,_id,__v,githubPath,manualOverride,lockedFields,published,createdAt,updatedAt`), `PostResponseDto` (adds `content`).

### 6.4 Acceptance Criteria

- [ ] AC-1/AC-4 GET list never reads Authorization; never 401/403; status set exactly 200/422/500 (no orphan 400).
- [ ] AC-2 list items contain ONLY `{id,title,excerpt,category,date,readTime,cover,source,featured}`; leakage of `content/_id/__v/githubPath/manualOverride/lockedFields/published/createdAt/updatedAt` FAILS.
- [ ] AC-3 list header `Cache-Control: public, s-maxage=60, stale-while-revalidate=120`.
- [ ] AC-6 `q` is regex-escaped, scoped to title+excerpt ONLY (never content); NoSQL injection prevented.
- [ ] AC-9 detail sets strong ETag (`sha256(content+'|'+updatedAt).slice(0,32)`) + `Cache-Control: public, s-maxage=300`; `If-None-Match` → 304.
- [ ] AC-11 forbidden client keys (incl. set to null) → 422 `VALIDATION_ERROR` with `details` naming the key.
- [ ] AC-23 PUT/PATCH aliases, partial-merge; omitted keys NEVER cleared.
- [ ] AC-24 editing a `source='github'` post adds edited fields to `lockedFields` (unified model §11.1); `source` STAYS `'github'`; `manualOverride=true`; `githubPath` retained.
- [ ] AC-27 DELETE `source='github'` + non-null `githubPath` → tombstone in `githubsettings.suppressedGithubPaths`; sync does not recreate.
- [ ] AC-29/30 blocklist GET/DELETE (admin, URL-encoded).
- [ ] AC-31 readTime hybrid (provided verbatim; omitted CJK-aware).
- [ ] AC-32 slugify keeps unicode Letter chars; collision `-2/-3`; ASCII-normalization REJECTED.
- [ ] AC-33 github-import id = filename-minus-`.md` verbatim (unicode preserved).
- [ ] AC-34 every error matches the uniform envelope; codes from the enum.
- [ ] AC-35 `q` regex-escaped (no raw `$`-operators).
- [ ] AC-36 PAT plaintext/decrypted secrets NEVER logged.

### 6.5 Key Test Cases

- public_list_no_auth_returns_200; public_list_limit_clamp_and_validation; public_list_pagination_beyond_range (`page=99999` → 200 `items:[]`, real total); public_list_search_scoped_to_title_excerpt_only; public_list_no_generic_400.
- public_detail_returns_full_markdown_and_etag; public_detail_404_on_miss.
- create_requires_admin_jwt; create_rejects_forbidden_keys; create_slug_collision_appends_suffix; create_slugify_keeps_unicode_letters.
- update_is_partial_merge_alias; update_promotes*→ per §11.1 (adds to lockedFields, source stays github); update_forbidden_key_returns_422; update_404_on_missing_id.
- delete_github_post_writes_blocklist_and_blocks_recreate; delete_manual_post_no_blocklist_write.
- blocklist_crud.
- readtime_auto_computed_cjk_aware_when_omitted.
- nosql_injection_via_q_sanitized.

### 6.6 Security Notes

- Public response mappers are EXPLICIT allow-list serializers; whole-doc `.toObject()` forbidden; list omits `content` (anti-scraper + small payload).
- FORBIDDEN client keys rejected with 422 (no privilege/ownership tampering).
- Sync `$set` allow-list + `lockedFields` exclusion + upsert filter `{source:'github',githubPath}` (never matches manual) — see §11.1.
- NoSQL injection prevented via regex-escaped `q` + parameterized Mongoose queries.
- Delete tombstone prevents silent resurrection; blocklist removal reversible via admin endpoint.
- ETag derived from content hash (not `_id`/version alone) to avoid existence/timing leak.

---

## 7. Domain: Works

**Purpose:** Works collection CRUD + public read + GitHub sync coexistence + suppression-list (tombstone) management + `WorksSyncService.upsertFromGithub` contract. Owns `works` collection + `suppressedGithubPaths` field on the shared `githubsettings` singleton. Does NOT own JWT/OSS/GitHub-fetch.

### 7.1 REST Endpoints

| Method | Path | Auth | Key response |
|---|---|---|---|
| GET | `/api/v1/works` | PUBLIC (OptionalJwtAuthGuard; malformed Bearer silently anonymous) | 200 `{success:true,data:WorkSummary[]}` (omits `content` for payload/perf); sorted featured DESC then updatedAt DESC. `?category` exact; `?include=internal` honored ONLY with valid admin. NEVER 401. |
| GET | `/api/v1/works/categories` | PUBLIC | 200 `{success:true,data:string[]}` distinct categories LIVE (`db.distinct`), no cache. |
| GET | `/api/v1/works/suppressions` | Bearer | 200 `{success:true,data:string[]}` (`githubsettings.suppressedGithubPaths`). **Route declared BEFORE `@Get(':id')`.** |
| GET | `/api/v1/works/:id` | PUBLIC | 200 `{success:true,data:Work}` (full markdown); 404 `NOT_FOUND`; `?include=internal` admin-gated. |
| POST | `/api/v1/works` | Bearer | 201 `{success:true,data:Work}` (id=`nanoid(12)`; `source='manual'`; `coverOverride=null`). FORBIDDEN keys silently stripped. `featured=true` + cap → 409 `FEATURED_CAP_REACHED`. `content>262144` → 413. |
| PATCH | `/api/v1/works/:id` | Bearer | 200 `{success:true,data:Work}`. Single atomic `findOneAndUpdate({id},{$set,$currentDate})`. `coverOverride:null` clears; `tech` replaces whole array. |
| PATCH | `/api/v1/works/:id/featured` | Bearer | `{featured:boolean}`; `false` ALWAYS 200; `true` + cap → 409; `true` on already-featured → no-op 200. |
| DELETE | `/api/v1/works/:id` | Bearer | 200 `{success:true,data:{id}}`; 404 if missing (STRICT). `source='github'` + `githubPath` → `$addToSet` tombstone on `githubsettings`. |
| DELETE | `/api/v1/works/suppressions` | Bearer | `{githubPath:string}`; idempotent `$pull`; 200. **Route declared BEFORE `@Delete(':id')`.** |

> **Reconciliation:** the Round-2 works draft also proposed `/works/suppressed`. The canonical name is **`/works/suppressions`** (plural noun), with literal-before-param controller ordering. Tombstones live on the shared `githubsettings.suppressedGithubPaths` (works writes via `$addToSet`/`$pull`; posts writes there too per §11.2 — unified).

### 7.2 Mongo Schema — `works`

| field | type | required | index | notes |
|---|---|---|---|---|
| `_id` | ObjectId | yes | — | internal PK |
| `id` | string | yes | UNIQUE | manual=`nanoid(12)` (retry ≤3 on E11000); github=filename-minus-`.md` (existing Chinese-filename ids preserved verbatim on migration) |
| `title` | string (1..200 trimmed) | yes | — | — |
| `description` | string (≤1000) | no | — | default `''` |
| `category` | string (1..32) | no | yes | default `'未分类'`; free-form |
| `cover` | string (http(s) or `''`) | no | — | sync-owned raw cover (jsdelivr) |
| `coverOverride` | string? (http(s) URL or null) | no | — | admin-owned additive override; sync NEVER writes; resolved public cover = `coverOverride ?? cover` |
| `tech` | string[] (each 1..64, max 50) | no | — | default `[]` |
| `demo` | string (http(s) or `''`) | no | — | default `''` |
| `repo` | string (http(s) or `''`) | no | — | default `''` |
| `featured` | boolean | no | yes | admin-owned; default false; capped by `MAX_FEATURED_WORKS` on false→true |
| `content` | string (markdown, ≤262144) | no | — | sync-owned; default `''` |
| `source` | `'github'\|'manual'` | yes | yes | IMMUTABLE after creation |
| `githubPath` | string? | no | PARTIAL-UNIQUE (`partialFilterExpression:{source:'github',githubPath:{$type:'string'}}`) | IMMUTABLE |
| `lockedFields` | string[] | yes | — | READ by sync, WRITTEN by Works admin PATCH (§11.1) |
| `published` | boolean | yes | — | default `true`; sync only sets false via stale-unpublish |
| `syncedAt` / `missingFromLastSync` / `staleSyncCount` / `staleSince` | — | no | — | sync-owned stale tracking |
| `createdAt` / `updatedAt` | Date | yes | yes / yes | createdAt `$setOnInsert` only; updatedAt `$currentDate` |

**`githubsettings`** (SHARED singleton, `_id:'singleton'`) — Works owns `suppressedGithubPaths`; GitHub domain owns `githubTokenEncrypted`/`githubRepo`; Content/Posts/Works all reference it. Works MUST NOT read/write `githubToken`/`githubRepo`.

| field | type | owner | notes |
|---|---|---|---|
| `_id` | string `'singleton'` | shared | deterministic cross-domain upsert |
| `suppressedGithubPaths` | string[] | Works (unified for posts+works tombstones, §11.2) | githubPaths whose docs were admin-deleted |
| `githubTokenEncrypted` | string (AES-256-GCM ciphertext) | GitHub | `'<ivHex>:<authTagHex>:<ciphertextHex>'`; `''` = no token |
| `githubRepo` | string (`owner/repo`) | GitHub | — |
| `autoUnpublishAfterStaleCount` | int | GitHub | default 3; 0 disables |
| `createdAt` / `updatedAt` | Date | shared | — |

### 7.3 Key DTOs

`CreateWorkDto`, `UpdateWorkDto` (partial), `ToggleFeaturedDto {featured:boolean}`, `DeleteSuppressionDto {githubPath}`, `WorkSyncInput` (internal arg to `WorksSyncService.upsertFromGithub`), `WorkSummary`, `Work`, `WorkInternal` (admin `?include=internal`).

### 7.4 Acceptance Criteria

- [ ] AC1 data model EXACTLY as listed (no stale `image?/tags?`).
- [ ] AC2 envelope uniformity; legacy `{success,work}` ELIMINATED.
- [ ] AC3 list omits `content` + internal fields.
- [ ] AC4 resolved cover (`coverOverride ?? cover`) in public projection; internal projection returns raw + override separately.
- [ ] AC5 sort featured DESC then updatedAt DESC.
- [ ] AC6 category exact (unknown → `[]` 200, never 400/404).
- [ ] AC7 categories LIVE distinct (no cache).
- [ ] AC8 detail 404 unambiguous (UNIQUE id index).
- [ ] AC9 immutability (id/source/githubPath/createdAt/updatedAt whitelist-stripped; source stays at creation).
- [ ] AC10 empty-optional round-trip (`''` stays `''`, `[]` stays `[]`).
- [ ] AC11 `coverOverride:null` clears; `cover:''` does NOT clear override.
- [ ] AC12 URL scheme allow-list (reject `javascript:`/`data:`/`file:`/`vbscript:`).
- [ ] AC14 PATCH single atomic `findOneAndUpdate`; concurrent PATCHes on different fields both survive.
- [ ] AC16 featured toggle cap/no-op/always-un-feature.
- [ ] AC17 `MAX_FEATURED_WORKS` env override.
- [ ] AC18/19 delete tombstone; sync respects tombstone (skipped, no write).
- [ ] AC20 sync UPDATE preserves admin-owned `{featured,tech,demo,repo,coverOverride}` (only `{title,description,category,cover,content}` `$set`); INSERT seeds all from frontmatter.
- [ ] AC21 sync never matches manual (`{source:'github',githubPath}` filter).
- [ ] AC22 id uniqueness + `-g<6>` disambiguation for github-vs-manual id collision (logged WARN); idempotent re-sync updates in place.
- [ ] AC23 sync E11000 → upsert (no crash).
- [ ] AC25 internal projection auth-gated (NOT flag-gated); anonymous+flag = public projection, never error.
- [ ] AC26 public GET never 401.
- [ ] AC29 route precedence (`/works/suppressions` matched as literal, never as `:id`).
- [ ] AC30 ZERO `fs` imports; no `data/works.json` read/write.
- [ ] AC33 single migration creates UNIQUE `id`, PARTIAL-UNIQUE `githubPath`, COMPOUND `{featured:-1,updatedAt:-1}`, SINGLE `category`+`source`.

### 7.5 Key Test Cases

- TC1 public list omits content; TC2 category exact + empty bucket; TC3 categories live distinct; TC4 detail 404 + internal projection.
- TC5 create happy + immutability strip; TC6 oversize → 413; TC7 XSS URL rejected; TC8 featured cap → 409; TC9 unauthenticated → 401 preempts validation.
- TC10 PATCH partial $set preserves untouched; TC11 coverOverride:null clears; TC12 immutable stripped; TC13 concurrent PATCH both survive.
- TC14 featured toggle cap/no-op/always-unfeature; TC15 delete github→tombstone, manual→none; TC16 missing id → strict 404; TC17/18 un-suppress idempotent + validation.
- TC19 sync preserves admin-owned on UPDATE; TC20 sync skips tombstoned; TC21 sync never matches manual on id collision (disambiguates `-g<6>`); TC22 E11000→upsert; TC23 batch partial success.
- TC24 public GET ignores malformed Bearer; TC25 route precedence.

### 7.6 Security Notes

- URL scheme allow-list (XSS via `<img src=cover>`/`<a href=demo>`).
- Immutable fields whitelist-stripped; `source` cannot flip (no github↔manual privilege escalation).
- Internal projection gated by valid JWT, NOT by `?include=internal` flag.
- Public GET never 401 (malformed Bearer silently anonymous).
- `coverOverride` admin-owned, structurally FORBIDDEN in sync `$set`.
- Delete tombstone prevents resurrection; only `DELETE /works/suppressions` removes entries.
- Atomic single-doc writes; UNIQUE + PARTIAL-UNIQUE indexes make dup states structurally impossible.
- Error hygiene: every error carries `requestId`; no stacks/raw Mongo errors in body.
- `githubsettings` shared: Works never touches `githubToken`/`githubRepo`.

---

## 8. Domain: Upload (Image → Alibaba OSS)

**Purpose:** `POST /api/v1/upload` multipart → sharp preprocessing (validate MIME, magic-number, strip EXIF, cap 4096px) → Alibaba OSS (ali-oss SDK, retried) → public-readable URL. Plus audit/query + migration CLI + legacy `/uploads/*` redirect catch-all.

### 8.1 REST Endpoints

| Method | Path | Auth | Key response |
|---|---|---|---|
| POST | `/api/v1/upload` | Bearer (JwtAuthGuard) | multipart field `file` (single; wrong name → 400 `NO_FILE`). 201 `{success:true,data:UploadResponseDto}`. Errors: 400 `NO_FILE`/`MIME_MISMATCH`/`INVALID_IMAGE`/`DECOMPRESSION_BOMB`/`RESULT_TOO_LARGE`/`BAD_REQUEST`; 401 `UNAUTHORIZED`; 413 `FILE_TOO_LARGE` (msg includes `5MB`); 415 `UNSUPPORTED_MEDIA_TYPE`; 429 `RATE_LIMITED`+Retry-After; 500 `INTERNAL_ERROR`; 502 `OSS_UNAVAILABLE`; 503 `OSS_NOT_CONFIGURED`. |
| GET | `/api/v1/uploads` | Bearer (admin) | 200 `{success:true,data:{items:UploadEventDto[],nextCursor}}`; query `limit(1..100,def20)`, `cursor`, `outcome('success'\|'failure')`. |

**Frontend contract:** on 401, api-client transparently refreshes + retries once; on non-2xx the editor inserts NO image tag.

### 8.2 Mongo Schema

**`uploads`** (metadata) — `key`(UNIQUE, indexed), `url`, `contentType`, `ext`, `size`, `width`, `height`, `originalFilename`, `originalMimeType`, `uploadedBy`(ref users, indexed), `createdAt`(indexed).

**`uploadEvents`** (audit, every attempt) — `requestId`(indexed), `userId`?, `outcome`('success'\|'failure', indexed), `errorCode`?, `httpStatus`, `originalFilename`?, `declaredMimeType`?, `finalSize`?, `ossKey`?(indexed), `durationMs`, `message`(PII-free), `createdAt`(indexed).

**`imageRedirects`** (legacy `/uploads/*` → OSS) — `localPath`(indexed), `ossUrl`, `ossKey`, `source`('migration'\|'upload'), `originalMtime`?, `migratedAt`.

### 8.3 Key DTOs / Ports

`UploadResponseDto {url,key,size,width,height,contentType}`, `UploadErrorCode` enum, `ErrorResponseDto`, `UploadEventDto`. Ports (maintainability): `ImageProcessorPort.process(buffer,declaredMime)`, `ObjectStoragePort.put(key,buffer,contentType)` (built-in 3x exp-backoff retry) + `.exists(key)` (migration idempotency + readiness).

### 8.4 Acceptance Criteria

- [ ] POST requires valid Bearer; else 401 + `uploadEvents` row (`userId=null`, `outcome=failure`), NO OSS object.
- [ ] Wrong multipart field name → 400 `NO_FILE`.
- [ ] Declared size >5MB → 413 `FILE_TOO_LARGE` (msg contains `5MB`); multipart stream aborted early.
- [ ] Declared MIME ∉ {jpeg,png,gif,webp} → 415 (`image/jpg` NOT accepted).
- [ ] Magic-number vs declared MIME mismatch → 400 `MIME_MISMATCH` (bytes NEVER reach OSS).
- [ ] sharp decode failure → 400 `INVALID_IMAGE` (NO raw-upload fallback).
- [ ] Decoded pixel count >50MP (`MAX_PIXELS=50_000_000`) → 400 `DECOMPRESSION_BOMB` before resize.
- [ ] sharp ALWAYS strips ALL metadata (EXIF/XMP/ICC); re-encode per declared MIME (jpeg mozjpeg q90, png lvl9, webp q90, gif).
- [ ] Resize `fit:'inside', withoutEnlargement:true`; neither output dim >4096px; post-sharp buffer >8MB → 400 `RESULT_TOO_LARGE`.
- [ ] Object key `uploads/<yyyy>/<mm>/<unixMsTs>-<uuid8hex>-<slug>.<ext>` (ext from sharp re-encode, NOT client name); slug sanitized `[a-zA-Z0-9._-]`, cap 40, default `image`; path-traversal safe.
- [ ] OSS PUT retried 3x (exp backoff) on 5xx/network; exhausted → 502 `OSS_UNAVAILABLE`; buffer discarded; no orphan partial object.
- [ ] Returned `url` = `${OSS_PUBLIC_BASE_URL}/${key}` (default `https://<bucket>.<region>.aliyuncs.com/<key>`).
- [ ] Missing mandatory OSS env at request → 503 `OSS_NOT_CONFIGURED`; NEVER writes local disk; boot validation also throws; readiness reports not-ready.
- [ ] Per-admin rate limit >30/min (JWT sub) → 429 `RATE_LIMITED`+Retry-After (Redis-backed).
- [ ] Every attempt writes one `uploadEvents` doc + one structured JSON log line (NO stacks in response, NO credentials).
- [ ] Migration CLI `npm run migrate:uploads` walks `frontend/public/uploads/*`, runs SAME pipeline, idempotent via `ObjectStoragePort.exists`, rewrites `/uploads/*` refs in posts/works/content to OSS url, writes `imageRedirects` + JSON artifact.
- [ ] Next.js catch-all `frontend/app/uploads/[...path]/route.ts` 302-redirects `/uploads/<name>` → `imageRedirects.ossUrl`; no mapping → 404 + logged warning (render never crashes).
- [ ] Full pipeline <3s for typical 1-2MB JPEG on ECS same region as OSS.

### 8.5 Key Test Cases

- happy_path_jpeg_201; no_auth_401; expired_token_refresh_retry_once; wrong_field_name_no_file_400; too_large_413; wrong_mime_415; magic_mismatch_400; corrupt_image_400; decompression_bomb_400; animated_gif_preserved_and_under_cap; webp_transparency_preserved; same_ms_collision_avoided; oss_5xx_retries_then_502; oss_env_missing_503; per_admin_rate_limit_429; path_traversal_filename_safe; client_abort_no_orphan; migration_idempotent; legacy_redirect_302_or_404.

### 8.6 Security Notes

- Defense order: no-file → size cap (413, abort early) → MIME allowlist → magic-number → sharp decode → pixel budget → re-encode metadata strip → post-encode 8MB cap → OSS PUT.
- Memory safety: multipart `fileSize=5MB` + total body ~6MB cap; only one buffer per request; discarded after PUT.
- OSS credentials ONLY in env; never logged/returned/written to `imageRedirects`/`uploadEvents`. NO local-disk fallback.
- Bearer-only; refresh via httpOnly sameSite=strict cookie (Auth domain). No CSRF.
- Cluster-safe Redis throttle (in-memory Map FORBIDDEN).
- Object keys fully server-derived (ts + `crypto.randomBytes` + sanitized slug); no client string concatenated raw.
- Bucket-level public-read POLICY (Architect decision — operator provisions); individual PUTs do NOT set per-object ACL. CSP `img-src` must include `OSS_PUBLIC_BASE_URL` host.
- GIF/WebP decompression-bomb mitigation (50MP pre-decode + 8MB post-encode).
- Client abort → buffer freed, NO OSS PUT (no orphans).

---

## 9. Domain: GitHub Sync

**Purpose:** Manual sync (`/api/v1/github/sync`, JwtAuthGuard) + webhook-triggered sync (`/api/v1/github/webhook`, HMAC-only) + GitHub settings (PAT AES-256-GCM encryption) + sync-run history. Writes into `posts`/`works` via idempotent upsert calling `PostsSyncService`/`WorksSyncService` in-process (NO HTTP self-fetch). Exposes NO public read endpoints. All env via `ConfigService` (NEVER `process.env` in a handler).

> **Reconciliation (locked):** the manual sync endpoint is `/api/v1/github/sync` ONLY. Posts' draft `/posts/sync` is removed. The webhook calls `PostsSyncService.syncAll()` + `WorksSyncService` directly in-process.

### 9.1 REST Endpoints

| Method | Path | Auth | Key response |
|---|---|---|---|
| POST | `/api/v1/github/sync` | Bearer (JwtAuthGuard) | NO body read for credentials (any body IGNORED). Credentials from DB `githubsettings` (decrypted) → env `GITHUB_TOKEN`/`GITHUB_REPO` → else 200 `{success:false,error:{code:'not_configured'}}`. Success: 200 `{success:true,data:SyncSummary}`. Sync-level failure: 200 `{success:false,error:{code:'github_auth_failed'\|'token_decrypt_failed'\|'not_configured'\|'bootstrap_error'},data:{runId,counts:0…,timestamp,durationMs,repo}}`. Concurrent: 409 `{success:false,error:{code:'sync_in_progress'},data:{activeRunId}}`. PAT NEVER in any field. |
| POST | `/api/v1/github/webhook` | HMAC-SHA256 (RAW body, `crypto.timingSafeEqual`) + exact `repository.full_name` match; NO JwtAuthGuard | Always 200 to GitHub on validated push (never 5xx). `{success:true,data:{action:'sync_triggered'\|'skipped'\|'ignored',reason?,runId?}}`. Missing `X-Hub-Signature-256` → 401 BEFORE parse; bad signature → 401; post-HMAC malformed JSON → 400 `invalid_payload`; wrong repo → 400 `wrong_repository`. Fire-and-forget (returns <2s). If `GITHUB_WEBHOOK_SECRET` unset → 401 `webhook_not_configured` for ALL. |
| GET | `/api/v1/github/settings` | Bearer | 200 `{success:true,data:SettingsView}` (`githubRepo,hasToken,tokenPrefix(first 8+'…'\|''),source:'db'\|'env'\|'none',autoUnpublishAfterStaleCount,tokenError?:'decrypt_failed'`). PAT NEVER present. |
| POST | `/api/v1/github/settings` | Bearer | `UpdateGithubSettingsDto` (PATCH-style): `githubRepo?`, `githubToken?` (non-empty→encrypt/rotate; `''`→clear; omitted→preserve). At least one field required (else 400). Returns `SettingsView` read-back. Missing encryption key → 500 `encryption_key_missing`. |
| GET | `/api/v1/github/sync/runs` | Bearer | 200 `{success:true,data:SyncRunSummary[]}` (newest first); query `limit(1..50,def20)`, `trigger('manual'\|'webhook')`. |
| GET | `/api/v1/github/sync/runs/:runId` | Bearer | 200 `{success:true,data:SyncRunDetail}` (+`files[]`); 404 `run_not_found`. |

### 9.2 Mongo Schema

**`githubsettings`** (singleton `_id:'singleton'`) — see §7.2 (shared). This domain owns `githubTokenEncrypted`, `githubRepo`, `autoUnpublishAfterStaleCount`.

**`syncruns`** — `runId`(uuid, indexed), `trigger`('manual'\|'webhook', indexed), `status`('running'\|'completed'\|'failed'), `repo`, `startedAt`, `endedAt`?, `durationMs`?, `counts:{added,updated,unchanged,failed,stale}`, `files:[{githubPath,category,outcome,reason?}]`, `error?`, `triggeredBy`?(manual), `deliveryId`?(webhook, indexed). **Capped at 50** (oldest auto-deleted on insert).

**`posts` / `works`** (CROSS-DOMAIN contract) — sync READS `lockedFields`/`published`/stale flags; WRITES github-owned + system fields via `updateOne upsert` (see §11.1).

### 9.3 Key DTOs

`UpdateGithubSettingsDto`, `SyncSummaryDto`, `SettingsViewDto`, `WebhookResponseDto`, `SyncRunDetailDto`, `ErrorEnvelopeDto`, `GithubFileOutcomeDto`.

### 9.4 Acceptance Criteria

- [ ] AC1 `/sync` resolves credentials ONLY from DB then env; body NEVER read for credentials; no/expired JWT → 401, zero GitHub calls.
- [ ] AC2 no credentials → 200 `{success:false,error:{code:'not_configured'}}` + counts 0 + `syncruns(status='failed')`.
- [ ] AC3 manual sync synchronous run-to-completion; full `SyncSummary` inline; no jobId/SSE.
- [ ] AC4/AC5 rename disambiguation: same-id-different-githubPath → UPDATE in place (`_id/createdAt/lockedFields/published` preserved); manual id collision → manual doc untouched, incoming file `failed`/`manual_id_collision`.
- [ ] AC6 `$set` = github-owned MINUS `lockedFields[]`; `createdAt` `$setOnInsert`; `published`/`lockedFields`/stale flags NEVER overwritten by `$set`.
- [ ] AC7 idempotent (no upstream change → `added=0,updated=0,unchanged=N`, no `syncedAt` bump).
- [ ] AC8/AC9 stale: `missingFromLastSync=true`, `staleSyncCount++`, `staleSince` on first miss; if `>autoUnpublishAfterStaleCount` → `published=false`; never hard-delete; on re-appearance stale flags clear but `published` NOT auto-set true.
- [ ] AC10 lists via GitHub Contents API (one dir per category, cached for run); frontmatter via `gray-matter` (grep for legacy line-based regex → 0 matches).
- [ ] AC11 at most `GITHUB_SYNC_CONCURRENCY` (def 3) in-flight fetches.
- [ ] AC12/AC13 HMAC over RAW body, `crypto.timingSafeEqual`; missing header → 401 BEFORE parse; post-HMAC malformed JSON → 400 (proves HMAC gate precedes JSON gate).
- [ ] AC14 webhook returns 200 to GitHub <2s; fire-and-forget; never 5xx on internal error (caught, `syncruns(status='failed')`, logged).
- [ ] AC15 legacy `file === 'works.json'` check ABSENT; trigger iff any commit path `startsWith('blogs/')` OR `startsWith('works/')`; ping → `ignored`/`ping_event`.
- [ ] AC16 duplicate `X-GitHub-Delivery` (LRU last 64 / 1h TTL) → 200 `skipped`/`duplicate_delivery`.
- [ ] AC17 in-process mutex: manual concurrent → 409 `sync_in_progress`+`activeRunId`; webhook mid-run → 200 `skipped`/`sync_in_progress`.
- [ ] AC18 `GET /settings` never returns full PAT (sentinel grep → 0 matches).
- [ ] AC19 partial settings update preserves the other field; `githubToken:''` clears; empty body → 400.
- [ ] AC20 AES-256-GCM, fixed 32-byte `GITHUB_ENCRYPTION_KEY` (64 hex); bootstrap validates `/^[0-9a-f]{64}$/i`; missing/invalid → fatal, POST `/settings` → 500 `encryption_key_missing`; NO `crypto.randomBytes` fallback; decrypt failure → `tokenError:'decrypt_failed'`, `/sync` → `token_decrypt_failed`, ciphertext NOT auto-cleared, NO plaintext fallback.
- [ ] AC21 per-file timeout `GITHUB_FILE_TIMEOUT_MS` (def 15000); on timeout file `failed`/`timeout`, run continues.
- [ ] AC22 `GITHUB_WEBHOOK_SECRET` unset → EVERY webhook 401 `webhook_not_configured`; zero webhook `syncruns`; manual sync unaffected.
- [ ] AC23 image rewriting: `baseUrl=https://cdn.jsdelivr.net/gh/<owner>/<repo>@main`; `''` stays `''`; absolute/jsdelivr untouched; `/`-prefixed & `assets/`/`images/`-prefixed → repo-root-relative; other relative → file-dir-relative; spaces/unicode `encodeURI`'d on segment only.
- [ ] AC24 date = frontmatter `date` → leading `YYYY-MM-DD` of filename → today; `readTime` = CJK-aware formula (§11.4); `posts.tags` parsed; `posts.category` default `'未分类'`; `works.tech` parsed.
- [ ] AC25 404 on `blogs/`/`works/` Contents API → empty set for that category (run success); 403/429/5xx → Retry-After else exp backoff 1s×2^n max 3; exhausted → `failed`/`rate_limited`/`github_5xx`; per-file frontmatter parse error → ONLY that file `failed`/`invalid_frontmatter`.
- [ ] AC26 whole-run 401/403 → 200 `{success:false,error:{code:'github_auth_failed'}}`; per-file 403 → `insufficient_scope`; PAT always sent (no unauthenticated 60/hr fallback).
- [ ] AC27 every run persists `syncruns` doc; capped 50; `GET /sync/runs` + `/:runId` surface; 404 if missing.
- [ ] AC28 grep `process.env` in handlers → 0 matches (ConfigService-only); uniform envelope; no raw arrays inline.
- [ ] AC29 PAT redaction (SECURITY CONTROL): known sentinel PAT → every log field replaces with `[REDACTED]`; raw sentinel in ZERO fields.
- [ ] AC32 compliance doc at `backend/src/github/README.md` `## Security & Compliance` containing literal `contents:read` + `SimonSU5/personal-site-content`; pointer in `docs/security.md`.

### 9.5 Key Test Cases

- manual_sync_happy_path; manual_sync_ignores_credential_injection_body; manual_sync_requires_auth; manual_sync_concurrent_returns_409.
- webhook_hmac_missing_before_parse; webhook_invalid_signature_timing_safe; webhook_post_hmac_malformed_json; webhook_wrong_repository; webhook_ping_event; webhook_duplicate_delivery; webhook_no_relevant_paths; webhook_triggers_fire_and_forget_within_2s; webhook_mid_run_skipped; webhook_not_configured.
- rename_disambiguation_wins_over_stale_plus_new; genuine_stale_plus_new_distinct_ids; manual_doc_id_collision_skipped; idempotent_rerun_no_drift.
- per_file_timeout_continues_run; per_file_invalid_frontmatter.
- decrypt_failure_fail_closed; encryption_key_missing_blocks_settings; pat_redacted_in_all_log_fields.
- settings_partial_updates; sync_runs_history_and_cap; lockedfields_unit_contract.

### 9.6 Security Notes

- PAT confidentiality: NEVER serialized into any response/log/error/stack/`syncruns`; crosses trust boundary ONLY in outbound HTTPS to `api.github.com`.
- HMAC integrity: `crypto.timingSafeEqual` over RAW body; verify-then-parse ordering is itself a control.
- AES-256-GCM at rest; fixed mandatory key; NO random-key fallback (current bug removed).
- Fail-closed decrypt: NO plaintext fallback anywhere (legacy `decryptedToken = settings.githubToken` REMOVED); ciphertext NOT auto-cleared.
- Credential-injection closure: `/sync` NEVER reads body for credentials.
- Webhook availability: always 200 to GitHub <2s, never 5xx (prevents retry-storms).
- Webhook-not-configured gate: empty secret → all 401 (no unsigned request honored).
- Concurrency DoS bound: `CONCURRENCY=3` + 15s per-file timeout.
- PAT redaction is a SECURITY CONTROL (sentinel test, not optional).
- ConfigService-only env access; `contents:read` scope on `SimonSU5/personal-site-content`; always require PAT (no unauthenticated fallback).
- In-process mutex assumes single Docker instance (LOCKED); horizontal scaling needs Mongo distributed lock (out of scope, documented).

---

## 10. Domain: Frontend (Next.js refactor)

**Purpose:** Move existing Next.js verbatim into `frontend/`; replace every `fetch('/api/...')` with a unified `api-client.ts` (hand-rolled fetch wrapper; NOT axios); `AuthContext` holds access token in JS memory ONLY; RSC detail pages fetch backend public GETs (server-side via `BACKEND_INTERNAL_URL`); remove `proxy.ts` + legacy edit pages; images via `/api/v1/upload` → OSS URL.

### 10.1 Endpoint Consumption (frontend → backend)

(Full backend contract in §4-9. Key shapes the frontend depends on:)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/auth/login` | public | `{username,password}` → `{accessToken,expiresIn,user}` + refresh cookie |
| POST | `/api/v1/auth/refresh` | cookie-only | empty body → `{accessToken,expiresIn}` + rotated cookie; Origin validated backend-side |
| POST | `/api/v1/auth/logout` | Bearer optional | always 204/200 + cookie clear |
| GET | `/api/v1/auth/me` | Bearer | `{user:{id,username,role}}` (optional session-confirm) |
| GET | `/api/v1/content` | public | cacheable; ETag/304 |
| PATCH | `/api/v1/content` | Bearer | deep-partial; `If-Match` optional → 409 on stale |
| GET | `/api/v1/posts` / `/:id` | public | list/detail; RSC detail uses `notFound()` on 404 |
| POST/PATCH/DELETE | `/api/v1/posts[/:id]` | Bearer | uniform `{success,data}` |
| GET | `/api/v1/works` / `/categories` / `/:id` | public | live shape (`cover/tech/demo/repo/featured`) |
| POST/PATCH/DELETE | `/api/v1/works[/:id]` | Bearer | path param `:id` (NOT legacy `?id=`) |
| POST | `/api/v1/upload` | Bearer | multipart `file` → `{url}` (absolute OSS URL) |
| GET/PUT | `/api/v1/github/settings` | Bearer | never returns PAT |
| POST | `/api/v1/github/sync` | Bearer | upsert preserving `source='manual'` |
| POST | `/api/v1/github/webhook` | HMAC | backend-only; not called by frontend |

### 10.2 Acceptance Criteria

- [ ] **AC-1** `grep -RIn "fetch(['\"]\/api" frontend/` → ZERO matches; all calls via `api-client.ts`.
- [ ] **AC-2** `grep -R axios frontend/package.json frontend/lib` → zero (hand-rolled fetch wrapper).
- [ ] **AC-3** `grep -RInE 'localStorage|sessionStorage|document\.cookie' frontend/lib frontend/app` → ZERO matches storing the access token (token in module-scoped variable only).
- [ ] **AC-4** single 401 → AT MOST one `/auth/refresh`; concurrent 401s coalesced behind one in-flight refresh promise (N simultaneous → exactly 1 refresh network call); success → retry original once; failure → clear memory token + `window.location='/admin/login'`.
- [ ] **AC-5** status buckets: network/5xx → 'service unavailable, retry' (NO refresh); 401 → refresh+retry-once; 403 → 'no permission' (NO refresh); 429 → read `Retry-After`, disable submit; 400 → render `error.fields`; 404 → `notFound()` (RSC) / banner (client).
- [ ] **AC-6** RSC `blog/[id]` + `works/[id]` server-side fetch via `process.env.BACKEND_INTERNAL_URL` (`http://backend:3001/api/v1`); NEVER `NEXT_PUBLIC_API_URL`; NEVER `fs.readFile` on `data/*.json`. `grep -R "readFile" frontend/app/blog frontend/app/works` → ZERO.
- [ ] **AC-7** `proxy.ts` deleted (and NOT recreated as `middleware.ts`); admin gating via `AuthContext` (loading shell until silent-refresh resolves; no protected content in SSR HTML before token exists).
- [ ] **AC-8** `app/admin/edit-about`, `app/admin/edit-content`, `data/about.json`, `data/config.json` deleted; `grep -RIn 'about\.json|config\.json|edit-about|edit-content' frontend/` → ZERO (only deletion sites).
- [ ] **AC-9** navigating to removed routes → clean 404 (or redirect to `/admin/dashboard`), NOT 500.
- [ ] **AC-10** all admin write consumers destructure ONLY `response.data`; `grep -RInE '\.work[^s]|\.post[^s]|\.url[^s]' frontend/app/admin frontend/components/admin` → ZERO response-shape assumptions.
- [ ] **AC-11** upload UI POSTs multipart → inserts `response.data.url` (absolute OSS URL); `grep -RIn '/uploads/' frontend/app/admin frontend/components/admin` → ZERO (old local-write path removed).
- [ ] **AC-12** upload non-2xx → NO image tag inserted; 'upload failed' shown; editor content preserved.
- [ ] **AC-13** network/5xx mid-save → form unsaved local state NOT cleared; 'retry' affordance.
- [ ] **AC-14** `AuthContext.isLoading` true until first silent-refresh completes; protected pages render stable minimal shell; first SSR HTML must not contain protected content (no hydration flash).
- [ ] **AC-15** login 429 → `ApiClientError{status:429,retryAfter:N}`; submit disabled N seconds (countdown); NO generic 'wrong password'.
- [ ] **AC-16** RSC 404 → `notFound()`; no unhandled error.
- [ ] **AC-17** two concurrent 401s → exactly ONE `/auth/refresh`; both originals succeed (or both fail gracefully).
- [ ] **AC-18** `/auth/refresh` 401/403 → logout (best-effort), clear memory token, redirect `/admin/login`; no loop; pending queue rejected.
- [ ] **AC-19** 403 does NOT trigger refresh, does NOT redirect.
- [ ] **AC-21** manual-sync button → `POST /api/v1/github/sync`; after 200 refetch lists; per-record action arrays surfaced.
- [ ] **AC-22** public GETs cacheable (Next `fetch(url,{next:{revalidate:300}})`); admin mutations `revalidateTag('content'\|'posts'\|'works')`; detail TTFB <300ms on ECS.
- [ ] **AC-23** api-client logs `METHOD path -> status` (gated `NODE_ENV!=='production'`); Authorization value/token NEVER logged (only literal `Bearer ***`).
- [ ] **AC-24** `frontend/` builds cleanly with Next.js 16.2.9 App Router (read `node_modules/next/dist/docs/` before deviating from any convention, per project AGENTS.md); Dockerfile builds offline; runtime via `NEXT_PUBLIC_API_URL` + `BACKEND_INTERNAL_URL`.
- [ ] **AC-25** UI text Chinese (zh); new/changed admin UI uses **inline styles** (per project memory `feedback_styling_inline.md` — CSS classes have known caching/priority issues).
- [ ] **NFR-7 AC** `MarkdownContent` renders jsdelivr CDN URLs (synced) AND OSS URLs (uploaded) verbatim; NO URL-rewriting code in `MarkdownContent`/callers.

### 10.3 Key Test Cases

- TC-EC-1 concurrent refresh coalescing; TC-EC-2 refresh failure aborts; TC-EC-3 network error preserves editor; TC-EC-4 403 no refresh; TC-EC-5 login rate limit cooldown; TC-EC-6 field-level validation render; TC-EC-7 RSC 404 calls notFound; TC-EC-8 silent refresh blocks render; TC-EC-9 upload partial failure no broken image; TC-EC-10 sync-then-edit version guard (409 + reload prompt); TC-EC-11 removed legacy route 404; TC-EC-12 cross-origin refresh rejected (backend dep); TC-EC-13 no hydration mismatch.

### 10.4 Security Notes

- Access token in JS memory ONLY (XSS/devtools exfil bounded to ~15min).
- Refresh httpOnly + SameSite=Strict(prod)/Lax(dev) + Secure(prod) + Path=/api/v1/auth, rotated, old invalidated.
- Concurrent 401 coalescing (prevents refresh storm + rotation race).
- Refresh 401/403 terminal → clear + logout + redirect; never loop.
- RSC server-fetch uses `BACKEND_INTERNAL_URL` (compose service name, never leaves host); `NEXT_PUBLIC_API_URL`/secrets never leak into client bundle.
- `/auth/refresh` Origin validation = hard backend dependency (frontend cannot enforce).
- Login IP-rate-limited server-side; api-client surfaces `Retry-After`; form enforces cooldown.
- Logging redacts credentials.
- 403 NEVER triggers refresh (distinct from 401).
- Prod same-origin via nginx (`NEXT_PUBLIC_API_URL=/api/v1`, no CORS, SameSite=Strict works); dev absolute backend URL + CORS allowlist for `localhost:3000` w/ credentials.
- GitHub PAT encrypted server-side (AES-256-GCM, mandatory key); GET `/github/settings` NEVER returns PAT.
- Upload keeps server-side validation; frontend never writes `public/uploads`.
- No SSR leakage of protected content before token exists.

---

## 11. Cross-Domain Contracts (reconciled)

These contracts were reconciled by the Lead Architect across the 8 domain drafts. Implementations MUST honor the unified version here (where a domain draft differed, this section wins).

### 11.1 Sync Preservation Model (UNIFIED — supersedes divergent drafts)

The 8 domain drafts proposed THREE different mechanisms for protecting admin edits from sync overwrite. This SPEC unifies them into ONE coherent model applied identically to **posts** and **works**:

1. **Field-ownership matrix (default protection, always active).** Sync `$set` is HARD-RESTRICTED to sync-owned fields:
   - **posts sync-owned:** `{title, excerpt, content, category, date, cover}` (and `readTime` if computed; `tags` if parsed)
   - **works sync-owned:** `{title, description, category, cover, content}` (and `tech` from frontmatter)
   - **admin-owned (sync NEVER writes):** posts `{featured, manualOverride}`; works `{featured, tech (on UPDATE), demo, repo, coverOverride}`.
2. **`lockedFields: string[]` (explicit admin pin, additive).** When an admin PATCHes a `source='github'` doc, the Posts/Works admin handler pushes each edited field name into `lockedFields` (deduped). Sync READS `lockedFields` and EXCLUDES those names from its `$set` (even sync-owned ones). This lets an admin pin e.g. `title` to override the github title while still receiving github `content` updates.
3. **`source` is IMMUTABLE (no promotion).** Editing a github doc does NOT flip `source` to `'manual'`. `source` stays `'github'`; `manualOverride=true` is set to flag "this github doc has been admin-touched." This matches the works + github drafts; the posts draft's "promote-to-manual" behavior is **retired** in favor of the unified `lockedFields` model (more granular: pin per-field instead of all-or-nothing).
4. **Upsert match filter.** `{source:'github', githubPath:<path>}` (or `{source:{$in:['github',null]}, githubPath}` to also catch legacy null-source docs). NEVER matches `source:'manual'`. `createdAt` via `$setOnInsert`.
5. **Rename disambiguation.** Same-id-different-githubPath observed in one run → UPDATE in place (`_id/createdAt/lockedFields/published` preserved; `githubPath` updated). Manual-doc id collision → manual doc untouched, incoming file `failed`/`manual_id_collision`, disambiguated id `<derived>-g<6-char-nanoid>`.
6. **Stale/unpublish.** `missingFromLastSync/staleSyncCount/staleSince` set when a github doc's path is absent; if `staleSyncCount > autoUnpublishAfterStaleCount` → `published=false`; never hard-delete; on re-appearance stale flags clear but `published` NOT auto-set true. The `published` field is ADDITIVE (default `true`); admin cannot toggle it in v1 (draft/publish workflow deferred).

> **Integration test ownership:** the GitHub domain owns the unit test (sync honors a pre-populated `lockedFields=['title']`). The Posts/Works domains own the cross-domain integration test (admin PATCH pushes `title` into `lockedFields` → subsequent sync preserves admin title AND updates other github fields → assert `title==admin value` AND `updated>=1`).

### 11.2 Tombstone / Suppression Contract (UNIFIED)

The posts draft used a `postBlocklist` collection; the works draft used `githubsettings.suppressedGithubPaths`. **Unified:** BOTH posts and works deletes write to the **`githubsettings.suppressedGithubPaths`** array on the shared singleton (`_id:'singleton'`). The githubPath itself disambiguates category (`blogs/*` vs `works/*`).

- DELETE `source='github'` doc with non-null `githubPath` → `$addToSet` githubPath into `suppressedGithubPaths` (best-effort in the same operation; if a Mongo session/transaction is available on the replica set, wrap the delete + `$addToSet` in a transaction — otherwise best-effort with a documented crash window consistent with the `MAX_FEATURED_WORKS` cap treatment).
- DELETE `source='manual'` → no tombstone write.
- Sync reads `suppressedGithubPaths` and SKIPS matching files (no write).
- Removal ONLY via admin endpoints: `DELETE /api/v1/works/suppressions {githubPath}` (works-owned route, plural noun, literal-before-param) — used for BOTH posts and works tombstones in v1 (the posts draft's `DELETE /api/v1/posts/blocklist/:githubPath` is folded into this single endpoint to avoid two tombstone-removal paths). Next sync after removal recreates the doc as a fresh INSERT (admin-owned fields re-seeded from frontmatter, since they were lost on the original DELETE).
- An audit trail of `{githubPath, originalId, deletedAt}` is preserved (the posts `postBlocklist` collection is retained as a READ-ONLY audit trail for `originalId`/`deletedAt`; the authoritative suppression LIST lives on `githubsettings.suppressedGithubPaths`).

### 11.3 Envelope & Error-Code Unification

- Error envelope field is **`requestId`** (canonical; matches `X-Request-Id`). Earlier drafts' `correlationId` is reconciled to `requestId`.
- Validation error code is **`VALIDATION_ERROR`** (replaces drafts `VALIDATION`, `VALIDATION_FAILED`).
- Global API throttle → `TOO_MANY_REQUESTS` (scaffolding); per-route auth/upload throttle → `RATE_LIMITED` + `Retry-After`.

### 11.4 `readTime` CJK-aware Formula (UNIFIED)

Both posts and github sync use: `minutes = max(1, ceil(cjkCharCount/400 + latinWordCount/200))`, formatted `'${minutes}分钟'`. A provided `readTime` is stored VERBATIM (no recomputation). This is critical for Chinese-content accuracy (the github draft's whitespace-token-only count would under-count CJK).

### 11.5 id Strategy

- **posts manual:** `slugify(title)` (lowercase, whitespace→`-`, strip URL-unsafe punctuation, KEEP unicode Letter chars; collision → `-2/-3/...`).
- **works manual:** `nanoid(12)` URL-safe (retry ≤3 on E11000).
- **posts + works github:** filename-minus-`.md` verbatim (unicode preserved).
- **github-vs-manual id collision:** disambiguate github doc id to `<derived>-g<6-char-nanoid>`, log WARN.
- Both collections: UNIQUE index on `id`; PARTIAL-UNIQUE index on `githubPath` (`partialFilterExpression:{source:'github',githubPath:{$type:'string'}}`).

### 11.6 Auth Token ↔ Frontend Contract

- login response: `{accessToken, user:{id,username,role}, expiresIn}` (frontend needs `expiresIn`).
- refresh response: `{accessToken, expiresIn}` + rotated cookie.
- Cookie: `Path=/api/v1/auth`, `SameSite=Strict(prod)/Lax(dev)`, `Secure(prod)`, NO `Domain`.
- api-client: 401 → coalesce → ONE refresh → retry once; 403 → no refresh; refresh 401/403 → terminal logout.

### 11.7 Sync Endpoint (UNIFIED)

Single manual sync endpoint: **`POST /api/v1/github/sync`** (JwtAuthGuard). The posts draft's `POST /api/v1/posts/sync` is REMOVED. The webhook (`POST /api/v1/github/webhook`, HMAC) calls `PostsSyncService.syncAll()` + `WorksSyncService` IN-PROCESS (NO HTTP self-fetch).

---

## 12. Migration Plan

### 12.1 Data migration (JSON → Mongo)

- **`content` singleton:** boot hook COPY-not-MOVE reads `data/content.json` (authoritative) + `data/about.json` + `data/config.json` (gap-fill ONLY; gap = ABSENT OR `''` OR `[]`). Server-generates `id` for every id-less services/education/experience/skills entry. Re-runnable via `POST /api/v1/content/migrate?force=true`. `data/*.json` byte-identical before/after (sha256-verified); manual cleanup gated on backend-live-24h + grep-clean + sign-off.
- **`posts` / `works`:** one-time import preserving existing ids (`source`, `githubPath` verbatim). `lockedFields=[]`, `published=true`, `manualOverride=false`, stale flags cleared. The next GitHub sync matches via `githubPath` partial-unique index and UPDATES in place (idempotent).
- **`users`:** SeedService creates exactly ONE admin from `ADMIN_BOOTSTRAP_*` on first boot (bcrypt ≥12).
- **`githubsettings`:** the live plaintext PAT in `data/github-settings.json` is **NOT** copied verbatim. The operator re-enters the PAT via `POST /api/v1/github/settings` (it is then AES-256-GCM encrypted with `GITHUB_ENCRYPTION_KEY`).

### 12.2 Image migration (`public/uploads/*` → OSS)

`npm run migrate:uploads` walks `frontend/public/uploads/*`, runs each file through the SAME sharp pipeline, PUTs to OSS under `uploads/<yyyy>/<mm>/<mtimeMs>-<uuid8>-<slug>.<ext>`, idempotent via `ObjectStoragePort.exists(key)`, rewrites any `/uploads/<name>` references in posts/works/content to the OSS url, writes `imageRedirects` + JSON artifact. Current data has ZERO `/uploads/` refs and the dir is empty (preventive). Frontend catch-all `frontend/app/uploads/[...path]/route.ts` 302-redirects via `imageRedirects` (safety net).

### 12.3 Legacy cleanup (after backend-live-24h + grep-clean + sign-off)

Delete: `app/admin/edit-about`, `app/admin/edit-content`, `data/about.json`, `data/config.json`, `proxy.ts`, `data/github-settings.json` (plaintext PAT — only after the operator has re-entered the PAT into `githubsettings`), the legacy `app/api/*` routes (after frontend fully switched to `/api/v1/*`), and `public/uploads/*` (after image migration verified).

---

## 13. Acceptance — Cross-Cutting Smoke

- [ ] `docker compose up --build` from fresh checkout → mongo + backend + frontend + nginx all healthy; nginx-served `GET /api/v1/health` returns the envelope; a frontend page via nginx returns 200.
- [ ] Admin logs in (seeded), creates/edits/deletes a post + work, uploads an image (OSS URL returned), triggers GitHub sync (manual edits preserved), logs out — full round-trip on the docker-compose stack.
- [ ] `grep -R "new Map(" backend/src` → zero throttle/rate-limit hits.
- [ ] `grep -RIn "fetch(['\"]\/api" frontend/` → zero (all via api-client).
- [ ] `pnpm --filter backend typecheck` → zero errors; `pnpm --filter shared build` emits; `pnpm --filter frontend build` succeeds.

---

*End of SPEC. Each domain section is self-contained enough that an Engineer agent can implement it without further questions; cross-domain contracts (§11) are the single source of truth where drafts differed.*

---

## 13. Resolved Open Questions (用户确认 — 阶段 1 检查点)

| # | 问题 | 决策 |
|---|---|---|
| OQ-1 | OSS 图片访问策略 | **Bucket 公共读**。`OSS_PUBLIC_BASE_URL` 为固定公网域名；前端 CSP `img-src` 包含该域名 + `cdn.jsdelivr.net`（同步内容）。 |
| OQ-2 | 现有明文 PAT 处理 | **部署后重新输入**。不写明文 PAT 迁移脚本；操作者部署后 `POST /api/v1/github/settings` 录入，后端 AES-256-GCM 加密落盘。仓库现有明文 PAT 不迁移、需轮换。 |
| OQ-3 | 用户角色模型 | **仅 admin 角色**。v1 只 seed 一个 `role='admin'`；写端点统一 `AdminRoleGuard(role==='admin')`。后续加角色为增量。 |
| OQ-4 | 阿里云 ICP 备案 | **用户负责备案**。OSS/CDN 用自定义公共读域名（需 ICP）；`cdn.jsdelivr.net` 用于同步内容无需备案。 |
| OQ-5 | 后端实例数 | **单实例 v1**（一台 ECS）。GitHub sync 用 in-process Promise mutex 即可；若未来多副本需改 Mongo/Redis 分布式锁。 |
| OQ-6 | MAX_FEATURED_WORKS | **8**。best-effort 上限（读计数→更新），单 admin 场景可接受。 |
| OQ-7 | Mongo 事务 | **单节点副本集**部署，启用事务。delete + tombstone 用 session transaction 保证原子。 |
| OQ-8 | 前端构建 fallback | **不设**。CI 构建始终能访问后端；移除 `PREVIEW_BUILD_FALLBACK_JSON` 相关逻辑。 |
