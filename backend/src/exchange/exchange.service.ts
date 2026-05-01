import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExchangeAdapter } from './exchange.interface';
import { BinanceAdapter } from './adapters/binance.adapter';
import { BybitAdapter } from './adapters/bybit.adapter';

@Injectable()
export class ExchangeService {
  private adapters: Map<string, ExchangeAdapter> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    binance: BinanceAdapter,
    bybit: BybitAdapter,
  ) {
    this.adapters.set('binance', binance);
    this.adapters.set('bybit', bybit);
  }

  async connectExchange(userId: string, exchange: string, apiKey: string, secret: string) {
    const adapter = this.adapters.get(exchange);
    if (!adapter) throw new Error(`Exchange ${exchange} not supported`);

    const valid = await adapter.connect(apiKey, secret);
    if (!valid) throw new Error('Invalid credentials');

    return this.prisma.exchangeConnection.create({
      data: {
        user_id: userId,
        exchange,
        api_key_encrypted: apiKey, // TODO: encrypt with crypto
        api_secret_encrypted: secret,
        sync_status: 'connected',
      },
    });
  }

  async syncTrades(userId: string, connectionId: string) {
    const connection = await this.prisma.exchangeConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || connection.user_id !== userId) throw new Error('Not found');

    const adapter = this.adapters.get(connection.exchange);
    if (!adapter) throw new Error('Adapter not found');

    await adapter.connect(
      connection.api_key_encrypted || '',
      connection.api_secret_encrypted || '',
    );

    const trades = await adapter.fetchTrades();

    // Импорт сделок в БД
    for (const trade of trades) {
      await this.prisma.trade.create({
        data: {
          user_id: userId,
          symbol: trade.symbol,
          side: trade.side,
          amount: trade.amount,
          price: trade.price,
          value_usd: trade.amount * trade.price,
          fee: trade.fee,
          fee_currency: trade.feeCurrency,
          exchange: connection.exchange,
          timestamp: trade.timestamp,
        },
      }).catch(() => {
        // Пропускаем дубликаты
      });
    }

    await this.prisma.exchangeConnection.update({
      where: { id: connectionId },
      data: { last_synced_at: new Date(), sync_status: 'connected' },
    });

    return { imported: trades.length };
  }

  getSupportedExchanges(): string[] {
    return Array.from(this.adapters.keys());
  }
}