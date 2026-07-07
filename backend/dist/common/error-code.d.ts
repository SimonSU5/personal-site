export declare const ErrorCode: {
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly BAD_REQUEST: "BAD_REQUEST";
    readonly PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE";
    readonly PAYLOAD_TOO_DEEP: "PAYLOAD_TOO_DEEP";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED";
    readonly TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS";
    readonly NOT_READY: "NOT_READY";
    readonly DEPENDENCY_DOWN: "DEPENDENCY_DOWN";
    readonly BIND_ERROR: "BIND_ERROR";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
};
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
export declare const HTTP_STATUS_BY_ERROR_CODE: Readonly<Record<ErrorCode, number>>;
export declare function isErrorCode(value: unknown): value is ErrorCode;
export declare function buildErrorBody(code: ErrorCode, message?: string, details?: unknown): {
    success: false;
    error: {
        code: ErrorCode;
        message?: string;
        details?: unknown;
    };
};
