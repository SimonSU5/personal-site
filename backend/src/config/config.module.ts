import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { AppConfigService } from './config.service';
import { validateEnvironment } from './env.validation';

/**
 * ConfigModule — validated, fail-closed environment.
 *
 * Uses @nestjs/config with a custom `validate` hook that runs the full
 * class-validator + cross-field checks (distinct JWT secrets, hex encryption
 * key, placeholder rejection, no `*` CORS). If validation fails, the hook
 * throws an aggregated error; main.ts catches it and `process.exit(1)`s
 * with a single offending-var block on stderr (SPEC §2.5 + FR-9).
 */

export class EnvValidationError extends Error {
  constructor(
    public readonly errors: ReadonlyArray<{ variable: string; reason: string }>,
  ) {
    super('Environment validation failed');
    this.name = 'EnvValidationError';
  }
}

const validate = (raw: Record<string, unknown>): Record<string, string> => {
  // @nestjs/config passes `process.env`-like record. Hand it to our validator.
  const result = validateEnvironment(raw as NodeJS.ProcessEnv);
  if (!result.ok) {
    throw new EnvValidationError(result.errors);
  }
  return result.config;
};

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // We validate eagerly so the failure surfaces before Nest boots the rest.
      validate,
      // We do NOT use ignoreEnvFile: the operator may pass .env or env_file.
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService, NestConfigModule],
})
export class ConfigModule {}
