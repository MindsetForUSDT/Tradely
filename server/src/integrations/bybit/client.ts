import { createHmac } from 'node:crypto';
import type {
  BybitApiKeyInfo,
  BybitCategory,
  BybitClosedPnl,
  BybitCredentials,
  BybitEnvelope,
  BybitExecution,
  BybitListResult,
  BybitTransaction,
  BybitWalletAccount,
} from './schemas.js';

const DEFAULT_BASE_URL = 'https://api.bybit.com';
const DEFAULT_RECV_WINDOW = 5_000;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_MAX_PAGES = 10_000;
const IP_BAN_RETRY_MS = 10 * 60 * 1000;

type FetchLike = typeof fetch;

export interface BybitClientOptions {
  baseUrl?: string;
  fetchImpl?: FetchLike;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
  recvWindow?: number;
  timeoutMs?: number;
  maxRetries?: number;
  maxPages?: number;
}

export class BybitApiError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly retCode?: number;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;

  constructor(
    message: string,
    details: {
      code: string;
      status?: number;
      retCode?: number;
      retryable?: boolean;
      retryAfterMs?: number;
      cause?: unknown;
    }
  ) {
    super(message, { cause: details.cause });
    this.name = 'BybitApiError';
    this.code = details.code;
    this.status = details.status;
    this.retCode = details.retCode;
    this.retryable = details.retryable ?? false;
    this.retryAfterMs = details.retryAfterMs;
  }
}

export interface BybitReader {
  executionPages(
    category: BybitCategory,
    start: number,
    end: number
  ): AsyncIterable<BybitListResult<BybitExecution>>;
  closedPnlPages(start: number, end: number): AsyncIterable<BybitListResult<BybitClosedPnl>>;
  transactionPages(start: number, end: number): AsyncIterable<BybitListResult<BybitTransaction>>;
  getWalletBalance(): Promise<BybitListResult<BybitWalletAccount>>;
  getApiKeyInfo(): Promise<BybitApiKeyInfo>;
}

