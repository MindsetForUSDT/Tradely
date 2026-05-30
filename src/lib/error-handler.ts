/**
 * Global Error Handler
 * Централизованная обработка ошибок Supabase
 */

import toast from 'react-hot-toast';

export interface AppError {
  code: string;
  message: string;
  details?: string;
  hint?: string;
  retryable?: boolean;
}

/**
 * Парсит ошибку Supabase и возвращает понятное сообщение
 */
export function parseSupabaseError(error: unknown): AppError {
  if (!error || typeof error !== 'object') {
    return {
      code: 'UNKNOWN_ERROR',
      message: 'Неизвестная ошибка',
      retryable: true,
    };
  }

  const err = error as any;
  const code = err.code || err.status?.toString() || 'UNKNOWN_ERROR';
  const message = err.message || err.error_description || 'Произошла ошибка';
  const details = err.details || err.hint;

  // Маппинг ошибок Supabase
  const errorMap: Record<string, { message: string; retryable: boolean }> = {
    // Ошибки сети
    'Failed to fetch': {
      message: 'Ошибка сети. Проверьте подключение к интернету.',
      retryable: true,
    },
    ERR_CONNECTION_RESET: {
      message: 'Сервер временно не отвечает. Попробуйте обновить страницу.',
      retryable: true,
    },
    ERR_HTTP2_PING_FAILED: {
      message: 'Соединение с сервером потеряно. Обновите страницу.',
      retryable: true,
    },

    // Ошибки базы данных (free tier sleep)
    '503': {
      message: 'База данных "заснула". Подождите 30-60 секунд и обновите страницу.',
      retryable: true,
    },
    'Connection reset': {
      message: 'База данных "просыпается". Подождите 30-60 секунд и обновите страницу.',
      retryable: true,
    },

    // Ошибки авторизации
    '401': {
      message: 'Сессия истекла. Пожалуйста, войдите снова.',
      retryable: false,
    },
    '403': {
      message: 'Нет доступа к данным. Проверьте настройки безопасности.',
      retryable: false,
    },

    // Ошибки дубликатов
    '23505': {
      message: 'Этот объект уже существует.',
      retryable: false,
    },

    // Ошибки таймаута
    timeout: {
      message: 'Превышено время ожидания. Попробуйте позже.',
      retryable: true,
    },

    // Ошибки триггеров
    '42601': {
      message: 'Ошибка синтаксиса. Попробуйте удалить и добавить снова.',
      retryable: false,
    },
    'INSERT has more expressions than target columns': {
      message: 'Ошибка структуры данных. Обновите страницу и попробуйте снова.',
      retryable: true,
    },
  };

  const mapped = errorMap[code] ||
    errorMap[message] || {
      message: message,
      retryable: true,
    };

  return {
    code,
    message: mapped.message,
    details,
    hint: err.hint,
    retryable: mapped.retryable,
  };
}

/**
 * Показывает ошибку пользователю
 */
export function showError(error: unknown, _defaultMessage?: string) {
  const parsed = parseSupabaseError(error);
  toast.error(parsed.message, {
    duration: 5000,
    id: `error-${Date.now()}`,
  });

  // Логируем детали для отладки
  if (parsed.details || parsed.hint) {
    // Error details logged for debugging
  }
}

/**
 * Повторяет операцию с экспоненциальной задержкой
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 2,
  initialDelay = 2000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const parsed = parseSupabaseError(error);

      // Если ошибка не повторятельная - сразу прерываем
      if (!parsed.retryable) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Обертка для операций с таймаутом
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation "${operationName}" timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]) as Promise<T>;
}
