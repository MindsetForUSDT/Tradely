import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { PositionSizingService } from './position-sizing.service';
import { MetricsService } from './metrics.service';

@Module({
  controllers: [AnalyticsController],
  providers: [PositionSizingService, MetricsService],
  exports: [PositionSizingService, MetricsService],
})
export class AnalyticsModule {}