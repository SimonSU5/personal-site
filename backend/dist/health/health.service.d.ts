import { Connection } from 'mongoose';
import { AppConfigService } from '../config/config.service';
export type DepState = 'up' | 'down' | 'skipped';
export interface DependencyCheck {
    status: DepState;
    latencyMs?: number;
    error?: string;
}
export interface ReadinessReport {
    mongo: DependencyCheck;
    oss: DependencyCheck;
}
export declare class HealthService {
    private readonly connection;
    private readonly config;
    private readonly logger;
    constructor(connection: Connection, config: AppConfigService);
    checkMongo(perDepTimeoutMs: number): Promise<DependencyCheck>;
    checkOss(perDepTimeoutMs: number): Promise<DependencyCheck>;
    runReadinessChecks(): Promise<ReadinessReport>;
    isReady(report: ReadinessReport): boolean;
    private withTimeout;
}
