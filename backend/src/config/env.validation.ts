import { plainToInstance } from 'class-transformer';
import {
  IsBooleanString,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  validateSync,
  ValidationError,
} from 'class-validator';

/**
 * SPEC §2.5 — validated config environment.
 *
 * Validated at startup by ConfigModule against ConfigEnvironmentDto
 * (class-validator/class-transformer, NOT Joi). NO default fallback for any
 * secret. Missing/invalid required var, OR `JWT_ACCESS_SECRET ===
 * JWT_REFRESH_SECRET`, OR any secret below minimum, OR
 * `GITHUB_ENCRYPTION_KEY` not a 32-byte (64-hex) AES key → `process.exit(1)`
 * BEFORE `app.listen`, stderr lists EVERY offending var + reason in one block.
 */

export type NodeEnv = 'development' | 'production' | 'test';

/** @internal concrete value array backing the NodeEnv enum (used by @IsEnum). */
export const NODE_ENV_VALUES: readonly NodeEnv[] = [
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

export class ConfigEnvironmentDto {
  // --- Required ---

  @IsEnum(NODE_ENV_VALUES)
  NODE_ENV!: NodeEnv;

  @Matches(MONGO_URI_RE, { message: 'must be a mongodb:// or mongodb+srv:// URL' })
  MONGO_URI!: string;

  @IsString()
  @MinLength(1)
  MONGO_DB_NAME!: string;

  @IsString()
  @MinLength(32, { message: 'must be at least 32 bytes' })
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(32, { message: 'must be at least 32 bytes' })
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @MinLength(1, { message: 'must not be empty (comma-separated origins)' })
  ALLOWED_ORIGINS!: string;

  @Matches(HEX_64_RE, {
    message: 'must be 64 hex chars (32-byte AES-256-GCM key)',
  })
  GITHUB_ENCRYPTION_KEY!: string;

  @IsString()
  GITHUB_WEBHOOK_SECRET!: string;

  @IsString()
  @MinLength(1)
  OSS_REGION!: string;

  @IsString()
  @MinLength(1)
  OSS_BUCKET!: string;

  @IsString()
  @MinLength(1)
  OSS_ACCESS_KEY_ID!: string;

  @IsString()
  @MinLength(1)
  OSS_ACCESS_KEY_SECRET!: string;

  @IsString()
  @MinLength(1, { message: 'must not be empty (comma-separated origins)' })
  FRONTEND_ORIGIN!: string;

  @Matches(USERNAME_RE, {
    message: 'must match /^[A-Za-z0-9_.-]{3,32}$/',
  })
  ADMIN_BOOTSTRAP_USERNAME!: string;

  @IsString()
  @MinLength(8, { message: 'must be at least 8 chars' })
  ADMIN_BOOTSTRAP_PASSWORD!: string;

  // --- Optional ---

  @IsOptional()
  @IsNumberString()
  PORT?: string;

  @IsOptional()
  @IsString()
  HOST?: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_TTL?: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_TTL?: string;

  @IsOptional()
  @IsNumberString()
  REFRESH_ABSOLUTE_LIFETIME_DAYS?: string;

  @IsOptional()
  @IsString()
  GITHUB_TOKEN?: string;

  @IsOptional()
  @IsString()
  GITHUB_REPO?: string;

  @IsOptional()
  @IsNumberString()
  GITHUB_SYNC_CONCURRENCY?: string;

  @IsOptional()
  @IsNumberString()
  GITHUB_FILE_TIMEOUT_MS?: string;

  @IsOptional()
  @IsNumberString()
  GITHUB_AUTO_UNPUBLISH_STALE_COUNT?: string;

  @IsOptional()
  @IsString()
  OSS_ENDPOINT?: string;

  @IsOptional()
  @IsString()
  OSS_PUBLIC_BASE_URL?: string;

  @IsOptional()
  @IsNumberString()
  OSS_HEAD_BUCKET_TIMEOUT?: string;

  @IsOptional()
  @IsBooleanString()
  ENABLE_OSS_READY_CHECK?: string;

  @IsOptional()
  @IsNumberString()
  BCRYPT_COST?: string;

  @IsOptional()
  @IsNumberString()
  THROTTLE_TTL?: string;

  @IsOptional()
  @IsNumberString()
  THROTTLE_LIMIT?: string;

  @IsOptional()
  @IsNumberString()
  BODY_LIMIT_BYTES?: string;

  @IsOptional()
  @IsNumberString()
  PAYLOAD_MAX_DEPTH?: string;

  @IsOptional()
  @IsNumberString()
  SHUTDOWN_GRACE_MS?: string;

  @IsOptional()
  @IsString()
  LOG_LEVEL?: string;

  @IsOptional()
  @IsNumberString()
  MAX_FEATURED_WORKS?: string;

  @IsOptional()
  @IsString()
  BACKEND_INTERNAL_URL?: string;

  @IsOptional()
  @IsString()
  NEXT_PUBLIC_API_URL?: string;
}

export interface EnvValidationFailure {
  readonly ok: false;
  readonly errors: ReadonlyArray<{ variable: string; reason: string }>;
}
export interface EnvValidationSuccess {
  readonly ok: true;
  readonly config: Record<string, string>;
}
export type EnvValidationResult = EnvValidationFailure | EnvValidationSuccess;

/**
 * Validate the full process.env in one pass. Returns ALL offenders (not just
 * the first), so the bootstrap block on stderr names every offending var.
 */
export function validateEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): EnvValidationResult {
  const errors: Array<{ variable: string; reason: string }> = [];

  // 1) class-validator pass
  const dto = plainToInstance(ConfigEnvironmentDto, env, {
    enableImplicitConversion: false,
  });
  const cvErrors = validateSync(dto, { skipMissingProperties: false });
  for (const err of cvErrors as ValidationError[]) {
    pushValidationError(err, errors);
  }

  const nodeEnv = (env.NODE_ENV ?? '').toLowerCase();
  const isProd = nodeEnv === 'production';

  // 2) Secret distinctness: JWT_ACCESS_SECRET !== JWT_REFRESH_SECRET
  if (
    typeof env.JWT_ACCESS_SECRET === 'string' &&
    typeof env.JWT_REFRESH_SECRET === 'string' &&
    env.JWT_ACCESS_SECRET.length >= 8 &&
    env.JWT_REFRESH_SECRET.length >= 8 &&
    env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET
  ) {
    errors.push({
      variable: 'JWT_ACCESS_SECRET/JWT_REFRESH_SECRET',
      reason: 'JWT_ACCESS_SECRET must differ from JWT_REFRESH_SECRET',
    });
  }

  // 3) Placeholder password rejection in production
  if (isProd) {
    if (
      typeof env.ADMIN_BOOTSTRAP_PASSWORD === 'string' &&
      PLACEHOLDER_PASSWORDS.has(env.ADMIN_BOOTSTRAP_PASSWORD)
    ) {
      errors.push({
        variable: 'ADMIN_BOOTSTRAP_PASSWORD',
        reason: 'placeholder value not allowed in production',
      });
    }
    if (
      typeof env.JWT_ACCESS_SECRET === 'string' &&
      PLACEHOLDER_SECRETS.has(env.JWT_ACCESS_SECRET)
    ) {
      errors.push({
        variable: 'JWT_ACCESS_SECRET',
        reason: 'placeholder value not allowed in production',
      });
    }
    if (
      typeof env.JWT_REFRESH_SECRET === 'string' &&
      PLACEHOLDER_SECRETS.has(env.JWT_REFRESH_SECRET)
    ) {
      errors.push({
        variable: 'JWT_REFRESH_SECRET',
        reason: 'placeholder value not allowed in production',
      });
    }
    if (
      typeof env.ALLOWED_ORIGINS === 'string' &&
      env.ALLOWED_ORIGINS.trim() === ''
    ) {
      errors.push({
        variable: 'ALLOWED_ORIGINS',
        reason: 'must not be empty in production',
      });
    }
  }

  // 4) BCRYPT_COST minimum (12 enforced at boot)
  const bcryptCost = Number.parseInt(env.BCRYPT_COST ?? '12', 10);
  if (!Number.isFinite(bcryptCost) || bcryptCost < 12) {
    errors.push({
      variable: 'BCRYPT_COST',
      reason: 'must be an integer >= 12',
    });
  }

  // 5) CORS_ORIGIN/FRONTEND_ORIGIN must not be "*"
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
  return { ok: true, config: { ...env } as Record<string, string> };
}

function pushValidationError(
  err: ValidationError,
  out: Array<{ variable: string; reason: string }>,
): void {
  if (err.constraints) {
    const reasons = Object.values(err.constraints);
    out.push({
      variable: err.property,
      reason: reasons.join('; ') || 'invalid',
    });
  }
  if (err.children && err.children.length > 0) {
    for (const child of err.children) pushValidationError(child, out);
  }
}

// re-export IsInt/Max/Min/MaxLength for typing parity
export { IsInt, Max, Min, MaxLength };
