import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Model } from 'mongoose';

/**
 * SPEC §3.2 — `users` core seed contract (owned here, consumed by Auth).
 *
 * | field         | type                                | required | index   |
 * |---------------|-------------------------------------|----------|---------|
 * | username      | string /^[A-Za-z0-9_.-]{3,32}$/     | yes      | UNIQUE  |
 * | passwordHash  | string (bcrypt, cost >=12)          | yes      | —       |
 * | role          | 'admin' | 'user'                    | yes      | —       |
 * | isActive      | boolean                             | yes      | —       |
 * | createdAt     | Date                                | yes      | —       |
 * | updatedAt     | Date                                | yes      | —       |
 *
 * `passwordHash` is NEVER selected in public reads; NEVER logged.
 */

export type UserRole = 'admin' | 'user';

@Schema({
  collection: 'users',
  timestamps: true,
  minimize: false,
})
export class User extends Document {
  @Prop({
    type: String,
    required: true,
    unique: true,
    match: [/^[A-Za-z0-9_.-]{3,32}$/, '{VALUE} is not a valid username'],
  })
  username!: string;

  // NEVER include `passwordHash` in public projections. Use a select:false
  // lean projection and explicit `select('+passwordHash')` only when needed.
  @Prop({ type: String, required: true, select: false })
  passwordHash!: string;

  @Prop({ type: String, enum: ['admin', 'user'] as const, required: true })
  role!: UserRole;

  @Prop({ type: Boolean, required: true, default: true })
  isActive!: boolean;

  declare createdAt: Date;
  declare updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

export type UserModel = Model<User>;
