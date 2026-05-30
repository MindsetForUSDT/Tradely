/**
 * Database Wake-up Utility
 * Для локальной БД - просто проверяем подключение
 */

let isAwakening = false;

export async function wakeUpDatabase(): Promise<void> {
  if (isAwakening) return;
  isAwakening = true;

  try {
    const startTime = Date.now();

    const response = await fetch('http://localhost:3001/health', {
      method: 'GET',
    });

    const duration = Date.now() - startTime;

    if (response.ok) {
      // Database ready
      console.log(`[Database Wake] Ready (${duration}ms)`);
    } else {
      console.warn('[Database Wake] ⚠️ Health check failed');
    }
  } catch (error) {
    // Silently handle database wake errors
    console.error('[Database Wake] Error:', error);
  } finally {
    isAwakening = false;
  }
}

/**
 * Автоматически "будим" базу каждые 45 минут
 */
export function startDatabaseKeepAlive(): void {
  // Пробуждаем каждые 45 минут
  setInterval(
    async () => {
      await wakeUpDatabase();
    },
    45 * 60 * 1000
  );

  // Также пробуем при возврате во вкладку
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', async () => {
      if (!document.hidden) {
        await wakeUpDatabase();
      }
    });
  }
}
