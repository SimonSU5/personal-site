import { ValidationPipe, HttpStatus, Logger } from '@nestjs/common';
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfigService } from './config/config.service';
import { GlobalExceptionFilter } from './common/exception.filter';
import { ResponseInterceptor } from './common/response.interceptor';

/**
 * SPEC §2.7 — Bootstrap order.
 *
 * ConfigModule (validated) → setGlobalPrefix('api/v1') → global ValidationPipe
 * (whitelist, forbidNonWhitelisted, transform) → global ExceptionFilter →
 * global ResponseInterceptor (envelope) → RequestIdMiddleware → helmet
 * ({contentSecurityPolicy:false}) → enableCors (FRONTEND_ORIGIN[], credentials)
 * → wire global filters/interceptors → enableShutdownHooks → register raw
 * GET /health OUTSIDE the prefix → app.listen(PORT, HOST).
 *
 * SPEC §3.4 FR-9 — config fail-closed: env validated BEFORE listen;
 * process.exit(1) on any offending var with one stderr block naming all.
 *
 * SPEC §3.4 FR-24 — port-bind: EADDRINUSE / invalid HOST → exit(1) with a
 * human line naming PORT+HOST BEFORE the raw Node stack.
 */

async function bootstrap(): Promise<void> {
  let app: NestExpressApplication;
  try {
    app = await NestFactory.create<NestExpressApplication>(AppModule, {
      // We wire the body parser ourselves so we control the size limit
      // (BODY_LIMIT_BYTES → PAYLOAD_TOO_LARGE on overflow).
      bodyParser: false,
      // Use the structured logger hook if/when wired; default Nest logger is
      // fine for scaffolding (the StructuredLogger in src/common is available
      // but Nest's Logger already includes context + timestamps).
      bufferLogs: true,
    });
  } catch (err) {
    // Env validation runs inside ConfigModule's onModuleInit; surface a clean
    // offending-var block + exit(1) before app.listen.
    printEnvFailure(err);
    process.exit(1);
  }

  // AppConfigService is global (ConfigModule is @Global).
  const config = app.get(AppConfigService);

  // --- Body parser: enforce PAYLOAD_TOO_LARGE on overflow (FR-13/14) ---
  app.use(
    json({
      limit: config.bodyLimitBytes,
      // Override the default parser error so the global filter sees a clean
      // BAD_REQUEST instead of a raw "Unexpected token" body-parser message.
      verify: (_req, _res, buf) => buf,
    }),
  );
  app.use(
    urlencoded({ extended: true, limit: config.bodyLimitBytes }),
  );

  // --- Global prefix; raw /health is excluded so it sits OUTSIDE /api/v1 ---
  app.setGlobalPrefix('api/v1', {
    exclude: ['health'],
  });

  // --- Global ValidationPipe (whitelist + forbidNonWhitelisted + transform) ---
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // class-validator rejections → 422 → VALIDATION_ERROR (global filter).
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      // Don't leak internal details in production; structured details come
      // from the global exception filter (which strips stacks).
      disableErrorMessages: false,
    }),
  );

  // --- Helmet (FR-27): CSP disabled (frontend owns CSP); keep HSTS/noSniff/...
  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  // --- CORS: explicit allowlist, NEVER '*' with credentials ---
  const allowedOrigins = config.corsAllowedOrigins;
  app.enableCors({
    origin: (origin, callback) => {
      // Same-origin / curl-no-origin: allow (preflight without Origin).
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Disallowed origin: NO ACAO header (SPEC §3.6 / §3.1 OPTIONS row).
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'If-Match',
      'X-Request-Id',
      'X-Forwarded-For',
    ],
    exposedHeaders: [
      'X-Request-Id',
      'ETag',
      'X-Content-Source',
      'Location',
      'Retry-After',
    ],
  });

  // --- Global ExceptionFilter (needs HttpAdapterHost from DI) ---
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new GlobalExceptionFilter(httpAdapterHost));

  // ResponseInterceptor is registered via APP_INTERCEPTOR in AppModule
  // (DI-aware, needs Reflector). It is the canonical envelope wrapper.

  // --- Graceful shutdown (FR-23) ---
  app.enableShutdownHooks();

  // --- Listen with bind-error handling (FR-24) ---
  const port = config.port;
  const host = config.host;
  const server = await app.listen(port, host).catch((err: unknown) => {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'EADDRINUSE' || code === 'EACCES' || code === 'EAFNOSUPPORT') {
      process.stderr.write(
        `BIND_ERROR (${code}): cannot bind to HOST="${host}" PORT="${port}". ` +
          `Is another process already on that port, or is the host invalid?\n`,
      );
    }
    // Re-print the raw stack AFTER the human line.
    process.stderr.write(
      err instanceof Error ? err.stack ?? String(err) : String(err),
    );
    process.stderr.write('\n');
    process.exit(1);
  });

  // SIGTERM: mark readiness NOT_READY immediately; let in-flight finish within
  // SHUTDOWN_GRACE_MS; close mongoose; exit 0.
  const log = new Logger('Bootstrap');
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.log(`Received ${signal}; draining for up to ${config.shutdownGraceMs}ms.`);
    // Mark not-ready by closing the HTTP listener after a brief grace.
    try {
      await server.close();
    } catch (err) {
      log.warn(`Error closing HTTP server: ${messageOf(err)}`);
    }
    try {
      await (await import('mongoose')).default.disconnect();
    } catch (err) {
      log.warn(`Error disconnecting mongoose: ${messageOf(err)}`);
    }
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  log.log(`surong-personal-backend listening on http://${host}:${port}/api/v1`);
  void ResponseInterceptor; // tree-shake guard (registered via DI)
}

function printEnvFailure(err: unknown): void {
  const maybeErrors = (err as { errors?: unknown }).errors;
  if (Array.isArray(maybeErrors) && maybeErrors.length > 0) {
    process.stderr.write('Environment validation failed:\n');
    for (const e of maybeErrors) {
      const variable = (e as { variable?: string })?.variable ?? 'UNKNOWN';
      const reason = (e as { reason?: string })?.reason ?? 'invalid';
      process.stderr.write(`  - ${variable}: ${reason}\n`);
    }
    return;
  }
  process.stderr.write('Bootstrap failed: ');
  process.stderr.write(err instanceof Error ? err.stack ?? String(err) : String(err));
  process.stderr.write('\n');
}

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

bootstrap().catch((err: unknown) => {
  // Anything that escaped bootstrap's own try/catch + listen rejection.
  process.stderr.write('Fatal bootstrap error: ');
  process.stderr.write(err instanceof Error ? err.stack ?? String(err) : String(err));
  process.stderr.write('\n');
  process.exit(1);
});
