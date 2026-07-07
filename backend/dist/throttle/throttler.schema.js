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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThrottlerSchema = exports.ThrottlerRecord = void 0;
exports.buildThrottleKey = buildThrottleKey;
exports.trackerFromRequest = trackerFromRequest;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let ThrottlerRecord = class ThrottlerRecord {
    tracker;
    routeName;
    totalHits;
    expiresAt;
    blockedUntil;
    updatedAt;
};
exports.ThrottlerRecord = ThrottlerRecord;
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true }),
    __metadata("design:type", String)
], ThrottlerRecord.prototype, "_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, index: true }),
    __metadata("design:type", String)
], ThrottlerRecord.prototype, "tracker", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true }),
    __metadata("design:type", String)
], ThrottlerRecord.prototype, "routeName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true, default: 1 }),
    __metadata("design:type", Number)
], ThrottlerRecord.prototype, "totalHits", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: Date,
        required: true,
    }),
    __metadata("design:type", Date)
], ThrottlerRecord.prototype, "expiresAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, required: false }),
    __metadata("design:type", Object)
], ThrottlerRecord.prototype, "blockedUntil", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, required: true }),
    __metadata("design:type", Date)
], ThrottlerRecord.prototype, "updatedAt", void 0);
exports.ThrottlerRecord = ThrottlerRecord = __decorate([
    (0, mongoose_1.Schema)({
        collection: 'throttler',
        timestamps: false,
    })
], ThrottlerRecord);
exports.ThrottlerSchema = mongoose_1.SchemaFactory.createForClass(ThrottlerRecord);
exports.ThrottlerSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
exports.ThrottlerSchema.index({ tracker: 1, routeName: 1 });
function buildThrottleKey(routeName, tracker) {
    return `${routeName}:${tracker}`;
}
function trackerFromRequest(req) {
    const xff = req.headers?.['x-forwarded-for'];
    const raw = Array.isArray(xff) ? xff[0] : xff;
    if (typeof raw === 'string' && raw.length > 0) {
        return raw.split(',')[0].trim();
    }
    return req.ip ?? 'unknown';
}
void mongoose_2.Schema;
//# sourceMappingURL=throttler.schema.js.map