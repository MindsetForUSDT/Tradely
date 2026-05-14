// supabase/lib/exchange-adapter.ts
// Адаптер для интеграции с криптобиржами через CCXT-like интерфейс
// Поддержка Binance, Bybit, OKX, Kraken, Gate.io и других

export interface Trade {
  id: string; // Уникальный ID сделки на бирже
  symbol: string; // Торговая пара (BTC/USDT)
  side: 'buy' | 'sell'; // Сторона сделки
  price: number; // Цена исполнения
  amount: number; // Количество
  cost: number; // Общая стоимость (price * amount)
  fee: number; // Комиссия
  feeCurrency: string; // Валюта комиссии
  timestamp: string; // ISO 8601
  datetime?: string; // Альтернативное поле времени
  order: string; // ID ордера
  type: 'market' | 'limit'; // Тип ордера
  timeInForce?: string; // Time in force
  isMaker?: boolean; // Является ли маркет-мейкером
  info: any; // Оригинальные данные биржи
}

export interface Balance {
  total: Record<string, number>; // Общий баланс по валютам
  free: Record<string, number>; // Доступный баланс
  used: Record<string, number>; // Замороженный баланс
}

export interface ExchangeConfig {
  exchangeId: string; // binance, bybit, okx и т.д.
  apiKey: string;
  secret: string;
  passphrase?: string; // Для OKX, Coinbase
  sandbox?: boolean; // Режим тестирования
  options?: Record<string, any>; // Дополнительные опции
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  balances?: Balance;
  error?: string;
}

/**
 * Базовый класс для всех бирж
 */
export abstract class BaseExchange {
  protected config: ExchangeConfig;

  constructor(config: ExchangeConfig) {
    this.config = config;
  }

  /**
   * Проверка подключения (тестовый запрос)
   */
  abstract testConnection(): Promise<ConnectionTestResult>;

  /**
   * Получение истории сделок
   */
  abstract fetchTrades(since?: number, limit?: number): Promise<Trade[]>;

  /**
   * Получение баланса
   */
  abstract fetchBalance(): Promise<Balance>;

  /**
   * Нормализация данных в единый формат
   */
  normalizeTrade(trade: any): Trade {
    return {
      id: trade.id || trade.execId || trade.orderId,
      symbol: this.normalizeSymbol(trade.symbol || trade.pair),
      side: trade.side === 'buy' ? 'buy' : 'sell',
      price: parseFloat(trade.price || trade.avgPrice),
      amount: parseFloat(trade.amount || trade.size || trade.quantity),
      cost: parseFloat(trade.cost || trade.QuoteAmount || trade.notional),
      fee: parseFloat(trade.fee || trade.commission || '0'),
      feeCurrency: trade.feeCurrency || trade.commissionAsset || 'USDT',
      timestamp: trade.timestamp || trade.time,
      order: trade.orderId || trade.order,
      type: trade.type || 'limit',
      info: trade,
    };
  }

  /**
   * Нормализация торгового символа
   */
  normalizeSymbol(symbol: string): string {
    // Преобразуем различные форматы в единый (BTC/USDT)
    return symbol.replace('-', '/').replace('_', '/').toUpperCase();
  }

  /**
   * Обработка rate limiting с exponential backoff
   */
  async withRateLimit<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        if (error.rateLimit || error.status === 429) {
          const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
          console.log(`Rate limit hit, retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw new Error('Max retries exceeded');
  }
}

/**
 * Адаптер для Binance
 */
export class BinanceExchange extends BaseExchange {
  async testConnection(): Promise<ConnectionTestResult> {
    try {
      // Используем публичный API для проверки (не требует подписи)
      const response = await fetch('https://api.binance.com/api/v3/time');
      if (!response.ok) {
        return {
          success: false,
          message: 'Binance API unreachable',
          error: `HTTP ${response.status}`,
        };
      }

      // Пробуем получить баланс (требует подписи)
      const timestamp = Date.now();
      const query = `timestamp=${timestamp}`;
      const signature = this.generateHMAC(query);

      const balanceResponse = await fetch(
        `https://api.binance.com/api/v3/account?${query}&signature=${signature}`,
        {
          headers: {
            'X-MBX-APIKEY': this.config.apiKey,
          },
        }
      );

      if (balanceResponse.status === 401) {
        return {
          success: false,
          message: 'Invalid API credentials',
          error: 'Authentication failed',
        };
      }

      if (!balanceResponse.ok) {
        return {
          success: false,
          message: 'Connection error',
          error: await balanceResponse.text(),
        };
      }

      const data = await balanceResponse.json();
      const balances: Balance = {
        total: {},
        free: {},
        used: {},
      };

      data.balances.forEach((b: any) => {
        const asset = b.asset;
        balances.total[asset] = parseFloat(b.free) + parseFloat(b.locked);
        balances.free[asset] = parseFloat(b.free);
        balances.used[asset] = parseFloat(b.locked);
      });

      return {
        success: true,
        message: `Connected successfully. ${Object.keys(balances.total).length} assets`,
        balances,
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Connection failed',
        error: error.message,
      };
    }
  }

  async fetchTrades(since?: number, limit = 1000): Promise<Trade[]> {
    const timestamp = Date.now();
    const params = {
      timestamp,
      limit,
      ...(since && { startTime: since }),
    };

    const query = Object.entries(params)
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    const signature = this.generateHMAC(query);

    const response = await this.withRateLimit(async () => {
      const res = await fetch(
        `https://api.binance.com/api/v3/myTrades?${query}&signature=${signature}`,
        {
          headers: {
            'X-MBX-APIKEY': this.config.apiKey,
          },
        }
      );

      if (!res.ok) {
        throw new Error(`Binance API error: ${res.status}`);
      }

      return res.json();
    });

    return response.map((trade: any) =>
      this.normalizeTrade({
        id: trade.id.toString(),
        symbol: trade.symbol,
        side: trade.isBuyer ? 'buy' : 'sell',
        price: trade.price,
        amount: trade.qty,
        cost: trade.quoteQty,
        fee: trade.commission,
        feeCurrency: trade.commissionAsset,
        timestamp: trade.time,
        order: trade.orderId,
        info: trade,
      })
    );
  }

  async fetchBalance(): Promise<Balance> {
    const result = await this.testConnection();
    if (!result.success || !result.balances) {
      throw new Error('Failed to fetch balance');
    }
    return result.balances;
  }

  private generateHMAC(data: string): string {
    const crypto = require('crypto');
    return crypto.createHmac('sha256', this.config.secret).update(data).digest('hex');
  }
}

