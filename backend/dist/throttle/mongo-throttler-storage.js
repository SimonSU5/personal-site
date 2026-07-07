"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoThrottlerStorage = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongodb_1 = require("mongodb");
const throttler_schema_1 = require("./throttler.schema");
const E11000 = 11000;
let MongoThrottlerStorage = class MongoThrottlerStorage {
    model;
    constructor(model) {
        this.model = model;
    }
    async onModuleInit() {
        try {
            await this.model.createCollection();
        }
        catch (err) {
            const code = err?.code;
            if (code !== undefined && code !== 48) {
            }
        }
    }
    async increment(key, ttl, limit, blockDuration, throttlerName) {
        const { tracker, routeName } = splitKey(key, throttlerName);
        const docId = (0, throttler_schema_1.buildThrottleKey)(routeName, tracker);
        const now = Date.now();
        const ttlMs = ttl;
        const expiresAt = new Date(now + ttlMs);
        let record;
        try {
            record = await this.upsertHit(docId, tracker, routeName, expiresAt, now);
        }
        catch (err) {
            if (err instanceof mongodb_1.MongoError && err.code === E11000) {
                record = await this.upsertHit(docId, tracker, routeName, expiresAt, now);
            }
            else {
                throw err;
            }
        }
        const totalHits = record?.totalHits ?? 1;
        const isBlocked = totalHits > limit;
        const blockExpiresAt = isBlocked ? new Date(now + blockDuration) : null;
        if (isBlocked) {
            await this.model.updateOne({ _id: docId }, { $set: { blockedUntil: blockExpiresAt } });
        }
        return {
            totalHits,
            timeToExpire: Math.max(0, (record?.expiresAt?.getTime() ?? expiresAt.getTime()) - now),
            isBlocked,
            timeToBlockExpire: isBlocked ? blockDuration : 0,
        };
    }
    async upsertHit(docId, tracker, routeName, expiresAt, nowMs) {
        const existing = (await this.model.findById(docId).lean().exec());
        if (existing && existing.expiresAt.getTime() > nowMs) {
            return (await this.model
                .findByIdAndUpdate(docId, {
                $inc: { totalHits: 1 },
                $set: { updatedAt: new Date(nowMs) },
            }, { new: true })
                .lean()
                .exec());
        }
        return (await this.model
            .findByIdAndUpdate(docId, {
            $set: {
                tracker,
                routeName,
                totalHits: 1,
                expiresAt,
                blockedUntil: null,
                updatedAt: new Date(nowMs),
            },
        }, { upsert: true, new: true, overwrite: true })
            .lean()
            .exec());
    }
};
exports.MongoThrottlerStorage = MongoThrottlerStorage;
exports.MongoThrottlerStorage = MongoThrottlerStorage = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(throttler_schema_1.ThrottlerRecord.name)),
    __metadata("design:paramtypes", [Object])
], MongoThrottlerStorage);
function splitKey(key, fallbackRoute) {
    const idx = key.lastIndexOf('-');
    if (idx > -1) {
        return {
            tracker: key.slice(0, idx),
            routeName: key.slice(idx + 1) || fallbackRoute,
        };
    }
    return { tracker: key, routeName: fallbackRoute };
}
//# sourceMappingURL=mongo-throttler-storage.js.map