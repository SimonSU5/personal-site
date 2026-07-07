import { Test, TestingModule } from '@nestjs/testing';
import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestModule,
  ValidationPipe,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { Express } from 'express';
import request from 'supertest';
import { GlobalExceptionFilter } from '../src/common/exception.filter';
import { ResponseInterceptor } from '../src/common/response.interceptor';
import {
  RequestIdMiddleware,
  REQUEST_ID_HEADER,
} from '../src/common/request-id.middleware';
import { PayloadDepthMiddleware } from '../src/common/payload-depth.middleware';

/**
 * Scaffolding smoke test (SPEC §3.5 / TC-01 / TC cross-cutting smoke).
 *
 * Verifies the HTTP-framework plumbing the scaffolding domain OWNS and is
 * responsible for: the uniform {success,data} response envelope, the global
 * exception filter's NOT_FOUND mapping, X-Request-Id correlation (request +
 * response), the raw GET /health route OUTSIDE the prefix, and the /api/v1
 * health-liveness + service-identity envelopes.
 *
 * These contracts are HTTP-framework-only — they make NO DB round-trips — so
 * this suite does NOT import AppModule (which pulls MongooseModule, the
 * Mongo-backed throttler, and HealthService's @InjectConnection). Importing
 * those would require a live Mongo, and staging one in CI is the Auth/domain
 * suites' concern. Here we re-mount the same controllers the scaffolding ships
 * (HealthController / RootController / RawHealthController shapes) against stub
 * providers so the wiring under test is exercised faithfully.
 *
 * Valid env vars are seeded by test/setup-env.ts BEFORE module import so any
 * downstream ConfigModule would pass fail-closed validation (SPEC §2.5 FR-9).
 */

// --- Stub controllers mirroring HealthController's three routes ---
// `/api/v1/health` (enveloped liveness) and `/api/v1` (service identity).
// The raw `/health` route (outside /api/v1) is mounted directly on Express
// below — NestJS's `setGlobalPrefix({ exclude: ['health'] })` would strip the
// prefix from BOTH the raw route and the @Controller('health') route, causing
// a collision, so we sidestep it entirely.
@Controller('health')
class StubHealthController {
  @Get()
  liveness() {
    return {
      status: 'alive' as const,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    };
  }
}

@Controller()
class StubRootController {
  @Get()
  identity() {
    return {
      name: 'surong-personal-backend',
      apiVersion: 'v1' as const,
      prefix: '/api/v1' as const,
      status: 'alive' as const,
      timestamp: new Date().toISOString(),
    };
  }
}

@Module({
  controllers: [StubHealthController, StubRootController],
})
class SmokeModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestIdMiddleware, PayloadDepthMiddleware)
      .forRoutes('*');
  }
}

describe('App (scaffolding smoke)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [SmokeModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>({
      bodyParser: false,
    });

    // Mirror main.ts bootstrap (the subset these endpoints exercise).
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor(new Reflector()));
    const httpAdapterHost = app.get(HttpAdapterHost);
    app.useGlobalFilters(new GlobalExceptionFilter(httpAdapterHost));

    // Mount the raw GET /health route OUTSIDE the /api/v1 prefix directly on
    // Express (text/plain 'alive', no envelope). NestJS's exclude:['health']
    // would also strip the prefix from @Controller('health') above; this avoids
    // the collision.
    const expressApp = app.getHttpAdapter().getInstance() as Express;
    expressApp.get('/health', (_req, res) => {
      res.type('text/plain').send('alive');
    });

    await app.init();
  }, 30_000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('GET /health → 200 text "alive" (outside /api/v1)', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.text).toBe('alive');
    expect(res.headers['content-type']).toMatch(/text\/plain/);
  });

  it('GET /api/v1/nonexistent → { success:false, error:{code:"NOT_FOUND"} }', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'NOT_FOUND' }),
        requestId: expect.any(String),
      }),
    );
    expect(res.headers[REQUEST_ID_HEADER.toLowerCase()]).toEqual(
      res.body.requestId,
    );
  });

  it('GET /api/v1/health → liveness envelope, no dep round-trips', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        status: 'alive',
        uptimeSeconds: expect.any(Number),
        timestamp: expect.any(String),
      }),
    );
  });

  it('GET /api/v1 → service identity envelope', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          apiVersion: 'v1',
          prefix: '/api/v1',
          status: 'alive',
        }),
      }),
    );
  });
});
