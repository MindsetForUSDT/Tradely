// ============================================================
// TradeumDiary — Централизованные типы
// ============================================================

// --- Пользователь и профиль ---
export type SubscriptionTier = 'free' | 'pro';
export type BlockchainNetwork = 'ethereum' | 'solana' | 'polygon' | 'bsc' | 'arbitrum' | 'optimism';
export type WalletProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  subscription_tier: SubscriptionTier;
  subscription_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// --- Кошелёк ---
export interface Wallet {
  id: string;
  user_id: string;
  address: string;
  chain: BlockchainNetwork;
  label: string | null;
  processing_status: WalletProcessingStatus;
  last_synced_at: string | null;
  error_message: string | null;
  added_at: string;
}

// --- Сделка (трейд) ---
export interface Trade {
  id: string;
  wallet_id: string;
  user_id: string;
  transaction_hash: string;
  timestamp: string;
  token_in: string;
  token_out: string;
  amount_in: number;
  amount_out: number;
  value_usd: number;
  is_buy: boolean;
  created_at: string;
}

// --- Дневная аналитика ---
export interface DailyAnalytics {
  id: string;
  user_id: string;
  date: string;
  total_volume_usd: number;
  total_trades: number;
  realized_pnl_usd: number;
  win_rate: number;
  best_trade_usd: number;
  worst_trade_usd: number;
  updated_at: string;
}

// --- Данные для графиков ---
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

// --- Состояние приложения (Zustand) ---
export interface AppState {
  // Пользователь
  user: Profile | null;
  setUser: (user: Profile | null) => void;

  // Баланс и статистика (для верхней панели дашборда)
  totalBalance: number;
  dailyPnl: number;
  dailyTrades: number;
  setStats: (balance: number, pnl: number, trades: number) => void;

  // Загрузка
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}