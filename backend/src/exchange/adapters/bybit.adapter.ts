import { Injectable } from '@nestjs/common';
import { ExchangeAdapter, ExchangeTrade } from '../exchange.interface';

@Injectable()
export class BybitAdapter implements ExchangeAdapter {
  readonly name = 'bybit';
  readonly supportsReadOnly = true;
  private client: any = null;

  async connect(apiKey: string, secret: string): Promise<boolean> {
    this.client = { apiKey, secret, connected: true };
    return true;
  }

  async disconnect(): Promise<void> {
    this.client = null;
  }

  async fetchTrades(): Promise<ExchangeTrade[]> {
    if (!this.client) throw new Error('Not connected');
    return [];
  }

  async getBalance() {
    return [];
  }

  async validateCredentials(): Promise<boolean> {
    return !!this.client;
  }
}