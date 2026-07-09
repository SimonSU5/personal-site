import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/config.service';
import {
  ThrottlerRecord,
  ThrottlerSchema,
} from './throttler.schema';
import { MongoThrottlerStorage } from './mongo-throttler-storage';
import { XffThrottlerGuard } from './xff-throttler.guard';

/**
 * Storage sub-module — provides MongoThrottlerStorage with its Mongoose model.
 * Must be defined separately so ThrottlerModule.forRootAsync can inject the
 * storage instance into its async factory.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ThrottlerRecord.name, schema: ThrottlerSchema },
    ]),
  ],
  providers: [MongoThrottlerStorage],
  exports: [MongoThrottlerStorage],
})
export class ThrottleStorageModule {}

/**
 * SPEC §2.8 — Global API throttle (Mongo-backed, cluster-safe).
 *
 * - ttl/limit: THROTTLE_TTL (s) + THROTTLE_LIMIT env.
 * - tracker: X-Forwarded-For leftmost entry (XffThrottlerGuard).
 * - storage: writes the `throttler` collection with TTL index on `expiresAt`.
 * - fail-closed: storage unreachable → 503 DEPENDENCY_DOWN (global filter).
 */
@Module({
  imports: [
    ConfigModule,
    // forRootAsync resolves its `inject` against THIS module's imports, so the
    // storage's host module must be declared here (a sibling declaration is
    // NOT visible to the async factory's DI scope).
    ThrottleStorageModule,
    ThrottlerModule.forRootAsync({
      imports: [ThrottleStorageModule],
      inject: [MongoThrottlerStorage, AppConfigService],
      useFactory: (storage: MongoThrottlerStorage, config: AppConfigService) => ({
        throttlers: [
          {
            // Throttler v6 ttl is in milliseconds.
            ttl: config.throttleTtlSeconds * 1000,
            limit: config.throttleLimit,
          },
        ],
        storage,
        // Override the default key generator. The default returns a sha256
        // hash of `${ClassName}-${handlerName}-${name}-${tracker}`, which loses
        // the tracker IP — so the throttler doc would store a meaningless hash
        // instead of the XFF IP (SPEC §3.2). Our key keeps tracker readable so
        // MongoThrottlerStorage can persist it for per-IP aggregation.
        generateKey: (_ctx, tracker, name) =>
          `${name || 'default'}:${tracker}`,
      }),
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: XffThrottlerGuard,
    },
  ],
  exports: [ThrottleStorageModule],
})
export class ThrottleModule {}
