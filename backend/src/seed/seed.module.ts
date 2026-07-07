import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '../config/config.module';
import { User, UserSchema } from './user.schema';
import { SeedService } from './seed.service';

/**
 * Scaffolding owns the `users` collection core seed contract + `SeedService`
 * (SPEC §3 domain scope). Auth domain will consume the `User` model — we
 * re-export the `MongooseModule.forFeature` so Auth can `forFeature([])`-free
 * inject the same model.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ConfigModule,
  ],
  providers: [SeedService],
  exports: [SeedService, MongooseModule],
})
export class SeedModule {}
