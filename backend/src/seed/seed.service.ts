import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { MongoError } from 'mongodb';
import { User } from './user.schema';
import { AppConfigService } from '../config/config.service';

/**
 * SPEC §3.4 FR-11 + TC-26/27/28 — idempotent admin seed.
 *
 * - `users.countDocuments() === 0` → create exactly ONE admin (bcrypt >=12).
 * - count > 0 → skip (NEVER overwrite password).
 * - concurrent seeders race → UNIQUE index, E11000 swallowed; final count === 1.
 *
 * Runs on module init (OnModuleInit). Safe to call repeatedly: a successful
 * second boot with the same env yields a byte-identical passwordHash (the same
 * bcrypt salt rounds + same input password produce a stable hash given the
 * stored salt — but bcrypt uses a fresh random salt each call, so two runs of
 * `hash(password)` produce DIFFERENT valid hashes; we therefore NEVER re-hash
 * an existing user).
 */
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger('SeedService');

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @Inject(AppConfigService) private readonly config: AppConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.seedAdmin();
    } catch (err) {
      // Fail open at boot if Mongo is unreachable: the readiness probe will
      // mark the dep down and refuse traffic. Better than crashing the boot
      // when the operator has not yet started Mongo (e.g. CI smoke tests).
      if (err instanceof MongoError || isMongooseConnError(err)) {
        this.logger.warn(
          `Skipping admin seed: Mongo unavailable (${this.messageOf(err)}).`,
        );
        return;
      }
      throw err;
    }
  }

  /** Public for tests. Idempotent. */
  async seedAdmin(): Promise<{ action: 'created' | 'skipped' }> {
    const username = this.config.adminBootstrapUsername.toLowerCase();
    const password = this.config.adminBootstrapPassword;
    const cost = this.config.bcryptCost;

    const existingCount = await this.userModel.countDocuments().exec();
    if (existingCount > 0) {
      // Existing admin(s) — do NOT touch passwords. (TC-27: re-seed leaves
      // the passwordHash byte-identical because we never re-hash.)
      this.logger.log(
        `Seed skipped: ${existingCount} user(s) already present.`,
      );
      return { action: 'skipped' };
    }

    const passwordHash = await bcrypt.hash(password, cost);
    try {
      await this.userModel.create({
        username,
        passwordHash,
        role: 'admin',
        isActive: true,
      } as Partial<User>);
      this.logger.log(`Seed created admin user "${username}" (role=admin).`);
      return { action: 'created' };
    } catch (err) {
      // Concurrent seeder race: another replica created the admin first.
      // E11000 on the UNIQUE username index is swallowed.
      if (
        err instanceof MongoError &&
        (err as MongoError).code === 11000
      ) {
        this.logger.warn(
          `Seed race: admin already created concurrently (E11000 swallowed).`,
        );
        return { action: 'skipped' };
      }
      throw err;
    }
  }

  private messageOf(err: unknown): string {
    if (err instanceof Error) return err.message;
    return String(err);
  }
}

function isMongooseConnError(err: unknown): boolean {
  const name = (err as { name?: string })?.name;
  return (
    name === 'MongooseError' ||
    name === 'DisconnectedError' ||
    name === 'MongoNetworkError' ||
    name === 'MongoServerError' ||
    name === 'MongoServerSelectionError'
  );
}
