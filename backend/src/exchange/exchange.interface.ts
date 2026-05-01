export interface ExchangeAdapter {
  readonly name: string;
  readonly supportsReadOnly: boolean;

  connect(apiKey: string, secret: string, passphrase?: string): Promise<boolean>;
  disconnect(): Promise<void>;

  fetchTrades(symbol?: string, since?: Date): Promise<ExchangeTrade[]>;
  getBalance(): Promise<ExchangeBalance[]>;
  validateCredentials(): Promise<boolean>;
}

export interface ExchangeTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  fee: number;
  feeCurrency: string;
  timestamp: Date;
}

export interface ExchangeBalance {
  asset: string;
  free: number;
  locked: number;
  total: number;
}