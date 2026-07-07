# surong-personal-backend

NestJS + MongoDB backend for the `surong-personal` site. This package
implements the **Scaffolding & Infrastructure** domain per
`docs/spec/SPEC.md` §3 (bootstrap, uniform envelope, global error filter,
fail-closed config, Mongo-backed throttling, liveness/readiness, idempotent
admin seed, graceful shutdown, port-bind handling).

Auth / Content / Posts / Works / Upload / GitHub domains live alongside this
package and consume the contracts (response envelope, error code enum,
`users` seed, `throttler` collection) defined here.

## Stack

- NestJS 11 + TypeScript (strict mode)
- MongoDB via Mongoose 8 (1-node replica set, transactions available)
- @nestjs/throttler 6 with a **Mongo-backed** `ThrottlerStorageService`
  (`throttler` collection, TTL index on `expiresAt`, cluster-safe)
- helmet (CSP disabled; the frontend owns CSP), CORS allowlist w/ credentials

## Run locally

The backend requires MongoDB running as a **1-node replica set** (transactions
+ majority writes used by sync upsert + seed). Quick start with Docker:

```bash
# 1) Spin up Mongo as a replica set (one-time init).
docker run --rm -d --name mongo-rs \
  -p 27017:27017 \
  mongo:7 --replSet rs0

# Initialise the replica set (run once).
docker exec -it mongo-rs mongosh --eval 'rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "127.0.0.1:27017" }]})'

# 2) Configure env.
cp .env.example .env
#   fill in real secrets — DO NOT leave the placeholders in production:
#   JWT_ACCESS_SECRET / JWT_REFRESH_SECRET / GITHUB_ENCRYPTION_KEY (64 hex) /
#   OSS_* / ADMIN_BOOTSTRAP_PASSWORD

# 3) Install + run.
npm install
npm run start:dev    # nest start --watch
```

The API mounts under `/api/v1` (e.g. `GET http://localhost:3001/api/v1/health`).
The raw `GET /health` (text/plain `alive`) sits outside the prefix and is
reserved for nginx / LB probing.

## Scripts

| Script            | Description                                   |
|-------------------|-----------------------------------------------|
| `npm start`       | `node dist/main.js` (after `build`)           |
| `npm run start:dev` | `nest start --watch`                        |
| `npm run build`   | `nest build` (zero TS errors under `strict`)  |
| `npm test`        | unit jest (`*.spec.ts`)                        |
| `npm run test:e2e`| e2e jest (`test/*.e2e-spec.ts`)               |
| `npm run typecheck` | `tsc --noEmit`                              |

## Notable behaviors

- **Fail-closed config (FR-9).** `ConfigModule` validates every required env
  var via `class-validator` at startup. Missing/invalid required var,
  `JWT_ACCESS_SECRET === JWT_REFRESH_SECRET`, a placeholder secret, or
  `GITHUB_ENCRYPTION_KEY` not 64-hex (32 bytes) → `process.exit(1)` BEFORE
  `app.listen`, with one stderr block naming every offending var.
- **Uniform envelope (FR-5).** Every `/api/v1` controller return is wrapped
  by `ResponseInterceptor` as `{success:true,data:<T>}`. The only exception
  is raw `GET /health`.
- **Error code table (§2.2).** Global codes (`VALIDATION_ERROR`,
  `BAD_REQUEST`, `PAYLOAD_TOO_LARGE`, `PAYLOAD_TOO_DEEP`, `NOT_FOUND`,
  `METHOD_NOT_ALLOWED`, `TOO_MANY_REQUESTS`, `NOT_READY`,
  `DEPENDENCY_DOWN`, `BIND_ERROR`, `INTERNAL_ERROR`) emitted by the global
  `GlobalExceptionFilter`. Stack traces never leak in any response body.
- **Throttle (FR-21/22).** Global API throttle via a Mongo-backed
  `ThrottlerStorageService`. Tracker = `X-Forwarded-For` leftmost entry. If
  the store is unreachable → fail-closed 503 (NEVER silently allowed).
- **Liveness (FR-6).** `GET /api/v1/health` makes ZERO Mongo/OSS round-trips
  even when deps are down; p99 < 500ms.
- **Readiness (FR-7).** `GET /api/v1/health/ready` 200 when deps up, 503
  `NOT_READY` when any down; per-dep timeout `OSS_HEAD_BUCKET_TIMEOUT`,
  total budget 500ms.
- **Admin seed (FR-11).** `users.countDocuments()===0` → create exactly ONE
  admin (bcrypt cost ≥12). Concurrent seeders race → UNIQUE username index
  E11000 swallowed. Final count === 1. Re-boot never overwrites passwords.
- **Graceful shutdown (FR-23).** SIGTERM → readiness immediately 503,
  in-flight requests drain within `SHUTDOWN_GRACE_MS`, mongoose closed,
  exit 0.
- **Port-bind (FR-24).** `EADDRINUSE` / invalid HOST → exit(1) with a human
  line naming `PORT` + `HOST` BEFORE the raw Node stack.

## Operator notes

- **Clock skew.** JWT TTL, throttle windows, and log timestamps all assume
  synchronised clocks. Run NTP / chrony on the ECS host.
- **Behind nginx.** `X-Forwarded-For` is read leftmost-first (consistent with
  nginx). If you deploy behind a different upstream LB, set `X-Forwarded-For`
  to that LB's client IP so throttling keys on the real client.
- **OSS public-read.** The OSS bucket is provisioned with a bucket-level
  public-read POLICY (operator task). `OSS_PUBLIC_BASE_URL` is the host used
  in returned image URLs; CSP `img-src` must include it AND
  `cdn.jsdelivr.net` (synced GitHub markdown images).
- **Single instance (OQ-5).** v1 deploys ONE backend replica; the in-process
  GitHub sync mutex relies on this. Multi-replica needs a Mongo/Redis
  distributed lock (out of scope).

## Layout

```
src/
  main.ts                bootstrap (SPEC §2.7 order), bind-error + shutdown
  app.module.ts          root module + RequestId / PayloadDepth middleware
  common/
    error-code.ts        ErrorCode union + http-status map + body builder
    request-id.middleware.ts   X-Request-Id echo / uuid v4 generate
    payload-depth.middleware.ts  PAYLOAD_TOO_DEEP guard (FR-14)
    response.interceptor.ts     { success:true, data:T } envelope
    exception.filter.ts         GlobalExceptionFilter (no stack leaks)
    structured-logger.ts        JSON logger with requestId correlation
  config/
    env.validation.ts    ConfigEnvironmentDto (class-validator) + cross checks
    config.service.ts    typed accessor with defaults per SPEC §2.5
    config.module.ts     @nestjs/config wrapper (fail-closed)
  health/
    health.controller.ts /health, /api/v1, /api/v1/health, /api/v1/health/ready
    health.service.ts    Mongo ping + OSS probe (bounded timeouts)
  throttle/
    throttler.schema.ts  `throttler` collection (TTL on expiresAt)
    mongo-throttler-storage.ts  ThrottlerStorage impl (cluster-safe, fail-closed)
    xff-throttler.guard.ts      XFF-leftmost tracker
    throttle.module.ts  ThrottlerModule.forRootAsync wiring
  seed/
    user.schema.ts       `users` core seed contract
    seed.service.ts      idempotent admin seed (E11000 swallowed on race)
test/
  app.e2e-spec.ts        scaffolding smoke (GET /health + GET /api/v1/404)
```
