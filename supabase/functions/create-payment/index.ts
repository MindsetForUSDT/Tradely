// supabase/functions/create-payment/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Валидные планы и цены
const VALID_PLANS: Record<string, { price: number; currency: string }> = {
  pro_monthly: { price: 29.99, currency: 'USD' },
  pro_yearly: { price: 299.99, currency: 'USD' },
  enterprise_monthly: { price: 99.99, currency: 'USD' },
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Проверка авторизации
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.split(' ')[1];
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Верификация JWT
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Парсинг тела запроса
    const { plan, provider = 'stripe' } = await req.json();

    // Валидация плана
    const planConfig = VALID_PLANS[plan];
    if (!planConfig) {
      return new Response(
        JSON.stringify({
          error: 'Invalid plan',
          availablePlans: Object.keys(VALID_PLANS),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Проверяем, нет ли уже активной подписки
    const { data: existingSub } = await supabase
      .from('user_subscriptions')
      .select('tier, status, expires_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (existingSub) {
      // Если подписка активна и пытаемся купить тот же уровень
      if (existingSub.tier === 'pro' && plan.startsWith('pro')) {
        return new Response(
          JSON.stringify({
            error: 'You already have an active Pro subscription',
            expiresAt: existingSub.expires_at,
          }),
          {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Генерация идемпотентного ключа
    const idempotencyKey = `${user.id}_${plan}_${Date.now()}`;

    // Создание платежа (заглушка — в реальности вызов Stripe/Crypto API)
    const mockPaymentUrl = `https://payment.tradeumdiary.com/pay?plan=${plan}&userId=${user.id}&key=${idempotencyKey}`;

    // Логируем создание платежа
    await supabase.from('payment_attempts').insert({
      user_id: user.id,
      plan,
      provider,
      idempotency_key: idempotencyKey,
      status: 'pending',
      amount: planConfig.price,
      currency: planConfig.currency,
      created_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        paymentUrl: mockPaymentUrl,
        amount: planConfig.price,
        currency: planConfig.currency,
        plan,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (e: any) {
    console.error('Create payment error:', e.message);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
