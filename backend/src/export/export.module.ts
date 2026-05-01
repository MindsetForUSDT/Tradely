import { Module } from '@nestjs/common';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { TradesModule } from '../trades/trades.module';

@Module({
  imports: [TradesModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}