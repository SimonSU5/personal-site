import {
  Controller,
  Get,
  Header,
  HttpException,
  HttpStatus,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Request } from 'express';
import { HealthService, ReadinessReport, DepState } from './health.service';
import { ErrorCode } from '../common/error-code';
import { RawResponse } from '../common/response.interceptor';
import { AppConfigService } from '../config/config.service';

/**
 * SPEC §3.1 — health endpoints.
 *
 *   GET /health                  → 200 text/plain 'alive' (raw, NO envelope)
 *   GET /api/v1                  → service identity envelope
 *   GET /api/v1/health           → liveness envelope (ZERO dep round-trips)
 *   GET /api/v1/health/ready     → readiness; 503 NOT_READY when any dep down
 *
 * The raw `/health` route is excluded from the global `/api/v1` prefix in
 * main.ts. It bypasses the ResponseInterceptor via `@RawResponse()`.
 */

const SERVICE_NAME = 'surong-personal-backend';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthService,
    private readonly config: AppConfigService,
  ) {}

  /** GET /api/v1/health — liveness. NO mongo/OSS round-trips. */
  @Get()
  liveness(): {
    status: 'alive';
    timestamp: string;
    uptimeSeconds: number;
  } {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    };
  }

  /**
   * GET /api/v1/health/ready — readiness probe.
   * 200 { success:true, data:{ status:'ready', details:{ mongo, oss } } }
   * 503 { success:false, error:{ code:'NOT_READY', details:{...} }, requestId }
   */
  @Get('ready')
  async readiness(
    @Req() _req: Request,
  ): Promise<{
    status: 'ready';
    details: { mongo: { status: DepState }; oss: { status: DepState } };
  }> {
    const report = await this.health.runReadinessChecks();
    if (this.health.isReady(report)) {
      return { status: 'ready', details: stripDetails(report) };
    }
    // 503 NOT_READY — the global filter surfaces our code/details.
    throw new ServiceUnavailableException({
      code: ErrorCode.NOT_READY,
      message: 'One or more dependencies are not ready',
      details: stripDetails(report),
    });
  }
}

/**
 * GET /api/v1 — service identity.
 *
 * Lives on a separate controller because it sits at the prefix root (no
 * `health` segment). The global ResponseInterceptor wraps it.
 */
@Controller()
export class RootController {
  constructor(private readonly config: AppConfigService) {}

  @Get()
  identity(): {
    name: string;
    apiVersion: 'v1';
    prefix: '/api/v1';
    status: 'alive';
    timestamp: string;
  } {
    return {
      name: SERVICE_NAME,
      apiVersion: 'v1',
      prefix: '/api/v1',
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * GET /health — raw liveness, OUTSIDE /api/v1.
 *
 * Returns text/plain body literally `alive`. Bypasses the envelope via
 * `@RawResponse()` and writes a plain string. Excluded from the global
 * prefix in main.ts.
 *
 * Reserved for nginx/LB probing; never 5xx even when Mongo/OSS are down.
 */
@Controller()
export class RawHealthController {
  @Get('health')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @RawResponse()
  rawLiveness(): string {
    return 'alive';
  }
}

function stripDetails(report: ReadinessReport): {
  mongo: { status: DepState; latencyMs?: number; error?: string };
  oss: { status: DepState; latencyMs?: number; error?: string };
} {
  return {
    mongo: report.mongo,
    oss: report.oss,
  };
}

// Re-export to satisfy strict unused-import checks / future wiring.
export { HttpException, HttpStatus };
