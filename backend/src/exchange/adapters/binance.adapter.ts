import { Injectable } from '@nestjs/common';
import { ExchangeAdapter, ExchangeTrade } from '../exchange.interface';

@Injectable()
export class BinanceAdapter implements ExchangeAdapter {
  readonly name = 'binance';
  readonly supportsReadOnly = true;

  private client: any = null;

  async connect(apiKey: string, secret: string): Promise<boolean> {
    // Интеграция с ccxt или binance-api-node
    this.client = { apiKey, secret, connected: true };
    return true;
  }

  async disconnect(): Promise<void> {
    this.client = null;
  }

  async fetchTrades(symbol?: string, since?: Date): Promise<ExchangeTrade[]> {
    if (!this.client) throw new Error('Not connected');

    // Заглушка — в реальности вызов Binance API
    return [];
  }

  async getBalance() {
    return [];
  }

  async validateCredentials(): Promise<boolean> {
    return !!this.client;
  }
}