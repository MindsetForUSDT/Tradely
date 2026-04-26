// ============================================================
// TradeumDiary — Edge Function для обработки вебхуков YooKassa
// Принимает уведомления о платежах и обновляет подписку
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Типы для вебхука YooKassa
interface YooKassaWebhook {
  type: 'notification';
  event: 'payment.succeeded' | 'payment.canceled' | 'payment.waiting_for_capture';
  object: {
    id: string;
    status: 'succeeded' | 'canceled' | 'pending';
    amount: {
      value: string;
      currency: string;
    };
    metadata?: {
      user_id: string;
    };
    captured_at?: string;
  };
}

// CORS заголовки
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  // Обработка CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Только POST запросы
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: YooKassaWebhook = await req.json();

    // Проверяем тип уведомления
    if (body.type !== 'notification') {
      return new Response(JSON.stringify({ error: 'Invalid notification type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Инициализируем Supabase с Service Role Key (серверный доступ)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const payment = body.object;
    const userId = payment.metadata?.user_id;

    if (!userId) {
      console.error('❌ Нет user_id в метаданных платежа');
      return new Response(JSON.stringify({ error: 'Missing user_id in metadata' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Обрабатываем успешный платёж
    if (body.event === 'payment.succeeded' && payment.status === 'succeeded') {
      console.log(`✅ Платёж ${payment.id} подтверждён для пользователя ${userId}`);

      // Активируем PRO-подписку на 30 дней
      const subscriptionExpiresAt = new Date();
      subscriptionExpiresAt.setDate(subscriptionExpiresAt.getDate() + 30);

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          subscription_tier: 'pro',
          subscription_expires_at: subscriptionExpiresAt.toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Ошибка обновления подписки:', updateError.message);
        return new Response(JSON.stringify({ error: 'Failed to update subscription' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`🎉 PRO-подписка активирована для ${userId} до ${subscriptionExpiresAt.toISOString()}`);

      // Отправляем email-уведомление (опционально)
      // await sendEmail(userId, 'PRO-подписка активирована');
    }

    // Обрабатываем отмену платежа
    if (body.event === 'payment.canceled') {
      console.log(`❌ Платёж ${payment.id} отменён для пользователя ${userId}`);
      // Можно добавить логику обработки отмены
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Ошибка обработки вебхука:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});