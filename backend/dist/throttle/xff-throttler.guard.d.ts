import { ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
export declare class XffThrottlerGuard extends ThrottlerGuard {
    protected getTracker(req: Request & {
        protocol?: string;
    }): Promise<string>;
    protected shouldThrow(_err: Error): Promise<boolean>;
    protected shouldSkip(_context: ExecutionContext): Promise<boolean>;
}
