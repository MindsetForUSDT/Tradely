/**
 * Database Wake-up Utility
 * "Разбуживает" Supabase базу при загрузке страницы
 * Для free tier - база засыпает после 1 часа бездействия
 */

import { supabase } from './supabase';

let isAwakening = false;
let lastWakeTime = 0;

/**
 * "Разбудить" базу (кэширует чтобы не делать лишние запросы)
 */
export async function wakeUpDatabase(): Promise<boolean> {
  // Не чаще чем раз в 5 минут
  const now = Date.now();
  if (now - lastWakeTime < 300000 && isAwakening) {
    return true;
  }

  isAwakening = true;
  console.log('[Database] Waking up...');

  try {
    const startTime = Date.now();

    // Делаем простой запрос к базе
    const { data, error } = await supabase.from('profiles').select('id').limit(1);

    const duration = Date.now() - startTime;

    if (error) {
      console.error('[Database] Wake-up failed:', error.message);
      isAwakening = false;
      return false;
    }

    console.log(`[Database] ✅ Awake in ${duration}ms`);
    lastWakeTime = Date.now();
    isAwakening = false;
    return true;
  } catch (error: any) {
    console.error('[Database] Wake-up error:', error.message);
    isAwakening = false;
    return false;
  }
}

/**
 * Автоматически "будим" базу каждые 45 минут
 */
export function startDatabaseKeepAlive() {
  // Пробуждаем каждые 45 минут (до того как база уснёт)
  setInterval(
    async () => {
      await wakeUpDatabase();
    },
    45 * 60 * 1000
  ); // 45 минут

  // Также пробуем при возврате в вкладку
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', async () => {
      if (!document.hidden) {
        await wakeUpDatabase();
      }
    });
  }
}
