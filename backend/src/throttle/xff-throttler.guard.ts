import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * SPEC §2.8 — `tracker` = X-Forwarded-For FIRST/leftmost entry (consistent
 * with nginx). Override `getTracker` to honor that. Falls back to `req.ip`
 * when no XFF header is present (e.g. direct dev access).
 */
@Injectable()
export class XffThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(
    req: Request & { protocol?: string },
  ): Promise<string> {
    const xff = req.headers?.['x-forwarded-for'];
    const raw = Array.isArray(xff) ? xff[0] : xff;
    if (typeof raw === 'string' && raw.length > 0) {
      const first = raw.split(',')[0].trim();
      if (first.length > 0) return first;
    }
    return req.ip ?? '';
  }

  /**
   * Fail-closed: when the storage is unreachable, the underlying MongoError
   * propagates out of `super.handleException`/`shouldThrow`. The global
   * exception filter maps it to 503 DEPENDENCY_DOWN. We keep the default
   * (throw) — NEVER silently allow.
   */
  protected async shouldThrow(_err: Error): Promise<boolean> {
    return true;
  }

  protected async shouldSkip(
    _context: ExecutionContext,
  ): Promise<boolean> {
    // Default: do not skip. Per-route opt-outs use @SkipThrottle().
    return false;
  }
}
