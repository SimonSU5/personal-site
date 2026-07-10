import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * SPEC §4.2 — `refreshTokens` collection.
 *
 * The refresh token is an OPAQUE 64-byte base64url value carried in the
 * `refresh_token` cookie. Mongo stores ONLY `sha256(raw).hex()` (`tokenHash`);
 * a DB dump therefore yields no usable tokens. Tokens are family-scoped: each
 * login starts a new `familyId`, and rotations inherit the family so a replay
 * can revoke the whole chain in one `updateMany`.
 *
 * | field           | type                                            | notes |
 * |-----------------|-------------------------------------------------|-------|
 * | tokenHash       | string (sha256 hex, 64)                         | UNIQUE |
 * | familyId        | string (UUID v4)                                | indexed; per-login chain |
 * | userId          | ObjectId ref users                              | indexed |
 * | consumed        | boolean                                         | default false |
 * | rotatedFrom     | ObjectId?                                       | predecessor _id (forensic chain-walk) |
 * | revokedReason   | 'logout'|'replay_detected'|'family_expired'|'partial_write'? | null until revoked |
 * | expiresAt       | Date (issued + 7d, sliding)                     | TTL expireAfterSeconds:604800 (auto-purge 7d AFTER expiry) |
 * | familyExpiresAt | Date (issued + 30d, ABSOLUTE cap)               | inherited across rotations |
 * | consumedAt      | Date?                                           | |
 * | revokedAt       | Date?                                           | |
 * | createdAt       | Date                                            | |
 */

export type RefreshRevokedReason =
  | 'logout'
  | 'replay_detected'
  | 'family_expired'
  | 'partial_write';

@Schema({
  collection: 'refreshTokens',
  // SPEC lists only `createdAt` for this collection (no updatedAt).
  timestamps: { createdAt: 'createdAt', updatedAt: false },
  minimize: false,
})
export class RefreshToken extends Document {
  @Prop({ type: String, required: true, unique: true })
  tokenHash!: string;

  @Prop({ type: String, required: true, index: true })
  familyId!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Boolean, required: true, default: false })
  consumed!: boolean;

  @Prop({ type: Types.ObjectId, required: false, default: null })
  rotatedFrom?: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: ['logout', 'replay_detected', 'family_expired', 'partial_write'],
    required: false,
    default: null,
  })
  revokedReason?: RefreshRevokedReason | null;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  @Prop({ type: Date, required: true })
  familyExpiresAt!: Date;

  @Prop({ type: Date, required: false, default: null })
  consumedAt?: Date | null;

  @Prop({ type: Date, required: false, default: null })
  revokedAt?: Date | null;

  declare createdAt: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

// TTL index — auto-purge each doc 7d (604800s) AFTER its `expiresAt` value
// passes, leaving a queryable grace window for replay forensics.
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 604800 });
// Compound index to make whole-family revoke (updateMany {familyId, consumed:false})
// efficient — covered by familyId alone for typical sizes, but co-indexing
// consumed supports the unconsumed-only filter.
RefreshTokenSchema.index({ familyId: 1, consumed: 1 });
