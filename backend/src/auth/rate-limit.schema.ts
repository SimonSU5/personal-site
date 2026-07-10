import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * SPEC §4.2 / §2.8 — `rateLimits` collection (per-route domain throttle).
 *
 * Cluster-safe (NO in-memory `Map` anywhere). Each doc is one counter bucket
 * addressed by a composite `key`:
 *   - `login_req:<ip>`          request-rate 5/15s/IP
 *   - `login_fail_ip:<ip>`      IP failure-lockout 10 fails/15min -> 15min
 *   - `login_fail_user:<ident>` username failure-lockout 5 fails/15min -> 15min
 *   - `refresh_req:<ip>`        refresh request-rate 30/60s/IP
 *
 * TTL index with `expireAfterSeconds:0` auto-evicts the bucket the moment its
 * `expiresAt` (window end / lockout end) passes, so counters self-reset.
 *
 * | field     | type                                       | notes |
 * |-----------|--------------------------------------------|-------|
 * | key       | string (bucket+identifier)                 | indexed |
 * | count     | int                                        | |
 * | expiresAt | Date (window end)                          | TTL expireAfterSeconds:0 |
 * | updatedAt | Date                                       | |
 */

@Schema({
  collection: 'rateLimits',
  // SPEC lists only `updatedAt` for this collection (no createdAt).
  timestamps: { createdAt: false, updatedAt: 'updatedAt' },
  minimize: false,
})
export class RateLimit extends Document {
  @Prop({ type: String, required: true, index: true })
  key!: string;

  @Prop({ type: Number, required: true, default: 0 })
  count!: number;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  declare updatedAt: Date;
}

export const RateLimitSchema = SchemaFactory.createForClass(RateLimit);

// Auto-evict expired buckets the instant `expiresAt` passes.
RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