/**
 * Адаптер для Bybit
 */
export class BybitExchange extends BaseExchange {
  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const params = {
        api_key: this.config.apiKey,
        timestamp: Date.now().toString(),
        recv_window: '5000',
      };

      const query = Object.entries(params)
        .sort()
        .map(([k, v]) => `${k}=${v}`)
        .join('&');
      const signature = this.generateHMAC(query);

      const response = await fetch('https://api.bybit.com/v2/private/wallet/balance', {
        method: 'GET',
        headers: {
          'X-BAPI-API-KEY': this.config.apiKey,
          'X-BAPI-TIMESTAMP': params.timestamp,
          'X-BAPI-SIGN': signature,
        },
      });

      if (!response.ok) {
        return {
          success: false,
          message: 'Bybit API error',
          error: await response.text(),
        };
      }

      const data = await response.json();
      if (data.retCode !== 0) {
        return {
          success: false,
          message: 'Bybit authentication failed',
          error: data.retMsg,
        };
      }

      const balances: Balance = { total: {}, free: {}, used: {} };
      data.result.list.forEach((item: any) => {
        balances.total[item.coin] = parseFloat(item.totalBalance);
        balances.free[item.coin] = parseFloat(item.availableToWithdraw);
        balances.used[item.coin] = parseFloat(item.unrealisedPnl);
      });

      return {
        success: true,
        message: `Connected to Bybit. ${balances.total}`,
        balances,
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Connection failed',
        error: error.message,
      };
    }
  }

  async fetchTrades(since?: number, limit = 500): Promise<Trade[]> {
    const params = {
      category: 'linear',
      limit,
      ...(since && { startTime: since }),
    };

    const response = await this.withRateLimit(async () => {
      const res = await fetch(
        `https://api.bybit.com/v5/execution/list?${new URLSearchParams(params as any)}`,
        {
          headers: {
            'X-BAPI-API-KEY': this.config.apiKey,
            'X-BAPI-TIMESTAMP': Date.now().toString(),
          },
        }
      );

      if (!res.ok) {
        throw new Error(`Bybit API error: ${res.status}`);
      }

      return res.json();
    });

    return response.result.list.map((exec: any) =>
      this.normalizeTrade({
        id: exec.execId,
        symbol: exec.symbol,
        side: exec.side.toLowerCase(),
        price: exec.price,
        amount: exec.execQty,
        cost: exec.execValue,
        fee: exec.fee,
        feeCurrency: exec.feeCurrency,
        timestamp: exec.execTime,
        order: exec.orderId,
        info: exec,
      })
    );
  }

  async fetchBalance(): Promise<Balance> {
    const result = await this.testConnection();
    if (!result.success || !result.balances) {
      throw new Error('Failed to fetch balance');
    }
    return result.balances;
  }

  private generateHMAC(data: string): string {
    const crypto = require('crypto');
    return crypto.createHmac('sha256', this.config.secret).update(data).digest('hex');
  }
}

/**
 * Фабрика для создания экземпляров бирж
 */
export class ExchangeFactory {
  private static exchanges: Map<string, new (config: ExchangeConfig) => BaseExchange> = new Map();

  static register(exchangeId: string, constructor: new (config: ExchangeConfig) => BaseExchange) {
    this.exchanges.set(exchangeId, constructor);
  }

  static create(config: ExchangeConfig): BaseExchange {
    const Constructor = this.exchanges.get(config.exchangeId);
    if (!Constructor) {
      throw new Error(`Unsupported exchange: ${config.exchangeId}`);
    }
    return new Constructor(config);
  }

  static getSupportedExchanges(): string[] {
    return Array.from(this.exchanges.keys());
  }
}

// Регистрация бирж
ExchangeFactory.register('binance', BinanceExchange);
ExchangeFactory.register('bybit', BybitExchange);

// Можно добавить другие биржи:
// ExchangeFactory.register('okx', OKXExchange);
// ExchangeFactory.register('kraken', KrakenExchange);
// ExchangeFactory.register('gateio', GateIOExchange);
