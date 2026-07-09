import { Module } from '@nestjs/common';
import { HealthController, RootController } from './health.controller';
import { HealthService } from './health.service';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [ConfigModule],
  controllers: [HealthController, RootController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
