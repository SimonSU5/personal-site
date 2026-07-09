import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * SPEC §2.8 — `tracker` = X-Forwarded-For FIRST/leftmost entry (consistent
 * with nginx). Override `getTracker` to honor that. Falls back to `req.ip`
 * when no XFF header is present (e.g. direct dev access).
 *
 * Fail-closed behavior (storage unreachable → 503 DEPENDENCY_DOWN) is handled
 * implicitly: MongoThrottlerStorage.increment() throws the underlying
 * MongoError, which propagates uncaught through the guard to the global
 * exception filter (mapped via isMongoFatal). There is no `shouldThrow` hook
 * in @nestjs/throttler v6 to override; the default is already to propagate.
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
}
