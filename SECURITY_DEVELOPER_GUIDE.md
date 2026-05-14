# Руководство разработчика по безопасности

## 📖 Введение

Это руководство описывает如何使用 внедрённые системы безопасности при разработке новых функций.

---

## 🛡️ Rate Limiting

### Использование в Edge Functions

```typescript
import { RateLimiter, RateLimitPresets, createRateLimitResponse } from '../lib/rate-limiter.ts';

// Инициализация
const rateLimiter = new RateLimiter(
  RateLimitPresets.sensitive, // или standard, auth, write, read
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Проверка лимита
const rateLimitResult = await rateLimiter.checkLimit(clientIp, requestId);

if (!rateLimitResult.allowed) {
  const response = createRateLimitResponse(rateLimitResult);
  // Добавляем headers
  Object.entries(rateLimiter.getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

// В успешном случае добавляем headers к ответу
return new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, ...rateLimiter.getRateLimitHeaders(rateLimitResult) },
});
```

### Настройка лимитов

```typescript
// Кастомные лимиты
const customLimiter = new RateLimiter(
  {
    maxRequests: 50,
    windowMs: 60 * 1000, // 1 минута
    keyPrefix: 'ratelimit:custom',
  },
  supabaseUrl,
  supabaseKey
);
```

---

## 🔒 Аудит безопасности

### Логирование событий

```typescript
import { getSecurityAuditor } from '../lib/security-audit.ts';

const auditor = getSecurityAuditor(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  Deno.env.get('SIEM_WEBHOOK') // Опционально
);

// Типы событий
await auditor.logAuthSuccess(req, userId, 'password');
await auditor.logAuthFailure(req, 'invalid_password', 1, userId);
await auditor.logAuthLockout(req, userId, 5);
await auditor.logEncryptionOperation(req, userId, 'encrypt_api_credentials', true);
await auditor.logDecryptionOperation(req, userId, true);
await auditor.logKeyRotation(req, adminUserId, 150);
await auditor.logRateLimitExceeded(req, userId, 100, 60000);
await auditor.logAdminAction(req, adminUserId, 'delete_user', { targetUserId });
await auditor.logConfigurationChange(req, adminUserId, 'rate_limit', 100, 200);

// Кастомное событие
await auditor.logEvent('DATA_ACCESS', req, { resource: 'trades', action: 'bulk_export' }, userId);
```

### Уровень серьёзности

Система автоматически определяет уровень серьёзности:

- **INFO** - обычные операции
- **WARNING** - потенциально проблемные операции
- **CRITICAL** - критические события (блокировки, привилегии)
- **ERROR** - ошибки

---

## 🚨 Мониторинг аномалий

### Проверка аномалий

```typescript
import { AnomalyDetector } from '../lib/anomaly-detector.ts';

const anomalyDetector = new AnomalyDetector(
  {
    maxFailedAuthPerUser: 5,
    maxFailedAuthPerIp: 20,
    maxDecryptionFailuresPerUser: 10,
    maxRequestsPerMinute: 100,
  },
  supabaseUrl,
  supabaseKey
);

// Полная проверка
const anomalies = await anomalyDetector.checkAllAnomalies(
  userId,
  clientIp,
  authFailures,
  decryptionFailures,
  requestCount,
  new Date()
);

if (anomalies.length > 0) {
  // Обработка аномалий
  for (const anomaly of anomalies) {
    console.error('Anomaly detected:', anomaly.type, anomaly.severity);

    // Критические аномалии требуют немедленной реакции
    if (anomaly.severity === 'CRITICAL') {
      // Блокировка, уведомление и т.д.
    }
  }
}
```

### Регистрация callback для алертов

```typescript
anomalyDetector.registerAlertCallback(async (alert) => {
  // Отправка в Slack/Discord/Email
  await fetch(process.env.SLACK_WEBHOOK, {
    method: 'POST',
    body: JSON.stringify({
      text: `🚨 Security Alert: ${alert.type}\n${alert.description}`,
    }),
  });
});
```

---

## 🔑 KMS (Key Management Service)

### Использование KMS

```typescript
import { KMSManager } from '../lib/kms.ts';

// Для разработки
const kms = KMSManager.createDevelopment();

// Для production (после выбора провайдера)
// const kms = KMSManager.createProduction('aws'); // или 'gcp', 'azure', 'vault'

// Получение или создание ключа
const key = await kms.getOrCreateEncryptionKey();
console.log('Key ID:', key.id);

// Шифрование
const encrypted = await kms.encrypt('sensitive data', 'api-credentials');
console.log('Encrypted:', encrypted);

// Расшифровка
const decrypted = await kms.decrypt(encrypted);
console.log('Decrypted:', decrypted);

// Ротация ключа
const newKey = await kms.rotateEncryptionKey();
console.log('New key version:', newKey.version);
```

### Хранение ключей в production

Для production использования необходимо:

1. **Выбрать провайдера:**
   - AWS KMS - если инфраструктура на AWS
   - GCP Cloud KMS - если на GCP
   - Azure Key Vault - если на Azure
   - HashiCorp Vault - если используете Vault

2. **Реализовать провайдер:**
   ```typescript
   // Пример реализации для AWS KMS
   class AWSSKMSProvider extends KMSProvider {
     private client = new KMSClient({});

     async getPublicKey(keyId: string): Promise<string> {
       const command = new GetPublicKeyCommand({ KeyId: keyId });
       const response = await this.client.send(command);
       return bufferToBase64(response.PublicKey);
     }

     // ... другие методы
   }
   ```

---

## 🌐 Клиентская безопасность

### Инициализация security middleware

