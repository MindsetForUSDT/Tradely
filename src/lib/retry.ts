// supabase/lib/retry.ts
// Утилита для повторения запросов с экспоненциальной задержкой

export interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

export async function retry<T>(fn: () => Promise<T>, config: RetryConfig = {}): Promise<T> {
  const { maxRetries = 3, initialDelay = 1000, maxDelay = 10000, backoffMultiplier = 2 } = config;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Не повторяем для определённых ошибок
      if (error.name === 'AbortError' || error.message?.includes('404')) {
        throw error;
      }

      // Если это последняя попытка - выбрасываем ошибку
      if (attempt === maxRetries) {
        break;
      }

      // Вычисляем задержку с экспоненциальным увеличением
      const delay = Math.min(initialDelay * Math.pow(backoffMultiplier, attempt), maxDelay);

      console.log(`[retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);

      // Ждём перед повторной попыткой
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Удобная обёртка для Supabase запросов
export async function supabaseQuery<T>(
  fn: () => Promise<{ data: T | null; error: any }>
): Promise<T> {
  const result = await retry(async () => {
    const response = await fn();

    if (response.error) {
      throw new Error(response.error.message || 'Supabase query failed');
    }

    return response.data;
  });

  if (result === null) {
    throw new Error('Query returned null data');
  }

  return result;
}
