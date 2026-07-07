import { OnModuleInit } from '@nestjs/common';
import { ThrottlerModel } from './throttler.schema';
export interface ThrottlerStorageRecord {
    totalHits: number;
    timeToExpire: number;
    isBlocked: boolean;
    timeToBlockExpire: number;
}
export declare class MongoThrottlerStorage implements OnModuleInit {
    private readonly model;
    constructor(model: ThrottlerModel);
    onModuleInit(): Promise<void>;
    increment(key: string, ttl: number, limit: number, blockDuration: number, throttlerName: string): Promise<ThrottlerStorageRecord>;
    private upsertHit;
}
