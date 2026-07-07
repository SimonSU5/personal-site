import { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { RequestIdMiddleware, REQUEST_ID_HEADER } from './common/request-id.middleware';
export declare class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void;
}
export { RequestIdMiddleware, REQUEST_ID_HEADER };
