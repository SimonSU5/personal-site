import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { AppConfigService } from '../config/config.service';
import { User, UserSchema } from '../seed/user.schema';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RateLimit, RateLimitSchema } from './rate-limit.schema';
import { RefreshToken, RefreshTokenSchema } from './refresh-token.schema';

/**
 * SPEC §4 — Auth domain module.
 *
 * Owns `refreshTokens` + `rateLimits` collections and re-uses the `users`
 * collection (owned by the scaffolding SeedModule). Provides `AuthService` +
 * `JwtStrategy`, and re-exports the access-control primitives every admin
 * feature domain consumes: `JwtAuthGuard`, `@Public()`, `@CurrentUser()`.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: RateLimit.name, schema: RateLimitSchema },
      { name: User.name, schema: UserSchema },
    ]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        // Signing secret + algorithm. The per-call `expiresIn` (a number of
        // seconds, see AuthService.signAccess) is supplied at sign time so the
        // ttl stays a typed integer end-to-end.
        secret: config.jwtAccessSecret,
        signOptions: { algorithm: 'HS256' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}

// Re-export the access-control primitives so consumers can import them from
// the auth barrel (e.g. `import { JwtAuthGuard, Public } from '../auth'`).
export { JwtAuthGuard } from './jwt-auth.guard';
export { Public, IS_PUBLIC_KEY } from './public.decorator';
export { CurrentUser } from './current-user.decorator';
