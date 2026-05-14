// supabase/functions/encrypt-credentials/index.ts
// Edge Function для шифрования API-ключей бирж на сервере
// Улучшенная версия с rate limiting, аудитом и детекцией аномалий

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { RateLimiter, RateLimitPresets, createRateLimitResponse } from '../lib/rate-limiter.ts';
import { SecurityAuditor, getSecurityAuditor } from '../lib/security-audit.ts';
import { AnomalyDetector } from '../lib/anomaly-detector.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Security-Policy': "default-src 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

// Константы валидации
const MAX_API_KEY_LENGTH = 256;
const MAX_API_SECRET_LENGTH = 512;
const ENCRYPTION_KEY_PATTERN = /^[0-9a-f]{64}$/i;
const REQUEST_TIMEOUT_MS = 10000;

/**
 * Валидация входных данных с защитой от инъекций
 */
function validateInput(
  apiKey: unknown,
  apiSecret: unknown
): {
  valid: boolean;
  error?: string;
} {
  if (typeof apiKey !== 'string' || typeof apiSecret !== 'string') {
    return { valid: false, error: 'API key and secret must be strings' };
  }

  if (!apiKey.trim() || !apiSecret.trim()) {
    return { valid: false, error: 'API key and secret cannot be empty' };
  }

  if (apiKey.length > MAX_API_KEY_LENGTH) {
    return { valid: false, error: `API key exceeds maximum length of ${MAX_API_KEY_LENGTH}` };
  }

  if (apiSecret.length > MAX_API_SECRET_LENGTH) {
    return { valid: false, error: `API secret exceeds maximum length of ${MAX_API_SECRET_LENGTH}` };
  }

  const suspiciousPatterns = [/[\0\r\n]/, /<script/i, /javascript:/i, /on\w+\s*=/i];

  const combinedInput = apiKey + apiSecret;
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(combinedInput)) {
      return { valid: false, error: 'Invalid characters detected' };
    }
  }

  return { valid: true };
}

/**
 * Timing-safe сравнение для авторизации
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    crypto.getRandomValues(new Uint8Array(a.length));
    return false;
  }

  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  let result = 0;

  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }

  return result === 0;
}

serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  const startTime = Date.now();
  const clientIp =
    req.headers.get('X-Forwarded-For')?.split(',')[0] || req.headers.get('X-Real-IP') || 'unknown';

  // Инициализация компонентов безопасности
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const rateLimiter = new RateLimiter(RateLimitPresets.sensitive, supabaseUrl, serviceKey);

  const auditor = getSecurityAuditor(supabaseUrl, serviceKey);
  const anomalyDetector = new AnomalyDetector({}, supabaseUrl, serviceKey);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    // Rate limiting
    const rateLimitResult = await rateLimiter.checkLimit(clientIp, requestId);
    if (!rateLimitResult.allowed) {
      await auditor.logRateLimitExceeded(
        req,
        'anonymous',
        rateLimitResult.remaining,
        rateLimitResult.reset
      );
      const response = createRateLimitResponse(rateLimitResult);
      Object.entries(rateLimiter.getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Проверка авторизации
    const adminApiKey = Deno.env.get('ADMIN_API_KEY');
    const authHeader = req.headers.get('Authorization');

    if (!adminApiKey) {
      await auditor.logEvent('ERROR', req, { issue: 'admin_api_key_not_configured' }, undefined);
      return new Response(JSON.stringify({ error: 'Internal configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      await auditor.logAuthFailure(req, 'missing_or_invalid_header', 1, undefined);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const providedToken = authHeader.substring(7);

    if (!timingSafeEqual(providedToken, adminApiKey)) {
      await auditor.logAuthFailure(req, 'invalid_token', 1, undefined);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Парсинг тела запроса
    let body: unknown;
    try {
      const textBody = await req.text();
      if (textBody.length > 10240) {
        throw new Error('Request body too large');
      }
      body = JSON.parse(textBody);
    } catch {
      await auditor.logEvent('ERROR', req, { error: 'invalid_json' }, undefined);
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { apiKey, apiSecret } = body as Record<string, unknown>;

    const validation = validateInput(apiKey, apiSecret);
    if (!validation.valid) {
      await auditor.logEvent('ERROR', req, { reason: validation.error }, undefined);
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Получение ключей шифрования
    const ENCRYPTION_KEY = Deno.env.get('API_KEY_ENCRYPTION_KEY');
    const ENCRYPTION_KEY_NEW = Deno.env.get('API_KEY_ENCRYPTION_KEY_NEW');

    if (!ENCRYPTION_KEY && !ENCRYPTION_KEY_NEW) {
      await auditor.logEvent('ERROR', req, { issue: 'no_encryption_keys_configured' }, undefined);
      return new Response(JSON.stringify({ error: 'Internal configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const keyToUse = ENCRYPTION_KEY_NEW || ENCRYPTION_KEY!;

    if (!ENCRYPTION_KEY_PATTERN.test(keyToUse)) {
      await auditor.logEvent('ERROR', req, { issue: 'invalid_encryption_key_format' }, undefined);
      return new Response(JSON.stringify({ error: 'Internal configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Шифрование
    const data = JSON.stringify({
      apiKey: apiKey.trim(),
      apiSecret: apiSecret.trim(),
      timestamp: Date.now(),
      version: 1,
    });

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const keyData = new TextEncoder().encode(keyToUse);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      cryptoKey,
      new TextEncoder().encode(data)
    );

    const encryptedData = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    const ivBase64 = btoa(String.fromCharCode(...iv));

    // Логирование успеха
    await auditor.logEncryptionOperation(req, 'service', 'encrypt_api_credentials', true);

    // Проверка на аномалии
    const anomalies = await anomalyDetector.checkAllAnomalies(
      undefined,
      clientIp,
      0,
      0,
      1,
      new Date()
    );

    if (anomalies.length > 0) {
      await auditor.logEvent(
        'SUSPICIOUS_ACTIVITY',
        req,
        { anomalies: anomalies.map((a) => a.type) },
        undefined
      );
    }

    // Логирование запроса
    const responseTime = Date.now() - startTime;
    await fetch(`${supabaseUrl}/rest/v1/api_requests`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: null,
        endpoint: 'encrypt-credentials',
        method: req.method,
        status_code: 200,
        response_time_ms: responseTime,
        ip_address: clientIp,
        metadata: { requestId, anomalies: anomalies.length },
      }),
    });

    clearTimeout(timeoutId);

    return new Response(
      JSON.stringify({
        encrypted_data: encryptedData,
        iv: ivBase64,
        tag: '',
        version: 1,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          ...rateLimiter.getRateLimitHeaders(rateLimitResult),
        },
      }
    );
  } catch (error) {
    await auditor.logEvent(
      'ERROR',
      req,
      {
        type: error instanceof Error ? error.name : 'UnknownError',
        message: 'An error occurred during encryption',
      },
      undefined
    );

    return new Response(JSON.stringify({ error: 'Encryption failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
