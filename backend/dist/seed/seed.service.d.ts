import { OnModuleInit } from '@nestjs/common';
import { Model } from 'mongoose';
import { User } from './user.schema';
import { AppConfigService } from '../config/config.service';
export declare class SeedService implements OnModuleInit {
    private readonly userModel;
    private readonly config;
    private readonly logger;
    constructor(userModel: Model<User>, config: AppConfigService);
    onModuleInit(): Promise<void>;
    seedAdmin(): Promise<{
        action: 'created' | 'skipped';
    }>;
    private messageOf;
}
