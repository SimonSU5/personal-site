import {
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from './config/config.module';
import { AppConfigService } from './config/config.service';
import { HealthModule } from './health/health.module';
import { ThrottleModule } from './throttle/throttle.module';
import { SeedModule } from './seed/seed.module';
import {
  RequestIdMiddleware,
  REQUEST_ID_HEADER,
} from './common/request-id.middleware';
import { PayloadDepthMiddleware } from './common/payload-depth.middleware';
import { GlobalExceptionFilter } from './common/exception.filter';
import { ResponseInterceptor } from './common/response.interceptor';

/**
 * Root AppModule.
 *
 * SPEC §2.7 — wires ConfigModule (validated), MongooseModule.forRootAsync
 * (Mongo as a 1-node replica set via MONGO_URI), ThrottlerModule (Mongo-
 * backed storage), EventEmitterModule, HealthController, SeedService.
 *
 * Global filter + interceptor are registered here (DI-aware via APP_TOKENS)
 * so the GlobalExceptionFilter can resolve HttpAdapterHost.
 */
@Module({
  imports: [
    ConfigModule,
    MongooseModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        const backoff = Math.min(config.mongoConnectBackoffMs, 16_000);
        const maxRetries = config.mongoConnectMaxRetries;
        return {
          uri: config.mongoUri,
          dbName: config.mongoDbName,
          // Mongoose 8 retry-on-connect behavior. The URI carries
          // ?replSet=... so transactions are available.
          serverSelectionTimeoutMS: backoff * Math.max(maxRetries, 1),
          retryAttempts: maxRetries,
          retryDelay: backoff,
          autoIndex: config.nodeEnv !== 'production',
          // Heartbeat / topology resilience for mid-flight drops so the
          // readiness probe can detect a node loss quickly.
          heartbeatFrequencyMS: 10_000,
        };
      },
    }),
    EventEmitterModule.forRoot({
      // Cluster-safe only when backed by a shared bus (out of scope v1).
      wildcard: true,
      maxListeners: 50,
    }),
    ThrottleModule,
    HealthModule,
    SeedModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // SPEC §2.7 — RequestIdMiddleware runs before PayloadDepthMiddleware so
    // payload-depth rejections still carry the X-Request-Id header on the
    // response. Order matters; applied for all routes.
    consumer
      .apply(RequestIdMiddleware, PayloadDepthMiddleware)
      .forRoutes('*');
  }
}

// Re-export for tests / external wiring.
export { RequestIdMiddleware, REQUEST_ID_HEADER };
