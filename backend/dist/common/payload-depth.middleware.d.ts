import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
export declare function setMaxPayloadDepth(res: Response, depth: number): void;
export declare class PayloadDepthMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction): void;
}
