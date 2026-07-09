import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AppConfigService } from '../config/config.service';

export type DepState = 'up' | 'down' | 'skipped';

export interface DependencyCheck {
  status: DepState;
  latencyMs?: number;
  error?: string;
}

export interface ReadinessReport {
  mongo: DependencyCheck;
  oss: DependencyCheck;
}

/**
 * HealthService — liveness has ZERO dependency round-trips; readiness pings
 * each dependency with a bounded per-dep timeout (SPEC §3.1 / FR-6 / FR-7).
 *
 * Total budget 500ms. Each dependency check is raced against a timeout via
 * Promise.race so a slow/hung dep cannot blow the budget.
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger('HealthService');
  // Flipped true on SIGTERM so the readiness probe immediately reports
  // NOT_READY while in-flight requests drain (SPEC §3.4 FR-23).
  private shuttingDown = false;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly config: AppConfigService,
  ) {}

  /** Called from the SIGTERM handler in main.ts to mark the service draining. */
  markShuttingDown(): void {
    this.shuttingDown = true;
  }

  /**
   * Check Mongo via `db.admin().ping()`. Bounded by OSS_HEAD_BUCKET_TIMEOUT_MS
   * fallback (we reuse the per-dep timeout config). Never throws — catches
   * errors and returns {status:'down'} so readiness can degrade gracefully.
   */
  async checkMongo(perDepTimeoutMs: number): Promise<DependencyCheck> {
    return this.withTimeout(
      (async () => {
        // readyState === 1 means connected.
        if (this.connection.readyState !== 1) {
          return {
            status: 'down' as const,
            error: `connection not ready (state=${this.connection.readyState})`,
          };
        }
        const start = Date.now();
        try {
          const admin = this.connection.db?.admin();
          if (!admin) {
            return {
              status: 'down' as const,
              error: 'admin handle unavailable',
            };
          }
          await admin.ping();
          return {
            status: 'up' as const,
            latencyMs: Date.now() - start,
          };
        } catch (err) {
          return {
            status: 'down' as const,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      })(),
      perDepTimeoutMs,
      'mongo',
    );
  }

  /**
   * Check OSS. The full OSS client is owned by the upload domain (out of
   * scaffolding scope); we degrade gracefully: if OSS env is missing or
   * `ENABLE_OSS_READY_CHECK=false`, the check is `skipped`. When enabled but
   * the OSS client is unavailable, it reports `down` so a misconfigured prod
   * deploy is not silently marked healthy.
   *
   * The upload domain will override this with a real `headBucket()` probe.
   */
  async checkOss(perDepTimeoutMs: number): Promise<DependencyCheck> {
    if (!this.config.enableOssReadyCheck) {
      return { status: 'skipped' };
    }
    // Real OSS readiness probe is provided by the upload domain. Scaffolding
    // only asserts configuration presence so a missing config is surfaced.
    return this.withTimeout(
      Promise.resolve<DependencyCheck>(
        (() => {
          if (
            !this.config.ossRegion ||
            !this.config.ossBucket ||
            !this.config.ossAccessKeyId ||
            !this.config.ossAccessKeySecret
          ) {
            return { status: 'down' as const, error: 'OSS env not configured' };
          }
          return { status: 'up' as const, latencyMs: 0 };
        })(),
      ),
      perDepTimeoutMs,
      'oss',
    );
  }

  async runReadinessChecks(): Promise<ReadinessReport> {
    const perDep = this.config.ossHeadBucketTimeoutMs;
    const [mongo, oss] = await Promise.all([
      this.checkMongo(perDep),
      this.checkOss(perDep),
    ]);
    return { mongo, oss };
  }

  /** Whether the report indicates overall readiness (every non-skipped dep up
   * AND not currently draining). */
  isReady(report: ReadinessReport): boolean {
    if (this.shuttingDown) return false;
    const deps: DependencyCheck[] = [report.mongo, report.oss];
    return deps.every((d) => d.status === 'up' || d.status === 'skipped');
  }

  private async withTimeout<T extends DependencyCheck>(
    promise: Promise<T>,
    ms: number,
    label: string,
  ): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<T>((resolve) => {
      timer = setTimeout(() => {
        resolve({
          status: 'down',
          error: `timeout after ${ms}ms`,
        } as T);
      }, ms);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
      void label;
    }
  }
}
