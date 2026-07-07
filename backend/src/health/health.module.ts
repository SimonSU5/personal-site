import { Module } from '@nestjs/common';
import {
  HealthController,
  RootController,
  RawHealthController,
} from './health.controller';
import { HealthService } from './health.service';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [ConfigModule],
  controllers: [HealthController, RootController, RawHealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
