// supabase/functions/rotate-encryption-key/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Дешифровка старым ключом
function decryptWithOldKey(encryptedData: string, iv: string, tag: string): string {
  const OLD_KEY = Deno.env.get('API_KEY_ENCRYPTION_KEY_OLD')!;
  const decipher = createDecipheriv(
    'aes-256-gcm',
    Buffer.from(OLD_KEY, 'hex'),
    Buffer.from(iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedData, 'base64')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

// Шифрование новым ключом
function encryptWithNewKey(data: string) {
  const NEW_KEY = Deno.env.get('API_KEY_ENCRYPTION_KEY')!;
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(NEW_KEY, 'hex'), iv);

  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    encrypted_data: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Проверка авторизации (только админ)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${Deno.env.get('ADMIN_API_KEY')}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Получаем все подключения со старой версией ключа
    const { data: connections, error: fetchError } = await supabase
      .from('exchange_connections')
      .select('id, encrypted_credentials, iv, tag')
      .eq('key_version', 1) // Старая версия
      .limit(50); // Обрабатываем батчами по 50

    if (fetchError) throw fetchError;
    if (!connections?.length) {
      return new Response(
        JSON.stringify({
          success: true,
          migrated: 0,
          message: 'No connections to migrate',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let migrated = 0;
    let failed = 0;

    for (const conn of connections) {
      try {
        // Дешифруем старым ключом
        const decrypted = decryptWithOldKey(conn.encrypted_credentials, conn.iv, conn.tag);

        // Шифруем новым ключом
        const { encrypted_data, iv, tag } = encryptWithNewKey(decrypted);

        // Обновляем запись
        const { error: updateError } = await supabase
          .from('exchange_connections')
          .update({
            encrypted_credentials: encrypted_data,
            iv,
            tag,
            key_version: 2, // Новая версия
            migrated_at: new Date().toISOString(),
          })
          .eq('id', conn.id);

        if (updateError) {
          failed++;
          console.error(`Failed to migrate connection ${conn.id}:`, updateError);
        } else {
          migrated++;
        }
      } catch (e) {
        failed++;
        console.error(`Decryption failed for connection ${conn.id}:`, e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        migrated,
        failed,
        total: connections.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
