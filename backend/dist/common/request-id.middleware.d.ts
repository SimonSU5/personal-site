import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
export declare const REQUEST_ID_HEADER = "x-request-id";
export declare const REQUEST_ID_STATE_KEY = "__requestId";
export interface RequestIdRequest extends Request {
    [REQUEST_ID_STATE_KEY]?: string;
}
export declare class RequestIdMiddleware implements NestMiddleware {
    use(req: RequestIdRequest, res: Response, next: NextFunction): void;
}
export declare function getRequestId(req: RequestIdRequest | undefined): string;
