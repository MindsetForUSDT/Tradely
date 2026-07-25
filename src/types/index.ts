// types/index.ts — ОБНОВЛЕННЫЕ ТИПЫ
export interface Trade {
  id: string;
  user_id: string;
  wallet_id?: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  price_usd?: number;
  value_usd: number;
  fee: number;
  fee_usd?: number;
  fee_token?: string;
  status: 'open' | 'closed' | 'pending';
  exchange?: string;
  chain?: string;
  tx_hash?: string;
  block_number?: number;
  pnl_realized?: number;
  pnl_percent?: number;
  holding_time_minutes?: number;
  strategy_tag?: string;
  tags?: string[];
  notes?: string;
  raw_data?: string;
  timestamp: string;
  created_at?: string;
}

export interface PnLDataPoint {
  date: string;
  pnl: number;
  cumulativePnl: number;
}

export interface TokenVolume {
  token: string;
  volume: number;
  percentage: number;
}

export interface WeekdayPerformance {
  day: string;
  profit: number;
  trades: number;
}

export interface Wallet {
  id: string;
  user_id: string;
  address: string;
  chain: string;
  chain_id?: number;
  label?: string;
  settings?: string | Record<string, unknown>;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  last_synced_at?: string;
  last_processed_block?: number;
  error_message?: string;
  import_from_date?: string;
  added_at: string;
  _count?: { trades: number };
}

export interface Analytics {
  id: string;
  user_id: string;
  date: string;
  realized_pnl_usd: number;
  total_trades: number;
  win_rate: number;
  total_volume: number;
}

// Тип для статистики стора
export interface StatsState {
  totalBalance: number;
  dailyPnl: number;
  dailyTrades: number;
  isLoading: boolean;
  error: string | null;
}
