// supabase/lib/rate-limiter.ts
// Rate Limiting middleware для Supabase Edge Functions
// Защита от DDoS, brute-force и злоупотреблений

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Security-Policy': "default-src 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
  skipFailedRequests?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

/**
 * Класс для управления rate limiting с использованием Redis (через Supabase)
 */
export class RateLimiter {
  private config: RateLimitConfig;
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor(config: RateLimitConfig, supabaseUrl: string, supabaseKey: string) {
    this.config = {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      keyPrefix: config.keyPrefix || 'ratelimit',
      skipFailedRequests: config.skipFailedRequests || false,
    };
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
  }

  /**
   * Генерирует уникальный ключ для идентификатора пользователя/IP
   */
  private generateKey(identifier: string): string {
    const timestamp = Math.floor(Date.now() / this.config.windowMs);
    return `${this.config.keyPrefix}:${identifier}:${timestamp}`;
  }

  /**
   * Проверка и увеличение счетчика запросов
   */
  async checkLimit(identifier: string, requestId: string): Promise<RateLimitResult> {
    try {
      const key = this.generateKey(identifier);
      const currentWindow = Math.floor(Date.now() / this.config.windowMs);
      const windowStart = currentWindow * this.config.windowMs;
      const windowEnd = windowStart + this.config.windowMs;

      // Получаем текущий счетчик из Supabase
      const response = await fetch(`${this.supabaseUrl}/rest/v1/rate_limit_counts`, {
        headers: {
          apikey: this.supabaseKey,
          Authorization: `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
      });

      let currentCount = 0;
      if (response.ok) {
        const data = await response.json();
        const record = data.find((r: any) => r.key === key);
        if (record) {
          currentCount = record.count;
        }
      }

      const remaining = Math.max(0, this.config.maxRequests - currentCount - 1);
      const reset = windowEnd;

      if (currentCount >= this.config.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          reset,
          retryAfter: Math.ceil((windowEnd - Date.now()) / 1000),
        };
      }

      // Увеличиваем счетчик (в реальном приложении используйте Redis)
      await this.incrementCounter(key, currentWindow);

      return {
        allowed: true,
        remaining,
        reset,
      };
    } catch (error) {
      console.error('[RateLimiter] Error checking limit:', error);
      // При ошибке допускаем запрос (fail-open)
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        reset: Date.now() + this.config.windowMs,
      };
    }
  }

  /**
   * Увеличение счетчика (упрощенная версия - в продакшене используйте Redis)
   */
  private async incrementCounter(key: string, window: number): Promise<void> {
    try {
      const response = await fetch(`${this.supabaseUrl}/rest/v1/rate_limit_counts`, {
        method: 'POST',
        headers: {
          apikey: this.supabaseKey,
          Authorization: `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key,
          window,
          count: 1,
          created_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        console.error('[RateLimiter] Failed to increment counter');
      }
    } catch (error) {
      console.error('[RateLimiter] Error incrementing counter:', error);
    }
  }

  /**
   * Получение заголовков для ответа с rate limit информацией
   */
  getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
    return {
      'X-RateLimit-Limit': this.config.maxRequests.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.reset.toString(),
      ...(result.retryAfter && {
        'Retry-After': result.retryAfter.toString(),
      }),
    };
  }
}

/**
 * Пре-конфигурированные лимиты для разных типов операций
 */
export const RateLimitPresets = {
  // Для чувствительных операций (шифрование/расшифровка)
  sensitive: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 10 запросов в минуту
    keyPrefix: 'ratelimit:sensitive',
  },

  // Для обычных API запросов
  standard: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 100 запросов в минуту
    keyPrefix: 'ratelimit:standard',
  },

  // Для аутентификации (строгий лимит)
  auth: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 5 попыток в 15 минут
    keyPrefix: 'ratelimit:auth',
  },

  // Для записи данных
  write: {
    maxRequests: 50,
    windowMs: 60 * 1000, // 50 запросов в минуту
    keyPrefix: 'ratelimit:write',
  },

  // Для чтения данных
  read: {
    maxRequests: 200,
    windowMs: 60 * 1000, // 200 запросов в минуту
    keyPrefix: 'ratelimit:read',
  },
};

/**
 * Helper функция для создания response с rate limit ошибками
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  const headers = {
    ...corsHeaders,
    'Content-Type': 'application/json',
    'X-RateLimit-Limit': result.reset.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
    'Retry-After': result.retryAfter?.toString() || '60',
  };

  return new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers,
    }
  );
}
