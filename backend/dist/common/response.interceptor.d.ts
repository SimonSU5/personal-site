import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
export declare const RAW_RESPONSE_KEY = "surong:rawResponse";
export declare const RawResponse: () => import("@nestjs/common").CustomDecorator<string>;
export interface ApiResponse<T> {
    success: true;
    data: T | null;
}
export declare class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
    private readonly reflector;
    constructor(reflector: Reflector);
    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>>;
}
