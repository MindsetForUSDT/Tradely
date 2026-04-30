// ============================================================
// TradeumDiary — TypeScript типы для моделей БД
// ============================================================

export type SubscriptionTier = 'free' | 'pro';
export type Chain = 'ethereum' | 'tron' | 'solana' | 'polygon' | 'bsc' | 'arbitrum' | 'optimism' | 'avalanche' | 'base';
export type TradeSide = 'buy' | 'sell';
export type TradeStatus = 'open' | 'closed' | 'cancelled';
export type Mood = 'confident' | 'neutral' | 'fearful' | 'greedy' | 'tilted' | 'anxious' | 'excited' | 'disciplined';
export type TagCategory = 'strategy' | 'emotion' | 'timeframe' | 'setup' | 'mistake' | 'custom';
export type GoalType = 'pnl' | 'win_rate' | 'trades_count' | 'profit_factor' | 'drawdown_limit';
export type AlertType = 'pnl_target' | 'drawdown' | 'win_rate' | 'volume_spike' | 'inactivity' | 'goal_achieved' | 'custom';
export type TaxMethod = 'FIFO' | 'LIFO' | 'Specific_ID' | 'Average_Cost';
export type SyncStatus = 'connected' | 'error' | 'expired' | 'revoked';
export type FlagType = 'boolean' | 'percentage' | 'user_segment';

export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  email_verified_at: string | null;
  timezone: string;
  referrer_id: string | null;
  last_login_at: string | null;
  last_login_ip: string | null;
  subscription_tier: SubscriptionTier;
  subscription_expires_at: string | null;
  trial_started_at: string;
  preferences: UserPreferences;
  free_usage: FreeUsage;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  theme: 'dark' | 'light';
  language: 'ru' | 'en';
  notifications: {
    email: boolean;
    telegram: boolean;
    discord: boolean;
  };
}

export interface FreeUsage {
  trades_this_month: number;
  trade_limit: number;
  wallet_limit: number;
  tag_limit: number;
  reset_date: string | null;
}

export interface Wallet {
  id: string;
  user_id: string;
  address: string;
  chain: Chain;
  label: string | null;
  is_verified: boolean;
  sync_enabled: boolean;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  last_synced_at: string | null;
  error_message: string | null;
  added_at: string;
}

export interface Trade {
  id: string;
  wallet_id: string | null;
  user_id: string;
  transaction_hash: string | null;
  symbol: string;
  side: TradeSide;
  amount: number;
  price: number;
  entry_price: number | null;
  exit_price: number | null;
  value_usd: number;
  fee: number;
  fee_currency: string;
  status: TradeStatus;
  leverage: number;
  pnl_realized: number | null;
  pnl_percent: number | null;
  notes: string | null;
  exchange: string | null;
  timestamp: string;
  created_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  category: TagCategory;
  is_system: boolean;
  usage_count: number;
  created_at: string;
}

export interface TradeTag {
  trade_id: string;
  tag_id: string;
}

export interface DailyAnalytics {
  id: string;
  user_id: string;
  date: string;
  total_volume_usd: number;
  total_trades: number;
  realized_pnl_usd: number;
  unrealized_pnl_usd: number;
  win_rate: number;
  best_trade_usd: number;
  worst_trade_usd: number;
  avg_hold_time_minutes: number;
  profit_factor: number;
  updated_at: string;
}

export interface UserGoal {
  id: string;
  user_id: string;
  title: string;
  target_type: GoalType;
  target_value: number;
  current_value: number;
  start_date: string;
  end_date: string | null;
  is_achieved: boolean;
  achieved_at: string | null;
  notified: boolean;
  created_at: string;
}

export interface Alert {
  id: string;
  user_id: string;
  name: string;
  alert_type: AlertType;
  condition_config: Record<string, unknown>;
  channels: string[];
  webhook_url: string | null;
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
}

export interface TradingJournal {
  id: string;
  user_id: string;
  trade_id: string | null;
  entry_date: string;
  mood: Mood | null;
  energy_level: number | null;
  sleep_hours: number | null;
  notes: string | null;
  pre_trade_plan: string | null;
  post_trade_review: string | null;
  mistakes: string[];
  lessons: string[];
  screen_time_minutes: number | null;
  created_at: string;
}

export interface TaxReport {
  id: string;
  user_id: string;
  tax_year: number;
  jurisdiction: string;
  calculation_method: TaxMethod;
  total_trades: number;
  total_proceeds: number;
  total_cost_basis: number;
  total_gains: number;
  total_losses: number;
  net_result: number;
  taxable_amount: number;
  tax_rate: number;
  estimated_tax: number;
  report_data: Record<string, unknown> | null;
  generated_at: string;
}

export interface ExchangeConnection {
  id: string;
  user_id: string;
  exchange: string;
  api_key_encrypted: string | null;
  api_secret_encrypted: string | null;
  api_passphrase_encrypted: string | null;
  read_only: boolean;
  is_active: boolean;
  last_synced_at: string | null;
  sync_status: SyncStatus;
  error_message: string | null;
  created_at: string;
}

export interface FeatureFlag {
  id: string;
  flag_key: string;
  description: string | null;
  flag_type: FlagType;
  rules: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface SubscriptionLimit {
  id: string;
  tier: SubscriptionTier;
  feature_key: string;
  limit_value: number;
  description: string | null;
}