import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema } from 'mongoose';

/**
 * SPEC §3.2 — `throttler` collection (global API throttle).
 *
 * Composite PK `_id = '${routeName}:${tracker}'` (tracker = X-Forwarded-For
 * first/leftmost entry). TTL index on `expiresAt` with `expireAfterSeconds:0`
 * auto-evicts expired buckets. `blockedUntil` set when the limit is exceeded.
 *
 * Cluster-safe (no in-memory `Map`).
 *
 * NOTE: we do NOT extend `Document<ObjectId>` here because the throttler uses a
 * string composite `_id`. Mongoose's `SchemaFactory.createForClass` infers the
 * document type from the `@Schema({_id: String})` option, so we keep this a
 * plain class and export a `HydratedDocument`-flavored type alias for callers.
 */
@Schema({
  collection: 'throttler',
  timestamps: false,
})
export class ThrottlerRecord {
  @Prop({ type: String, required: true })
  declare _id: string; // `${routeName}:${tracker}` — string composite PK

  @Prop({ type: String, required: true, index: true })
  tracker!: string;

  @Prop({ type: String, required: true })
  routeName!: string;

  @Prop({ type: Number, required: true, default: 1 })
  totalHits!: number;

  @Prop({
    type: Date,
    required: true,
  })
  expiresAt!: Date;

  @Prop({ type: Date, required: false })
  blockedUntil?: Date | null;

  @Prop({ type: Date, required: true })
  updatedAt!: Date;
}

export const ThrottlerSchema = SchemaFactory.createForClass(ThrottlerRecord);

// TTL index — auto-evict expired buckets the moment `expiresAt` passes.
ThrottlerSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Per-tracker aggregation index.
ThrottlerSchema.index({ tracker: 1, routeName: 1 });

export type ThrottlerModel = Model<ThrottlerRecord>;

/** Build the composite `_id` used by the Mongo throttler store. */
export function buildThrottleKey(routeName: string, tracker: string): string {
  return `${routeName}:${tracker}`;
}

/** Extract the XFF-leftmost tracker from an Express request. */
export function trackerFromRequest(req: {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
}): string {
  const xff = req.headers?.['x-forwarded-for'];
  const raw = Array.isArray(xff) ? xff[0] : xff;
  if (typeof raw === 'string' && raw.length > 0) {
    return raw.split(',')[0].trim();
  }
  return req.ip ?? 'unknown';
}

// Help TS keep the Mongoose typing import used even when tree-shaken.
void MongooseSchema;
