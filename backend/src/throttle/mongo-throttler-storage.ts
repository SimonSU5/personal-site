import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { MongoError } from 'mongodb';
import { ThrottlerRecord, ThrottlerModel, buildThrottleKey } from './throttler.schema';

/**
 * Shape returned by `increment()` — mirrors @nestjs/throttler v6's
 * ThrottlerStorageRecord (not re-exported from the package root, so we keep a
 * structural copy here; it is assignment-compatible with the real type).
 */
export interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/**
 * SPEC §2.8 — Mongo-backed cluster-safe throttler storage for the GLOBAL API
 * throttle. Writes the `throttler` collection (composite key
 * `${routeName}:${tracker}`, TTL index on `expiresAt`).
 *
 * Fail-closed: if the store is unreachable, `increment()` rejects with the
 * underlying MongoError so the ThrottlerGuard surfaces a 503 to the client
 * (mapped by the global exception filter as DEPENDENCY_DOWN). NEVER silently
 * allows a request when the store is down.
 *
 * The throttler key passed by @nestjs/throttler v6 is already in the form
 * `${tracker}-${throttlerName}`; we re-key it as `${routeName}:${tracker}` to
 * match the SPEC §3.2 schema.
 *
 * NOTE: `@nestjs/throttler` v6 exports `ThrottlerStorage` as a `unique symbol`
 * injection token (NOT a class), so this store is a plain class that satisfies
 * the `ThrottlerStorage` interface structurally. It is bound to the token via
 * `ThrottleModule`'s `useClass` provider.
 */

const E11000 = 11000;

@Injectable()
export class MongoThrottlerStorage implements OnModuleInit {
  constructor(
    @InjectModel(ThrottlerRecord.name) private readonly model: ThrottlerModel,
  ) {}

  async onModuleInit(): Promise<void> {
    // Best-effort index sync; TTL index lives on the schema but we ensure the
    // collection exists so reads/writes don't fail at first hit.
    try {
      await this.model.createCollection();
    } catch (err) {
      // Already exists or collection auto-create will handle it.
      const code = (err as MongoError)?.code;
      if (code !== undefined && code !== 48 /* NamespaceExists */) {
        // Non-fatal: collection will be auto-created on first write.
      }
    }
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    // @nestjs/throttler v6 passes key=`${tracker}-${throttlerName}`. Split and
    // re-format to match SPEC schema. The split is on the LAST `-` of the
    // throttlerName segment to keep IPv6 / dotted-quad IPs intact.
    const { tracker, routeName } = splitKey(key, throttlerName);
    const docId = buildThrottleKey(routeName, tracker);
    const now = Date.now();
    const ttlMs = ttl; // v6 passes ms
    const expiresAt = new Date(now + ttlMs);

    let record: ThrottlerRecord | null;
    try {
      record = await this.upsertHit(docId, tracker, routeName, expiresAt, now);
    } catch (err) {
      // Retry once on duplicate-key race (concurrent first-hit upserts).
      if (err instanceof MongoError && err.code === E11000) {
        record = await this.upsertHit(docId, tracker, routeName, expiresAt, now);
      } else {
        throw err;
      }
    }

    const totalHits = record?.totalHits ?? 1;
    const isBlocked = totalHits > limit;
    const blockExpiresAt = isBlocked ? new Date(now + blockDuration) : null;
    if (isBlocked) {
      await this.model.updateOne(
        { _id: docId },
        { $set: { blockedUntil: blockExpiresAt } },
      );
    }

    return {
      totalHits,
      timeToExpire: Math.max(
        0,
        (record?.expiresAt?.getTime() ?? expiresAt.getTime()) - now,
      ),
      isBlocked,
      timeToBlockExpire: isBlocked ? blockDuration : 0,
    };
  }

  /**
   * Atomic-ish hit upsert. Race window (two first-hits) is bounded by the
   * `_id` UNIQUE constraint; the loser hits E11000 and the caller retries,
   * which then routes through the `$inc` branch.
   */
  private async upsertHit(
    docId: string,
    tracker: string,
    routeName: string,
    expiresAt: Date,
    nowMs: number,
  ): Promise<ThrottlerRecord | null> {
    const existing = (await this.model.findById(docId).lean().exec()) as
      | (ThrottlerRecord & { expiresAt: Date })
      | null;
    if (existing && existing.expiresAt.getTime() > nowMs) {
      // Bucket live — bump counter atomically.
      return (await this.model
        .findByIdAndUpdate(
          docId,
          {
            $inc: { totalHits: 1 },
            $set: { updatedAt: new Date(nowMs) },
          },
          { new: true },
        )
        .lean()
        .exec()) as ThrottlerRecord | null;
    }
    // Bucket expired or absent — reset.
    return (await this.model
      .findByIdAndUpdate(
        docId,
        {
          $set: {
            tracker,
            routeName,
            totalHits: 1,
            expiresAt,
            blockedUntil: null,
            updatedAt: new Date(nowMs),
          },
        },
        { upsert: true, new: true, overwrite: true },
      )
      .lean()
      .exec()) as ThrottlerRecord | null;
  }
}

function splitKey(
  key: string,
  fallbackRoute: string,
): { tracker: string; routeName: string } {
  // Our custom generateKey (see throttle.module.ts) produces
  // `${throttlerName}:${tracker}` — split on the FIRST ':' so IPv6/bracketed
  // trackers (which can contain ':') survive as the tracker segment. The
  // leading segment (throttler name) never contains ':'.
  const idx = key.indexOf(':');
  if (idx > -1) {
    return {
      routeName: key.slice(0, idx) || fallbackRoute,
      tracker: key.slice(idx + 1),
    };
  }
  return { tracker: key, routeName: fallbackRoute };
}
