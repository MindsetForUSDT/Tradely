/**
 * Database Wake-up Utility
 * Для локальной БД - просто проверяем подключение
 */

let isAwakening = false;

export async function wakeUpDatabase(): Promise<void> {
  if (isAwakening) return;

  isAwakening = true;

  try {
    const response = await fetch('http://localhost:3001/health', {
      method: 'GET',
    });

    if (!response.ok) {
      console.warn('[Database Wake] Health check failed');
    }
  } catch {
    // Локальный сервер может быть не запущен — не ломаем сайт
  } finally {
    isAwakening = false;
  }
}

/**
 * Автоматически проверяем локальный сервер каждые 45 минут
 */
export function startDatabaseKeepAlive(): void {
  setInterval(
    () => {
      void wakeUpDatabase();
    },
    45 * 60 * 1000
  );

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        void wakeUpDatabase();
      }
    });
  }
}
