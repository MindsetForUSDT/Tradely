import { Module } from '@nestjs/common';
import { ExchangeService } from './exchange.service';
import { ExchangeController } from './exchange.controller';
import { BinanceAdapter } from './adapters/binance.adapter';
import { BybitAdapter } from './adapters/bybit.adapter';

@Module({
  controllers: [ExchangeController],
  providers: [
    ExchangeService,
    BinanceAdapter,
    BybitAdapter,
  ],
  exports: [ExchangeService],
})
export class ExchangeModule {}