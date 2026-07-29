export type BybitCategory = 'spot' | 'linear';

export interface BybitCredentials {
  apiKey: string;
  apiSecret: string;
}

export interface BybitListResult<T> {
  list?: T[];
  nextPageCursor?: string;
}

export interface BybitEnvelope<T> {
  retCode: number;
  retMsg: string;
  result: T;
  retExtInfo?: Record<string, unknown>;
  time?: number;
}

export interface BybitExecution extends Record<string, unknown> {
  symbol?: string;
  orderId?: string;
  side?: string;
  execFee?: string;
  execId?: string;
  execPrice?: string;
  execQty?: string;
  execType?: string;
  execValue?: string;
  execTime?: string;
  feeCurrency?: string;
}

export interface BybitClosedPnl extends Record<string, unknown> {
  symbol?: string;
  orderId?: string;
  side?: string;
  closedSize?: string;
  avgEntryPrice?: string;
  avgExitPrice?: string;
  closedPnl?: string;
  openFee?: string;
  closeFee?: string;
  createdTime?: string;
  updatedTime?: string;
}

export interface BybitTransaction extends Record<string, unknown> {
  id?: string;
  symbol?: string;
  category?: string;
  side?: string;
  transactionTime?: string;
  type?: string;
  currency?: string;
  funding?: string;
  fee?: string;
  cashFlow?: string;
  change?: string;
  tradeId?: string;
  orderId?: string;
}

export interface BybitWalletAccount extends Record<string, unknown> {
  accountType?: string;
  totalEquity?: string;
}

export interface BybitApiKeyInfo extends Record<string, unknown> {
  readOnly?: number;
  ips?: string[];
}
