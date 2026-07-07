import { readFileSync } from 'fs';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Jest setupFiles entry — runs BEFORE any test file is imported (and therefore
 * before any `import AppModule` triggers @nestjs/config's eager `validate()`
 * against process.env). Seeds a complete, valid test environment so the
 * fail-closed ConfigModule (SPEC §2.5) accepts boot under test.
 *
 * MONGO_URI is read from the file written by global-setup.ts (the in-memory
 * replica set). All other vars are fixed test fixtures.
 *
 * SYSTEM_BINARY: point mongodb-memory-server at a pre-staged mongod binary
 * (backend/.cache/mongo/mongod) so the in-memory replset starts WITHOUT a
 * network download. The binary is platform-specific and gitignored; CI must
 * stage it (or set SYSTEM_BINARY itself).
 */
const SYSTEM_BINARY = join(__dirname, '..', '.cache', 'mongo', 'mongod');
if (existsSync(SYSTEM_BINARY) && process.env.SYSTEM_BINARY === undefined) {
  process.env.SYSTEM_BINARY = SYSTEM_BINARY;
}
const VALID_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  PORT: '0',
  HOST: '127.0.0.1',
  MONGO_DB_NAME: 'surong_test',
  JWT_ACCESS_SECRET: 'a'.repeat(48),
  JWT_REFRESH_SECRET: 'b'.repeat(48),
  ALLOWED_ORIGINS: 'http://localhost:3000',
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

let mongoUri = '';
try {
  mongoUri = readFileSync('/tmp/surong-test-mongo-uri', 'utf8').trim();
} catch {
  // global-setup hasn't run yet (e.g. running a single spec via a non-jest
  // runner); fall back to a placeholder URI. The connect will then fail loudly
  // rather than silently — preferable for diagnosing setup issues.
  mongoUri = 'mongodb://127.0.0.1:27017/surong_test?replSet=rs0';
}

for (const [k, v] of Object.entries(VALID_ENV)) {
  if (process.env[k] === undefined) process.env[k] = v;
}
if (process.env.MONGO_URI === undefined) process.env.MONGO_URI = mongoUri;