function defaultSleep(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

function isEnvelope<T>(value: unknown): value is BybitEnvelope<T> {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<BybitEnvelope<T>>;
  return (
    typeof candidate.retCode === 'number' &&
    typeof candidate.retMsg === 'string' &&
    'result' in candidate
  );
}

function responseResetDelay(response: Response, now: number): number | undefined {
  const resetAt = Number(response.headers.get('X-Bapi-Limit-Reset-Timestamp'));
  return Number.isFinite(resetAt) && resetAt > now ? resetAt - now : undefined;
}

export class BybitClient implements BybitReader {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;
  private readonly now: () => number;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly recvWindow: number;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly maxPages: number;

  constructor(
    private readonly credentials: BybitCredentials,
    options: BybitClientOptions = {}
  ) {
    if (!credentials.apiKey.trim() || !credentials.apiSecret.trim()) {
      throw new Error('Bybit API credentials are required');
    }
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? Date.now;
    this.sleep = options.sleep ?? defaultSleep;
    this.recvWindow = options.recvWindow ?? DEFAULT_RECV_WINDOW;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
  }

  async signedGet<T>(path: string, params: URLSearchParams): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.signedGetOnce<T>(path, params);
      } catch (error) {
        const normalized = this.normalizeError(error);
        if (!normalized.retryable || attempt >= this.maxRetries) throw normalized;

        const delay = normalized.retryAfterMs ?? 250 * 2 ** attempt;
        // A 403 IP ban needs a worker-level retry, not a ten-minute inline sleep.
        if (delay >= IP_BAN_RETRY_MS) throw normalized;
        await this.sleep(Math.max(0, delay));
      }
    }
  }

  async getAllPages<T>(
    path: string,
    baseParams: Record<string, string>,
    limit: number
  ): Promise<T[]> {
    const records: T[] = [];
    for await (const page of this.paginate<T>(path, baseParams, limit)) {
      records.push(...(page.list ?? []));
    }
    return records;
  }

  async *paginate<T>(
    path: string,
    baseParams: Record<string, string>,
    limit: number
  ): AsyncGenerator<BybitListResult<T>> {
    let cursor: string | undefined;
    let pageCount = 0;
    const seenCursors = new Set<string>();

    do {
      if (pageCount >= this.maxPages) {
        throw new BybitApiError(`Bybit pagination exceeded ${this.maxPages} pages`, {
          code: 'BYBIT_PAGE_LIMIT',
        });
      }
      const params = new URLSearchParams({
        ...baseParams,
        limit: String(limit),
        ...(cursor ? { cursor } : {}),
      });
      const result = await this.signedGet<BybitListResult<T>>(path, params);
      yield result;
      pageCount += 1;

      const nextCursor = result.nextPageCursor?.trim() || undefined;
      if (nextCursor && seenCursors.has(nextCursor)) {
        throw new BybitApiError('Bybit returned a repeated pagination cursor', {
          code: 'BYBIT_CURSOR_LOOP',
        });
      }
      if (nextCursor) seenCursors.add(nextCursor);
      cursor = nextCursor;
    } while (cursor);
  }

  executionPages(category: BybitCategory, start: number, end: number) {
    return this.paginate<BybitExecution>(
      '/v5/execution/list',
      { category, startTime: String(start), endTime: String(end) },
      100
    );
  }

  closedPnlPages(start: number, end: number) {
    return this.paginate<BybitClosedPnl>(
      '/v5/position/closed-pnl',
      { category: 'linear', startTime: String(start), endTime: String(end) },
      100
    );
  }

  transactionPages(start: number, end: number) {
    return this.paginate<BybitTransaction>(
      '/v5/account/transaction-log',
      {
        accountType: 'UNIFIED',
        category: 'linear',
        startTime: String(start),
        endTime: String(end),
      },
      50
    );
  }

  getWalletBalance() {
    return this.signedGet<BybitListResult<BybitWalletAccount>>(
      '/v5/account/wallet-balance',
      new URLSearchParams({ accountType: 'UNIFIED' })
    );
  }

  getApiKeyInfo() {
    return this.signedGet<BybitApiKeyInfo>('/v5/user/query-api', new URLSearchParams());
  }

  private async signedGetOnce<T>(path: string, params: URLSearchParams): Promise<T> {
    const timestamp = this.now();
    const query = params.toString();
    const signature = createHmac('sha256', this.credentials.apiSecret)
      .update(`${timestamp}${this.credentials.apiKey}${this.recvWindow}${query}`)
      .digest('hex');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}${query ? `?${query}` : ''}`, {
        headers: {
          'X-BAPI-API-KEY': this.credentials.apiKey,
          'X-BAPI-TIMESTAMP': String(timestamp),
          'X-BAPI-SIGN': signature,
          'X-BAPI-RECV-WINDOW': String(this.recvWindow),
        },
        signal: controller.signal,
      });
    } catch (error) {
      const timedOut = controller.signal.aborted;
      throw new BybitApiError(
        timedOut ? 'Bybit request timed out' : 'Bybit network request failed',
        {
          code: timedOut ? 'BYBIT_TIMEOUT' : 'BYBIT_NETWORK',
          retryable: true,
          cause: error,
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const retryAfterMs =
        response.status === 403 ? IP_BAN_RETRY_MS : responseResetDelay(response, this.now());
      throw new BybitApiError(`Bybit HTTP ${response.status}`, {
        code: `BYBIT_HTTP_${response.status}`,
        status: response.status,
        retryable: response.status === 429 || response.status >= 500 || response.status === 403,
        retryAfterMs,
      });
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (error) {
      throw new BybitApiError('Bybit returned invalid JSON', {
        code: 'BYBIT_INVALID_JSON',
        retryable: true,
        cause: error,
      });
    }
    if (!isEnvelope<T>(data)) {
      throw new BybitApiError('Bybit returned an invalid response envelope', {
        code: 'BYBIT_INVALID_RESPONSE',
      });
    }
    if (data.retCode !== 0) {
      const retryable = data.retCode === 10000 || data.retCode === 10006;
      throw new BybitApiError(data.retMsg || `Bybit error ${data.retCode}`, {
        code: `BYBIT_${data.retCode}`,
        retCode: data.retCode,
        retryable,
        retryAfterMs: data.retCode === 10006 ? responseResetDelay(response, this.now()) : undefined,
      });
    }
    return data.result;
  }

  private normalizeError(error: unknown): BybitApiError {
    if (error instanceof BybitApiError) return error;
    return new BybitApiError(error instanceof Error ? error.message : 'Unknown Bybit error', {
      code: 'BYBIT_UNKNOWN',
      cause: error,
    });
  }
}
