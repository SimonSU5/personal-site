import { Model, Schema as MongooseSchema } from 'mongoose';
export declare class ThrottlerRecord {
    _id: string;
    tracker: string;
    routeName: string;
    totalHits: number;
    expiresAt: Date;
    blockedUntil?: Date | null;
    updatedAt: Date;
}
export declare const ThrottlerSchema: MongooseSchema<ThrottlerRecord, Model<ThrottlerRecord, any, any, any, import("mongoose").Document<unknown, any, ThrottlerRecord, any, {}> & ThrottlerRecord & Required<{
    _id: string;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ThrottlerRecord, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<ThrottlerRecord>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ThrottlerRecord> & Required<{
    _id: string;
}> & {
    __v: number;
}>;
export type ThrottlerModel = Model<ThrottlerRecord>;
export declare function buildThrottleKey(routeName: string, tracker: string): string;
export declare function trackerFromRequest(req: {
    headers?: Record<string, string | string[] | undefined>;
    ip?: string;
}): string;
