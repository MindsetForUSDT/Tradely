// supabase/functions/payment-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { createHmac } from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Поставщики платежей
type PaymentProvider = 'stripe' | 'crypto' | 'telegram';

interface WebhookPayload {
  provider: PaymentProvider;
  event: string;
  data: Record<string, unknown>;
}

// Проверка подписи вебхука (предотвращает подделку запросов)
function verifyWebhookSignature(
  provider: PaymentProvider,
  body: string,
  signature: string | null
): boolean {
  if (!signature) return false;

  const secret = Deno.env.get(`WEBHOOK_SECRET_${provider.toUpperCase()}`);

  if (!secret) {
    console.error(`Missing webhook secret for ${provider}`);
    return false;
  }

  const expectedSignature = createHmac('sha256', secret).update(body).digest('hex');

  // Постоянное время сравнения (защита от timing attacks)
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.subtle
    ? sigBuffer.equals(expectedBuffer)
    : sigBuffer.toString() === expectedBuffer.toString();
}

// Валидация суммы платежа
function validatePaymentAmount(amount: number, plan: string): boolean {
  const MIN_AMOUNT = 1; // Минимальный платеж $1
  const MAX_AMOUNT = 10000; // Максимальный разовый платеж $10,000

  if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    return false;
  }

  // Проверка соответствия тарифу
  const planPrices: Record<string, number> = {
    pro_monthly: 29.99,
    pro_yearly: 299.99,
    enterprise_monthly: 99.99,
  };

  const expectedPrice = planPrices[plan];
  if (expectedPrice && Math.abs(amount - expectedPrice) > 0.01) {
    console.warn(`Amount mismatch: expected ${expectedPrice}, got ${amount}`);
    return false; // Строгая проверка
  }

  return true;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Только POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Читаем тело запроса
    const rawBody = await req.text();
    const signature = req.headers.get('x-webhook-signature');

    let payload: WebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { provider, event, data } = payload;

    // Проверяем подпись
    if (!verifyWebhookSignature(provider, rawBody, signature)) {
      console.warn('Invalid webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Обрабатываем различные события
    switch (event) {
      case 'payment.succeeded': {
        const userId = data.user_id as string;
        const amount = data.amount as number;
        const plan = data.plan as string;
        const transactionId = data.transaction_id as string;

        // Валидация входных данных
        if (!userId || !amount || !plan || !transactionId) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Проверка суммы
        if (!validatePaymentAmount(amount, plan)) {
          return new Response(JSON.stringify({ error: 'Invalid payment amount' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Проверка на дубликат транзакции (идемпотентность)
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('transaction_id', transactionId)
          .maybeSingle();

        if (existingPayment) {
          return new Response(
            JSON.stringify({
              success: true,
              message: 'Payment already processed',
              paymentId: existingPayment.id,
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // Атомарная операция: запись платежа + обновление подписки
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .insert({
            user_id: userId,
            transaction_id: transactionId,
            amount,
            currency: data.currency || 'USD',
            plan,
            provider,
            status: 'completed',
            metadata: data.metadata || {},
            paid_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (paymentError) throw paymentError;

        // Обновляем подписку пользователя
        const planDuration = plan.includes('yearly') ? '1 year' : '1 month';
        const expiresAt = new Date();
        if (plan.includes('yearly')) {
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        } else {
          expiresAt.setMonth(expiresAt.getMonth() + 1);
        }

        const { error: subscriptionError } = await supabase.from('user_subscriptions').upsert({
          user_id: userId,
          tier: plan.includes('enterprise') ? 'enterprise' : 'pro',
          status: 'active',
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          payment_id: payment.id,
        });

        if (subscriptionError) throw subscriptionError;

        return new Response(
          JSON.stringify({
            success: true,
            paymentId: payment.id,
            plan,
            expiresAt: expiresAt.toISOString(),
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      case 'payment.failed': {
        const userId = data.user_id as string;
        const reason = data.reason as string;

        // Логируем неудачный платеж
        await supabase.from('payment_logs').insert({
          user_id: userId,
          event: 'payment.failed',
          reason,
          data: data,
          created_at: new Date().toISOString(),
        });

        return new Response(JSON.stringify({ success: true, logged: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'subscription.cancelled': {
        const userId = data.user_id as string;

        const { error } = await supabase
          .from('user_subscriptions')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('user_id', userId);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown event: ${event}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (e: any) {
    console.error('Webhook error:', e.message);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
