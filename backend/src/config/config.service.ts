import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

/**
 * Typed config accessor. Reads from the validated ConfigModule store.
 *
 * Returns parsed primitives with sensible defaults for optional vars
 * (per SPEC §2.5 default column). Secrets have NO default; callers MUST
 * use the `*OrThrow` variants.
 */

export interface ServiceIdentityDto {
  name: string;
  apiVersion: 'v1';
  prefix: '/api/v1';
  status: 'alive';
  timestamp: string;
}

@Injectable()
export class AppConfigService {
  constructor(private readonly inner: NestConfigService) {}

  // --- core ---

  get nodeEnv(): 'development' | 'production' | 'test' {
    const v = this.inner.get<string>('NODE_ENV');
    if (v === 'development' || v === 'production' || v === 'test') return v;
    return 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get port(): number {
    const raw = this.inner.get<string>('PORT') ?? '3001';
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : 3001;
  }

  get host(): string {
    return this.inner.get<string>('HOST') ?? '0.0.0.0';
  }

  // --- mongo ---

  get mongoUri(): string {
    return this.require('MONGO_URI');
  }

  get mongoDbName(): string {
    return this.require('MONGO_DB_NAME');
  }

  get mongoConnectMaxRetries(): number {
    return this.intOr('MONGO_CONNECT_MAX_RETRIES', 5);
  }

  get mongoConnectBackoffMs(): number {
    return this.intOr('MONGO_CONNECT_BACKOFF_MS', 1000);
  }

  // --- jwt (no defaults on secrets) ---

  get jwtAccessSecret(): string {
    return this.require('JWT_ACCESS_SECRET');
  }

  get jwtRefreshSecret(): string {
    return this.require('JWT_REFRESH_SECRET');
  }

  get jwtAccessTtl(): string {
    return this.inner.get<string>('JWT_ACCESS_TTL') ?? '15m';
  }

  get jwtRefreshTtl(): string {
    return this.inner.get<string>('JWT_REFRESH_TTL') ?? '7d';
  }

  get refreshAbsoluteLifetimeDays(): number {
    return this.intOr('REFRESH_ABSOLUTE_LIFETIME_DAYS', 30);
  }

  // --- cors / origins ---

  get allowedOrigins(): string[] {
    return this.listOr('ALLOWED_ORIGINS', []);
  }

  get frontendOrigins(): string[] {
    return this.listOr('FRONTEND_ORIGIN', []);
  }

  /** CORS allowed origins — FRONTEND_ORIGIN list (allowlist w/ credentials). */
  get corsAllowedOrigins(): string[] {
    return this.frontendOrigins;
  }

  // --- admin seed ---

  get adminBootstrapUsername(): string {
    return this.require('ADMIN_BOOTSTRAP_USERNAME');
  }

  get adminBootstrapPassword(): string {
    return this.require('ADMIN_BOOTSTRAP_PASSWORD');
  }

  get bcryptCost(): number {
    return Math.max(12, this.intOr('BCRYPT_COST', 12));
  }

  // --- throttle / body / depth ---

  get throttleTtlSeconds(): number {
    return this.intOr('THROTTLE_TTL', 60);
  }

  get throttleLimit(): number {
    return this.intOr('THROTTLE_LIMIT', 100);
  }

  get bodyLimitBytes(): number {
    return this.intOr('BODY_LIMIT_BYTES', 20 * 1024 * 1024);
  }

  get payloadMaxDepth(): number {
    return this.intOr('PAYLOAD_MAX_DEPTH', 8);
  }

  get shutdownGraceMs(): number {
    return this.intOr('SHUTDOWN_GRACE_MS', 10_000);
  }

  // --- github ---

  get githubEncryptionKey(): string {
    return this.require('GITHUB_ENCRYPTION_KEY');
  }

  get githubWebhookSecret(): string {
    return this.inner.get<string>('GITHUB_WEBHOOK_SECRET') ?? '';
  }

  get githubToken(): string | undefined {
    return this.inner.get<string>('GITHUB_TOKEN');
  }

  get githubRepo(): string | undefined {
    return this.inner.get<string>('GITHUB_REPO');
  }

  get githubSyncConcurrency(): number {
    return this.intOr('GITHUB_SYNC_CONCURRENCY', 3);
  }

  get githubFileTimeoutMs(): number {
    return this.intOr('GITHUB_FILE_TIMEOUT_MS', 15_000);
  }

  get githubAutoUnpublishStaleCount(): number {
    return this.intOr('GITHUB_AUTO_UNPUBLISH_STALE_COUNT', 3);
  }

  // --- oss ---

  get ossRegion(): string {
    return this.require('OSS_REGION');
  }

  get ossBucket(): string {
    return this.require('OSS_BUCKET');
  }

  get ossAccessKeyId(): string {
    return this.require('OSS_ACCESS_KEY_ID');
  }

  get ossAccessKeySecret(): string {
    return this.require('OSS_ACCESS_KEY_SECRET');
  }

  get ossEndpoint(): string | undefined {
    return this.inner.get<string>('OSS_ENDPOINT');
  }

  get ossPublicBaseUrl(): string {
    return (
      this.inner.get<string>('OSS_PUBLIC_BASE_URL') ??
      `https://${this.ossBucket}.${this.ossRegion}.aliyuncs.com`
    );
  }

  get ossHeadBucketTimeoutMs(): number {
    return this.intOr('OSS_HEAD_BUCKET_TIMEOUT', 2000);
  }

  get enableOssReadyCheck(): boolean {
    const v = this.inner.get<string>('ENABLE_OSS_READY_CHECK') ?? 'true';
    return v === 'true' || v === '1';
  }

  // --- works ---

  get maxFeaturedWorks(): number {
    return this.intOr('MAX_FEATURED_WORKS', 8);
  }

  // --- logging ---

  get logLevel(): string {
    return this.inner.get<string>('LOG_LEVEL') ?? 'info';
  }

  // --- internal helpers ---

  private require(key: string): string {
    const v = this.inner.get<string>(key);
    if (v === undefined || v === null || v === '') {
      throw new Error(`Required env var ${key} is not set`);
    }
    return v;
  }

  private intOr(key: string, fallback: number): number {
    const raw = this.inner.get<string>(key);
    if (raw === undefined || raw === '') return fallback;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : fallback;
  }

  private listOr(key: string, fallback: string[]): string[] {
    const raw = this.inner.get<string>(key);
    if (!raw) return fallback;
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
}
