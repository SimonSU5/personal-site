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
exports.MaxLength = exports.Min = exports.Max = exports.IsInt = exports.ConfigEnvironmentDto = exports.NODE_ENV_VALUES = void 0;
exports.validateEnvironment = validateEnvironment;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
Object.defineProperty(exports, "IsInt", { enumerable: true, get: function () { return class_validator_1.IsInt; } });
Object.defineProperty(exports, "Max", { enumerable: true, get: function () { return class_validator_1.Max; } });
Object.defineProperty(exports, "MaxLength", { enumerable: true, get: function () { return class_validator_1.MaxLength; } });
Object.defineProperty(exports, "Min", { enumerable: true, get: function () { return class_validator_1.Min; } });
exports.NODE_ENV_VALUES = [
    'development',
    'production',
    'test',
];
const USERNAME_RE = /^[A-Za-z0-9_.-]{3,32}$/;
const HEX_64_RE = /^[0-9a-f]{64}$/i;
const MONGO_URI_RE = /^mongodb(\+srv)?:\/\/.+/i;
const PLACEHOLDER_PASSWORDS = new Set([
    'admin123',
    'changeme',
    'password',
    'replace-me',
    'dev-secret-change-in-production-min-32-chars',
    'change-me-32-bytes-min',
    '',
]);
const PLACEHOLDER_SECRETS = new Set([
    'change-me-32-bytes-min',
    'dev-secret-change-in-production-min-32-chars',
    'changeme',
    'change-me',
    '',
]);
class ConfigEnvironmentDto {
    NODE_ENV;
    MONGO_URI;
    MONGO_DB_NAME;
    JWT_ACCESS_SECRET;
    JWT_REFRESH_SECRET;
    ALLOWED_ORIGINS;
    GITHUB_ENCRYPTION_KEY;
    GITHUB_WEBHOOK_SECRET;
    OSS_REGION;
    OSS_BUCKET;
    OSS_ACCESS_KEY_ID;
    OSS_ACCESS_KEY_SECRET;
    FRONTEND_ORIGIN;
    ADMIN_BOOTSTRAP_USERNAME;
    ADMIN_BOOTSTRAP_PASSWORD;
    PORT;
    HOST;
    JWT_ACCESS_TTL;
    JWT_REFRESH_TTL;
    REFRESH_ABSOLUTE_LIFETIME_DAYS;
    GITHUB_TOKEN;
    GITHUB_REPO;
    GITHUB_SYNC_CONCURRENCY;
    GITHUB_FILE_TIMEOUT_MS;
    GITHUB_AUTO_UNPUBLISH_STALE_COUNT;
    OSS_ENDPOINT;
    OSS_PUBLIC_BASE_URL;
    OSS_HEAD_BUCKET_TIMEOUT;
    ENABLE_OSS_READY_CHECK;
    BCRYPT_COST;
    THROTTLE_TTL;
    THROTTLE_LIMIT;
    BODY_LIMIT_BYTES;
    PAYLOAD_MAX_DEPTH;
    SHUTDOWN_GRACE_MS;
    LOG_LEVEL;
    MAX_FEATURED_WORKS;
    BACKEND_INTERNAL_URL;
    NEXT_PUBLIC_API_URL;
}
exports.ConfigEnvironmentDto = ConfigEnvironmentDto;
__decorate([
    (0, class_validator_1.IsEnum)(exports.NODE_ENV_VALUES),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "NODE_ENV", void 0);
__decorate([
    (0, class_validator_1.Matches)(MONGO_URI_RE, { message: 'must be a mongodb:// or mongodb+srv:// URL' }),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "MONGO_URI", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "MONGO_DB_NAME", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(32, { message: 'must be at least 32 bytes' }),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "JWT_ACCESS_SECRET", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(32, { message: 'must be at least 32 bytes' }),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "JWT_REFRESH_SECRET", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'must not be empty (comma-separated origins)' }),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "ALLOWED_ORIGINS", void 0);
__decorate([
    (0, class_validator_1.Matches)(HEX_64_RE, {
        message: 'must be 64 hex chars (32-byte AES-256-GCM key)',
    }),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "GITHUB_ENCRYPTION_KEY", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "GITHUB_WEBHOOK_SECRET", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "OSS_REGION", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "OSS_BUCKET", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "OSS_ACCESS_KEY_ID", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "OSS_ACCESS_KEY_SECRET", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'must not be empty (comma-separated origins)' }),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "FRONTEND_ORIGIN", void 0);
