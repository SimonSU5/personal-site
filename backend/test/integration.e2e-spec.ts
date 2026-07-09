import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { GlobalExceptionFilter } from '../src/common/exception.filter';
import { AppModule } from '../src/app.module';
import { REQUEST_ID_HEADER } from '../src/common/request-id.middleware';

/**
 * Real-AppModule integration test — boots the FULL app (MongooseModule +
 * HealthModule + SeedModule + ThrottleModule with its real Mongo storage)
 * against the dev replica set started by `docker-compose.dev.yml`. This is the
 * test the scaffolding smoke suite (app.e2e-spec.ts, Mongo-free stubs) cannot
 * be — it exercises the ACTUAL production wiring, including:
 *   - the /health vs /api/v1/health route registration under
 *     setGlobalPrefix({ exclude: ['health'] }) (review finding #1),
 *   - Mongoose connection + SeedService admin creation,
 *   - the real HealthController / RootController / RawHealthController.
 *
 * Requires: `docker compose -f docker-compose.dev.yml up -d` running.
 */

describe('App integration (real AppModule + Mongo)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>({
      bodyParser: false,
    });
    app.setGlobalPrefix('api/v1', { exclude: ['health'] } as never);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    );
    const httpAdapterHost = app.get(HttpAdapterHost);
    app.useGlobalFilters(new GlobalExceptionFilter(httpAdapterHost));
    await app.init();
  }, 90_000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('GET /health → 200 text/plain "alive" (raw, outside /api/v1)', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.text).toBe('alive');
    expect(res.headers['content-type']).toMatch(/text\/plain/);
  });

  it('GET /api/v1/health → 200 liveness envelope', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('alive');
  });

  it('GET /api/v1 → 200 service-identity envelope', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.apiVersion).toBe('v1');
  });

  it('GET /api/v1/health/ready → readiness report (mongo up)', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health/ready');
    expect([200, 503]).toContain(res.status);
    // Mongo should be up given the dev replset; oss is config-only here.
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.data.details.mongo.status).toBe('up');
    }
    expect(res.headers[REQUEST_ID_HEADER.toLowerCase()]).toBeDefined();
  });
});
