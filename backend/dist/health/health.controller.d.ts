import { HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { HealthService, DepState } from './health.service';
import { AppConfigService } from '../config/config.service';
export declare class HealthController {
    private readonly health;
    private readonly config;
    constructor(health: HealthService, config: AppConfigService);
    liveness(): {
        status: 'alive';
        timestamp: string;
        uptimeSeconds: number;
    };
    readiness(_req: Request): Promise<{
        status: 'ready';
        details: {
            mongo: {
                status: DepState;
            };
            oss: {
                status: DepState;
            };
        };
    }>;
}
export declare class RootController {
    private readonly config;
    constructor(config: AppConfigService);
    identity(): {
        name: string;
        apiVersion: 'v1';
        prefix: '/api/v1';
        status: 'alive';
        timestamp: string;
    };
}
export declare class RawHealthController {
    rawLiveness(): string;
}
export { HttpException, HttpStatus };