__decorate([
    (0, class_validator_1.Matches)(USERNAME_RE, {
        message: 'must match /^[A-Za-z0-9_.-]{3,32}$/',
    }),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "ADMIN_BOOTSTRAP_USERNAME", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, { message: 'must be at least 8 chars' }),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "ADMIN_BOOTSTRAP_PASSWORD", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "PORT", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "HOST", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "JWT_ACCESS_TTL", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "JWT_REFRESH_TTL", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "REFRESH_ABSOLUTE_LIFETIME_DAYS", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "GITHUB_TOKEN", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "GITHUB_REPO", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "GITHUB_SYNC_CONCURRENCY", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "GITHUB_FILE_TIMEOUT_MS", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "GITHUB_AUTO_UNPUBLISH_STALE_COUNT", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "OSS_ENDPOINT", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "OSS_PUBLIC_BASE_URL", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "OSS_HEAD_BUCKET_TIMEOUT", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBooleanString)(),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "ENABLE_OSS_READY_CHECK", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "BCRYPT_COST", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "THROTTLE_TTL", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "THROTTLE_LIMIT", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "BODY_LIMIT_BYTES", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "PAYLOAD_MAX_DEPTH", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "SHUTDOWN_GRACE_MS", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "LOG_LEVEL", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "MAX_FEATURED_WORKS", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "BACKEND_INTERNAL_URL", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConfigEnvironmentDto.prototype, "NEXT_PUBLIC_API_URL", void 0);
function validateEnvironment(env = process.env) {
    const errors = [];
    const dto = (0, class_transformer_1.plainToInstance)(ConfigEnvironmentDto, env, {
        enableImplicitConversion: false,
    });
    const cvErrors = (0, class_validator_1.validateSync)(dto, { skipMissingProperties: false });
    for (const err of cvErrors) {
        pushValidationError(err, errors);
    }
    const nodeEnv = (env.NODE_ENV ?? '').toLowerCase();
    const isProd = nodeEnv === 'production';
    if (typeof env.JWT_ACCESS_SECRET === 'string' &&
        typeof env.JWT_REFRESH_SECRET === 'string' &&
        env.JWT_ACCESS_SECRET.length >= 8 &&
        env.JWT_REFRESH_SECRET.length >= 8 &&
        env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
        errors.push({
            variable: 'JWT_ACCESS_SECRET/JWT_REFRESH_SECRET',
            reason: 'JWT_ACCESS_SECRET must differ from JWT_REFRESH_SECRET',
        });
    }
    if (isProd) {
        if (typeof env.ADMIN_BOOTSTRAP_PASSWORD === 'string' &&
            PLACEHOLDER_PASSWORDS.has(env.ADMIN_BOOTSTRAP_PASSWORD)) {
            errors.push({
                variable: 'ADMIN_BOOTSTRAP_PASSWORD',
                reason: 'placeholder value not allowed in production',
            });
        }
        if (typeof env.JWT_ACCESS_SECRET === 'string' &&
            PLACEHOLDER_SECRETS.has(env.JWT_ACCESS_SECRET)) {
            errors.push({
                variable: 'JWT_ACCESS_SECRET',
                reason: 'placeholder value not allowed in production',
            });
        }
        if (typeof env.JWT_REFRESH_SECRET === 'string' &&
            PLACEHOLDER_SECRETS.has(env.JWT_REFRESH_SECRET)) {
            errors.push({
                variable: 'JWT_REFRESH_SECRET',
                reason: 'placeholder value not allowed in production',
            });
        }
        if (typeof env.ALLOWED_ORIGINS === 'string' &&
            env.ALLOWED_ORIGINS.trim() === '') {
            errors.push({
                variable: 'ALLOWED_ORIGINS',
                reason: 'must not be empty in production',
            });
        }
    }
    const bcryptCost = Number.parseInt(env.BCRYPT_COST ?? '12', 10);
    if (!Number.isFinite(bcryptCost) || bcryptCost < 12) {
        errors.push({
            variable: 'BCRYPT_COST',
            reason: 'must be an integer >= 12',
        });
    }
    if (typeof env.FRONTEND_ORIGIN === 'string') {
        const origins = env.FRONTEND_ORIGIN.split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        if (origins.includes('*')) {
            errors.push({
                variable: 'FRONTEND_ORIGIN',
                reason: "must never be '*' (credentials require explicit origins)",
            });
        }
    }
    if (typeof env.ALLOWED_ORIGINS === 'string') {
        const origins = env.ALLOWED_ORIGINS.split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        if (origins.includes('*')) {
            errors.push({
                variable: 'ALLOWED_ORIGINS',
                reason: "must never be '*' (credentials require explicit origins)",
            });
        }
    }
    if (errors.length > 0) {
        return { ok: false, errors };
    }
    return { ok: true, config: { ...env } };
}
function pushValidationError(err, out) {
    if (err.constraints) {
        const reasons = Object.values(err.constraints);
        out.push({
            variable: err.property,
            reason: reasons.join('; ') || 'invalid',
        });
    }
    if (err.children && err.children.length > 0) {
        for (const child of err.children)
            pushValidationError(child, out);
    }
}
//# sourceMappingURL=env.validation.js.map