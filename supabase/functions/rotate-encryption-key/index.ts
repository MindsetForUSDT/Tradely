// supabase/functions/rotate-encryption-key/index.ts
// Улучшенная версия с дополнительными мерами безопасности
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Security-Policy': "default-src 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

// Константы
const BATCH_SIZE = 50;
const MAX_ROTATION_RECORDS = 1000;
const ENCRYPTION_KEY_PATTERN = /^[0-9a-f]{64}$/i;

/**
 * Безопасное логирование (без чувствительных данных)
 */
function secureLog(action: string, details?: Record<string, unknown>) {
  const safeDetails = {
    action,
    timestamp: new Date().toISOString(),
    ...details,
  };
  console.log('[rotate-encryption-key]', JSON.stringify(safeDetails));
}

/**
 * Timing-safe сравнение для авторизации
 */
function timingSafeAuth(provided: string, expected: string): boolean {
  if (!expected || !provided) return false;
  if (expected.length !== provided.length) {
    // Избегаем утечки информации через время
    randomBytes(provided.length);
    return false;
  }
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

/**
 * Валидация ключа шифрования
 */
function validateEncryptionKey(key: unknown): boolean {
  return typeof key === 'string' && ENCRYPTION_KEY_PATTERN.test(key);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().substring(0, 8);

  try {
    // Проверка таймаута
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 секунд для ротации

    // Проверка авторизации с timing-safe сравнением
    const authHeader = req.headers.get('authorization');
    const adminApiKey = Deno.env.get('ADMIN_API_KEY');

    if (!adminApiKey) {
      secureLog('error', { requestId, issue: 'admin_api_key_not_configured' });
      return new Response(JSON.stringify({ error: 'Internal configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      secureLog('auth_failure', { requestId, reason: 'missing_or_invalid_header' });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const providedToken = authHeader.substring(7);

    if (!timingSafeAuth(providedToken, adminApiKey)) {
      secureLog('auth_failure', { requestId, reason: 'invalid_token' });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Валидация ключей шифрования
    const oldKey = Deno.env.get('API_KEY_ENCRYPTION_KEY_OLD');
    const newKey = Deno.env.get('API_KEY_ENCRYPTION_KEY');

    if (!oldKey || !newKey) {
      secureLog('error', { requestId, issue: 'encryption_keys_not_configured' });
      return new Response(JSON.stringify({ error: 'Encryption keys not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!validateEncryptionKey(oldKey) || !validateEncryptionKey(newKey)) {
      secureLog('error', { requestId, issue: 'invalid_encryption_key_format' });
      return new Response(JSON.stringify({ error: 'Invalid encryption key format' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Получаем все подключения со старой версией ключа (батчами)
    let offset = 0;
    let totalMigrated = 0;
    let totalFailed = 0;
    let hasMore = true;

    while (hasMore && totalMigrated + totalFailed < MAX_ROTATION_RECORDS) {
      const { data: connections, error: fetchError } = await supabase
        .from('exchange_connections')
        .select('id, encrypted_credentials, iv, tag', { count: 'exact' })
        .eq('key_version', 1) // Старая версия
        .range(offset, offset + BATCH_SIZE - 1);

      if (fetchError) {
        secureLog('error', { requestId, step: 'fetch', error: fetchError.message });
        throw fetchError;
      }

      if (!connections || connections.length === 0) {
        hasMore = false;
        break;
      }

      let batchMigrated = 0;
      let batchFailed = 0;

      for (const conn of connections) {
        try {
          // Дешифруем старым ключом
          const decipher = createDecipheriv(
            'aes-256-gcm',
            Buffer.from(oldKey, 'hex'),
            Buffer.from(conn.iv, 'base64')
          );
          decipher.setAuthTag(Buffer.from(conn.tag, 'base64'));

          const decrypted = Buffer.concat([
            decipher.update(Buffer.from(conn.encrypted_credentials, 'base64')),
            decipher.final(),
          ]);

          // Шифруем новым ключом
          const iv = randomBytes(12); // AES-GCM требует 12 байт IV
          const cipher = createCipheriv('aes-256-gcm', Buffer.from(newKey, 'hex'), iv);

          const encrypted = Buffer.concat([cipher.update(decrypted), cipher.final()]);
          const tag = cipher.getAuthTag();

          // Обновляем запись
          const { error: updateError } = await supabase
            .from('exchange_connections')
            .update({
              encrypted_credentials: encrypted.toString('base64'),
              iv: iv.toString('base64'),
              tag: tag.toString('base64'),
              key_version: 2, // Новая версия
              migrated_at: new Date().toISOString(),
            })
            .eq('id', conn.id);

          if (updateError) {
            batchFailed++;
            secureLog('migration_failed', {
              requestId,
              connectionId: conn.id,
              error: 'update_error',
            });
          } else {
            batchMigrated++;
          }
        } catch (e) {
          batchFailed++;
          secureLog('migration_failed', {
            requestId,
            connectionId: conn.id,
            error: e instanceof Error ? e.message : 'unknown',
          });
        }
      }

      totalMigrated += batchMigrated;
      totalFailed += batchFailed;
      offset += BATCH_SIZE;

      secureLog('batch_complete', {
        requestId,
        batchMigrated,
        batchFailed,
        totalMigrated,
        totalFailed,
      });

      // Проверяем, есть ли ещё записи
      hasMore = batchMigrated + batchFailed === BATCH_SIZE;
    }

    clearTimeout(timeoutId);

    secureLog('rotation_complete', {
      requestId,
      totalMigrated,
      totalFailed,
    });

    return new Response(
      JSON.stringify({
        success: true,
        migrated: totalMigrated,
        failed: totalFailed,
        message:
          totalFailed === 0
            ? 'All records migrated successfully'
            : 'Some records failed to migrate',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (e: any) {
    secureLog('error', {
      requestId,
      type: e.name || 'UnknownError',
      message: e.message,
    });

    return new Response(JSON.stringify({ error: 'Encryption key rotation failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
