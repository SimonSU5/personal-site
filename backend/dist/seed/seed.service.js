"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const bcrypt = __importStar(require("bcrypt"));
const mongodb_1 = require("mongodb");
const user_schema_1 = require("./user.schema");
const config_service_1 = require("../config/config.service");
let SeedService = class SeedService {
    userModel;
    config;
    logger = new common_1.Logger('SeedService');
    constructor(userModel, config) {
        this.userModel = userModel;
        this.config = config;
    }
    async onModuleInit() {
        try {
            await this.seedAdmin();
        }
        catch (err) {
            if (err instanceof mongodb_1.MongoError || isMongooseConnError(err)) {
                this.logger.warn(`Skipping admin seed: Mongo unavailable (${this.messageOf(err)}).`);
                return;
            }
            throw err;
        }
    }
    async seedAdmin() {
        const username = this.config.adminBootstrapUsername.toLowerCase();
        const password = this.config.adminBootstrapPassword;
        const cost = this.config.bcryptCost;
        const existingCount = await this.userModel.countDocuments().exec();
        if (existingCount > 0) {
            this.logger.log(`Seed skipped: ${existingCount} user(s) already present.`);
            return { action: 'skipped' };
        }
        const passwordHash = await bcrypt.hash(password, cost);
        try {
            await this.userModel.create({
                username,
                passwordHash,
                role: 'admin',
                isActive: true,
            });
            this.logger.log(`Seed created admin user "${username}" (role=admin).`);
            return { action: 'created' };
        }
        catch (err) {
            if (err instanceof mongodb_1.MongoError &&
                err.code === 11000) {
                this.logger.warn(`Seed race: admin already created concurrently (E11000 swallowed).`);
                return { action: 'skipped' };
            }
            throw err;
        }
    }
    messageOf(err) {
        if (err instanceof Error)
            return err.message;
        return String(err);
    }
};
exports.SeedService = SeedService;
exports.SeedService = SeedService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, common_1.Inject)(config_service_1.AppConfigService)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        config_service_1.AppConfigService])
], SeedService);
function isMongooseConnError(err) {
    const name = err?.name;
    return (name === 'MongooseError' ||
        name === 'DisconnectedError' ||
        name === 'MongoNetworkError' ||
        name === 'MongoServerError' ||
        name === 'MongoServerSelectionError');
}
//# sourceMappingURL=seed.service.js.map