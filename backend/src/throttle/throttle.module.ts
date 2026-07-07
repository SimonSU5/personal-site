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
    ThrottleStorageModule,
    ThrottlerModule.forRootAsync({
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
