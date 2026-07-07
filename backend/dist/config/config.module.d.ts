export declare class EnvValidationError extends Error {
    readonly errors: ReadonlyArray<{
        variable: string;
        reason: string;
    }>;
    constructor(errors: ReadonlyArray<{
        variable: string;
        reason: string;
    }>);
}
export declare class ConfigModule {
}