```typescript
// В root компоненте приложения
import { initSecurityMiddleware } from '@/lib/securityMiddleware';

function App() {
  useEffect(() => {
    initSecurityMiddleware();
  }, []);

  // ...
}
```

### Использование функций безопасности

```typescript
import {
  sanitizeHTML,
  sanitizeURL,
  generateCSRFToken,
  validateCSRFToken,
} from '@/lib/securityMiddleware';

// Санитизация HTML
const safeHTML = sanitizeHTML(userInput);

// Санитизация URL
const safeURL = sanitizeURL(inputURL);
if (!safeURL) {
  // Блокируем опасный URL
}

// CSRF token
const csrfToken = await generateCSRFToken();
// Отправляем с формой или в header

// Валидация CSRF
if (!validateCSRFToken(providedToken, expectedToken)) {
  throw new Error('CSRF validation failed');
}
```

---

## 📊 Работа с данными аудита

### SQL запросы для анализа

```sql
-- Последние критические события
SELECT * FROM public.recent_critical_events;

-- Новые алерты аномалий
SELECT * FROM public.new_anomaly_alerts;

-- Статистика неудач аутентификации за 24 часа
SELECT * FROM public.auth_failure_stats_24h;

-- Топ нарушителей rate limit
SELECT
  ip_address,
  COUNT(*) as violations
FROM public.rate_limit_counts
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address
ORDER BY violations DESC;
```

### Создание представлений

```sql
-- Свой вид для мониторинга
CREATE VIEW public.security_dashboard AS
SELECT
  event_type,
  severity,
  COUNT(*) as count,
  DATE_TRUNC('hour', timestamp) as hour
FROM public.security_events
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY event_type, severity, hour;
```

---

## 🧪 Тестирование

### Unit тесты для rate limiter

```typescript
import { RateLimiter, RateLimitPresets } from '../lib/rate-limiter';

describe('RateLimiter', () => {
  it('должен разрешать запросы в пределах лимита', async () => {
    const limiter = new RateLimiter({ maxRequests: 5, windowMs: 60000 }, 'http://test', 'test-key');

    for (let i = 0; i < 5; i++) {
      const result = await limiter.checkLimit('192.168.1.1', 'test-id');
      expect(result.allowed).toBe(true);
    }
  });

  it('должен блокировать запросы превышающие лимит', async () => {
    const limiter = new RateLimiter({ maxRequests: 3, windowMs: 60000 }, 'http://test', 'test-key');

    await limiter.checkLimit('192.168.1.1', 'id1');
    await limiter.checkLimit('192.168.1.1', 'id2');
    await limiter.checkLimit('192.168.1.1', 'id3');

    const result = await limiter.checkLimit('192.168.1.1', 'id4');
    expect(result.allowed).toBe(false);
  });
});
```

### Тестирование аудита

```typescript
import { SecurityAuditor } from '../lib/security-audit';

describe('SecurityAuditor', () => {
  it('должен логировать событие аутентификации', async () => {
    const auditor = new SecurityAuditor('http://test', 'test-key');

    const req = new Request('http://test');
    await auditor.logAuthSuccess(req, 'user-id', 'password');

    // Проверка записи в БД
    const { data } = await supabase
      .from('security_events')
      .select('*')
      .eq('event_type', 'AUTH_SUCCESS')
      .single();

    expect(data.user_id).toBe('user-id');
  });
});
```

---

## 🔧 Конфигурация

### Переменные окружения

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Admin API
ADMIN_API_KEY=your-admin-api-key

# SIEM (опционально)
SIEM_WEBHOOK=https://your-siem.example.com/webhook

# KMS (для production)
KMS_PROVIDER=aws  # или gcp, azure, vault
AWS_KMS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### Настройка алертов

```typescript
// Настройка порогов для детекции аномалий
const anomalyConfig = {
  maxFailedAuthPerUser: 5, // Макс. неудачных логин на пользователя
  maxFailedAuthPerIp: 20, // Макс. неудачных логин с IP
  maxDecryptionFailuresPerUser: 10, // Макс. неудачных расшифровок
  maxRequestsPerMinute: 100, // Макс. запросов в минуту
  suspiciousTokenLength: 10000, // Подозрительная длина токена

  // Временные окна
  authWindowMs: 15 * 60 * 1000, // 15 минут
  decryptionWindowMs: 60 * 60 * 1000, // 1 час
  requestWindowMs: 60 * 1000, // 1 минута
};
```

---

## 🚨 Реагирование на инциденты

### Чеклист при обнаружении аномалии

1. **Определить тип аномалии**

   ```sql
   SELECT * FROM public.anomaly_alerts
   WHERE timestamp > NOW() - INTERVAL '1 hour'
   ORDER BY timestamp DESC;
   ```

2. **Оценить критичность**
   - CRITICAL: Немедленная реакция
   - HIGH: Реакция в течение 1 часа
   - MEDIUM: Реакция в течение 24 часов
   - LOW: Мониторинг

3. **Принять меры**
   - Блокировка IP/пользователя
   - Уведомление пользователя
   - Ротация ключей (если компрометация)

4. **Документировать**
   ```sql
   UPDATE public.anomaly_alerts
   SET
     status = 'ACKNOWLEDGED',
     resolution_notes = 'Описание реакции'
   WHERE id = 'alert-id';
   ```

---

## 📚 Дополнительные ресурсы

- [Внутренняя документация](./IMPLEMENTATION_SUMMARY.md)
- [Zero-Knowledge Архитектура](./ZERO_KNOWLEDGE_ARCHITECTURE.md)
- [Улучшения безопасности](./SECURITY_IMPROVEMENTS.md)

---

**Версия:** 1.0  
**Дата:** 2025-01-03  
**Поддержка:** nlp-core-team@example.com
