/**
 * Jest setupFiles entry — runs BEFORE any test file is imported (and therefore
 * before any `import AppModule` triggers @nestjs/config's eager `validate()`
 * against process.env). Seeds a complete, valid test environment so the
 * fail-closed ConfigModule (SPEC §2.5) accepts boot under test.
 *
 * MONGO_URI defaults to the dev replica set started by the repo-root
 * `docker-compose.dev.yml` (`docker compose -f docker-compose.dev.yml up -d`).
 * Override with MONGO_URI env if pointing elsewhere. All other vars are fixed
 * test fixtures.
 */

const DEFAULT_MONGO_URI = 'mongodb://localhost:27017/surong_test?replicaSet=rs0';

const VALID_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  PORT: '0',
  HOST: '127.0.0.1',
  MONGO_DB_NAME: 'surong_test',
  JWT_ACCESS_SECRET: 'a'.repeat(48),
  JWT_REFRESH_SECRET: 'b'.repeat(48),
  // Intentionally DIFFERENT from FRONTEND_ORIGIN so tests can verify the
  // refresh-cookie endpoint reads ALLOWED_ORIGINS (not the CORS list). Keeping
  // them equal would mask the AC-13 bug (review residual #1).
  ALLOWED_ORIGINS: 'https://refresh-test.example',
  GITHUB_ENCRYPTION_KEY: '0123456789abcdef'.repeat(4),
  GITHUB_WEBHOOK_SECRET: 'whsec-test',
  OSS_REGION: 'oss-cn-test',
  OSS_BUCKET: 'surong-test',
  OSS_ACCESS_KEY_ID: 'AKIATEST',
  OSS_ACCESS_KEY_SECRET: 'SECRETTEST',
  FRONTEND_ORIGIN: 'http://localhost:3000',
  ADMIN_BOOTSTRAP_USERNAME: 'admin',
  ADMIN_BOOTSTRAP_PASSWORD: 'password-test-123',
  BCRYPT_COST: '12',
};

for (const [k, v] of Object.entries(VALID_ENV)) {
  if (process.env[k] === undefined) process.env[k] = v;
}
if (process.env.MONGO_URI === undefined) {
  process.env.MONGO_URI = process.env.MONGO_URI_TEST ?? DEFAULT_MONGO_URI;
}
