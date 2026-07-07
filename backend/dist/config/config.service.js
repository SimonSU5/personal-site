"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppConfigService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let AppConfigService = class AppConfigService {
    inner;
    constructor(inner) {
        this.inner = inner;
    }
    get nodeEnv() {
        const v = this.inner.get('NODE_ENV');
        if (v === 'development' || v === 'production' || v === 'test')
            return v;
        return 'development';
    }
    get isProduction() {
        return this.nodeEnv === 'production';
    }
    get port() {
        const raw = this.inner.get('PORT') ?? '3001';
        const n = Number.parseInt(raw, 10);
        return Number.isFinite(n) ? n : 3001;
    }
    get host() {
        return this.inner.get('HOST') ?? '0.0.0.0';
    }
    get mongoUri() {
        return this.require('MONGO_URI');
    }
    get mongoDbName() {
        return this.require('MONGO_DB_NAME');
    }
    get mongoConnectMaxRetries() {
        return this.intOr('MONGO_CONNECT_MAX_RETRIES', 5);
    }
    get mongoConnectBackoffMs() {
        return this.intOr('MONGO_CONNECT_BACKOFF_MS', 1000);
    }
    get jwtAccessSecret() {
        return this.require('JWT_ACCESS_SECRET');
    }
    get jwtRefreshSecret() {
        return this.require('JWT_REFRESH_SECRET');
    }
    get jwtAccessTtl() {
        return this.inner.get('JWT_ACCESS_TTL') ?? '15m';
    }
    get jwtRefreshTtl() {
        return this.inner.get('JWT_REFRESH_TTL') ?? '7d';
    }
    get refreshAbsoluteLifetimeDays() {
        return this.intOr('REFRESH_ABSOLUTE_LIFETIME_DAYS', 30);
    }
    get allowedOrigins() {
        return this.listOr('ALLOWED_ORIGINS', []);
    }
    get frontendOrigins() {
        return this.listOr('FRONTEND_ORIGIN', []);
    }
    get corsAllowedOrigins() {
        return this.frontendOrigins;
    }
    get adminBootstrapUsername() {
        return this.require('ADMIN_BOOTSTRAP_USERNAME');
    }
    get adminBootstrapPassword() {
        return this.require('ADMIN_BOOTSTRAP_PASSWORD');
    }
    get bcryptCost() {
        return Math.max(12, this.intOr('BCRYPT_COST', 12));
    }
    get throttleTtlSeconds() {
        return this.intOr('THROTTLE_TTL', 60);
    }
    get throttleLimit() {
        return this.intOr('THROTTLE_LIMIT', 100);
    }
    get bodyLimitBytes() {
        return this.intOr('BODY_LIMIT_BYTES', 20 * 1024 * 1024);
    }
    get payloadMaxDepth() {
        return this.intOr('PAYLOAD_MAX_DEPTH', 8);
    }
    get shutdownGraceMs() {
        return this.intOr('SHUTDOWN_GRACE_MS', 10_000);
    }
    get githubEncryptionKey() {
        return this.require('GITHUB_ENCRYPTION_KEY');
    }
    get githubWebhookSecret() {
        return this.inner.get('GITHUB_WEBHOOK_SECRET') ?? '';
    }
    get githubToken() {
        return this.inner.get('GITHUB_TOKEN');
    }
    get githubRepo() {
        return this.inner.get('GITHUB_REPO');
    }
    get githubSyncConcurrency() {
        return this.intOr('GITHUB_SYNC_CONCURRENCY', 3);
    }
    get githubFileTimeoutMs() {
        return this.intOr('GITHUB_FILE_TIMEOUT_MS', 15_000);
    }
    get githubAutoUnpublishStaleCount() {
        return this.intOr('GITHUB_AUTO_UNPUBLISH_STALE_COUNT', 3);
    }
    get ossRegion() {
        return this.require('OSS_REGION');
    }
    get ossBucket() {
        return this.require('OSS_BUCKET');
    }
    get ossAccessKeyId() {
        return this.require('OSS_ACCESS_KEY_ID');
    }
    get ossAccessKeySecret() {
        return this.require('OSS_ACCESS_KEY_SECRET');
    }
    get ossEndpoint() {
        return this.inner.get('OSS_ENDPOINT');
    }
    get ossPublicBaseUrl() {
        return (this.inner.get('OSS_PUBLIC_BASE_URL') ??
            `https://${this.ossBucket}.${this.ossRegion}.aliyuncs.com`);
    }
    get ossHeadBucketTimeoutMs() {
        return this.intOr('OSS_HEAD_BUCKET_TIMEOUT', 2000);
    }
    get enableOssReadyCheck() {
        const v = this.inner.get('ENABLE_OSS_READY_CHECK') ?? 'true';
        return v === 'true' || v === '1';
    }
    get maxFeaturedWorks() {
        return this.intOr('MAX_FEATURED_WORKS', 8);
    }
    get logLevel() {
        return this.inner.get('LOG_LEVEL') ?? 'info';
    }
    require(key) {
        const v = this.inner.get(key);
        if (v === undefined || v === null || v === '') {
            throw new Error(`Required env var ${key} is not set`);
        }
        return v;
    }
    intOr(key, fallback) {
        const raw = this.inner.get(key);
        if (raw === undefined || raw === '')
            return fallback;
        const n = Number.parseInt(raw, 10);
        return Number.isFinite(n) ? n : fallback;
    }
    listOr(key, fallback) {
        const raw = this.inner.get(key);
        if (!raw)
            return fallback;
        return raw
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
    }
};
exports.AppConfigService = AppConfigService;
exports.AppConfigService = AppConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AppConfigService);
//# sourceMappingURL=config.service.js.map