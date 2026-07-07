import { IsInt, Max, MaxLength, Min } from 'class-validator';
export type NodeEnv = 'development' | 'production' | 'test';
export declare const NODE_ENV_VALUES: readonly NodeEnv[];
export declare class ConfigEnvironmentDto {
    NODE_ENV: NodeEnv;
    MONGO_URI: string;
    MONGO_DB_NAME: string;
    JWT_ACCESS_SECRET: string;
    JWT_REFRESH_SECRET: string;
    ALLOWED_ORIGINS: string;
    GITHUB_ENCRYPTION_KEY: string;
    GITHUB_WEBHOOK_SECRET: string;
    OSS_REGION: string;
    OSS_BUCKET: string;
    OSS_ACCESS_KEY_ID: string;
    OSS_ACCESS_KEY_SECRET: string;
    FRONTEND_ORIGIN: string;
    ADMIN_BOOTSTRAP_USERNAME: string;
    ADMIN_BOOTSTRAP_PASSWORD: string;
    PORT?: string;
    HOST?: string;
    JWT_ACCESS_TTL?: string;
    JWT_REFRESH_TTL?: string;
    REFRESH_ABSOLUTE_LIFETIME_DAYS?: string;
    GITHUB_TOKEN?: string;
    GITHUB_REPO?: string;
    GITHUB_SYNC_CONCURRENCY?: string;
    GITHUB_FILE_TIMEOUT_MS?: string;
    GITHUB_AUTO_UNPUBLISH_STALE_COUNT?: string;
    OSS_ENDPOINT?: string;
    OSS_PUBLIC_BASE_URL?: string;
    OSS_HEAD_BUCKET_TIMEOUT?: string;
    ENABLE_OSS_READY_CHECK?: string;
    BCRYPT_COST?: string;
    THROTTLE_TTL?: string;
    THROTTLE_LIMIT?: string;
    BODY_LIMIT_BYTES?: string;
    PAYLOAD_MAX_DEPTH?: string;
    SHUTDOWN_GRACE_MS?: string;
    LOG_LEVEL?: string;
    MAX_FEATURED_WORKS?: string;
    BACKEND_INTERNAL_URL?: string;
    NEXT_PUBLIC_API_URL?: string;
}
export interface EnvValidationFailure {
    readonly ok: false;
    readonly errors: ReadonlyArray<{
        variable: string;
        reason: string;
    }>;
}
export interface EnvValidationSuccess {
    readonly ok: true;
    readonly config: Record<string, string>;
}
export type EnvValidationResult = EnvValidationFailure | EnvValidationSuccess;
export declare function validateEnvironment(env?: NodeJS.ProcessEnv): EnvValidationResult;
export { IsInt, Max, Min, MaxLength };
