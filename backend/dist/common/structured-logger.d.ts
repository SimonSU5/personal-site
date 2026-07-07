import { LoggerService, LogLevel } from '@nestjs/common';
export interface LogContext {
    requestId?: string;
    userId?: string | null;
    event?: string;
    [key: string]: unknown;
}
export declare class StructuredLogger implements LoggerService {
    private readonly enabled;
    private readonly isProd;
    constructor();
    private emit;
    log(message: unknown, context?: LogContext): void;
    error(message: unknown, context?: LogContext): void;
    warn(message: unknown, context?: LogContext): void;
    debug(message: unknown, context?: LogContext): void;
    verbose(message: unknown, context?: LogContext): void;
    fatal(message: unknown, context?: LogContext): void;
    flush(): Promise<void>;
    isLevelEnabled(level: LogLevel): boolean;
    redact(value: unknown): string;
}
export declare const structuredLogger: StructuredLogger;
