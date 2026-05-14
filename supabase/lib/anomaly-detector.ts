// supabase/lib/anomaly-detector.ts
// Система мониторинга и детекции аномалий
// Выявление подозрительных паттернов и угроз безопасности

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export interface AnomalyConfig {
  // Пороги для детекции аномалий
  maxFailedAuthPerUser: number;
  maxFailedAuthPerIp: number;
  maxDecryptionFailuresPerUser: number;
  maxRequestsPerMinute: number;
  suspiciousTokenLength: number;

  // Временные окна (в миллисекундах)
  authWindowMs: number;
  decryptionWindowMs: number;
  requestWindowMs: number;

  // Коэффициенты для статистической детекции
  stdDevMultiplier: number;
  minSampleSize: number;
}

export interface AnomalyAlert {
  id: string;
  timestamp: string;
  type: AnomalyType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  ipAddress?: string;
  description: string;
  evidence: Record<string, unknown>;
  recommendedAction: string;
}

export type AnomalyType =
  | 'BRUTE_FORCE_ATTEMPT'
  | 'CREDENTIAL_STUFFING'
  | 'UNUSUAL_ACCESS_PATTERN'
  | 'GEOGRAPHIC_ANOMALY'
  | 'TIME_ANOMALY'
  | 'VOLUME_ANOMALY'
  | 'BEHAVIORAL_ANOMALY'
  | 'ENCRYPTION_ANOMALY'
  | 'RATE_LIMIT_ABUSE'
  | 'API_ABUSE';

/**
 * Базовые конфигурации для детекции аномалий
 */
export const AnomalyConfigDefaults: AnomalyConfig = {
  maxFailedAuthPerUser: 5,
  maxFailedAuthPerIp: 20,
  maxDecryptionFailuresPerUser: 10,
  maxRequestsPerMinute: 100,
  suspiciousTokenLength: 10000,

  authWindowMs: 15 * 60 * 1000, // 15 минут
  decryptionWindowMs: 60 * 60 * 1000, // 1 час
  requestWindowMs: 60 * 1000, // 1 минута

  stdDevMultiplier: 3, // 3 стандартных отклонения
  minSampleSize: 100,
};

/**
 * Класс для детекции аномалий
 */
export class AnomalyDetector {
  private config: AnomalyConfig;
  private supabaseUrl: string;
  private supabaseKey: string;
  private alertCallbacks: ((alert: AnomalyAlert) => Promise<void>)[] = [];

  constructor(config: Partial<AnomalyConfig>, supabaseUrl: string, supabaseKey: string) {
    this.config = { ...AnomalyConfigDefaults, ...config };
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
  }

  /**
   * Регистрация callback для уведомлений об аномалиях
   */
  registerAlertCallback(callback: (alert: AnomalyAlert) => Promise<void>): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Проверка на аномалии аутентификации
   */
  async checkAuthAnomalies(
    userId: string | undefined,
    ipAddress: string | undefined,
    failedAttempts: number,
    timestamp: Date
  ): Promise<AnomalyAlert | null> {
    const windowStart = new Date(timestamp.getTime() - this.config.authWindowMs);

    // Проверка по пользователю
    if (userId) {
      const userFailures = await this.getFailureCount(
        'auth_failures',
        'user_id',
        userId,
        windowStart
      );

      if (userFailures >= this.config.maxFailedAuthPerUser) {
        return this.createAlert({
          type: 'BRUTE_FORCE_ATTEMPT',
          severity: userFailures >= this.config.maxFailedAuthPerUser * 2 ? 'CRITICAL' : 'HIGH',
          userId,
          ipAddress,
          description: `Множественные неудачные попытки аутентификации для пользователя: ${userFailures} за ${this.config.authWindowMs / 60000} минут`,
          evidence: { failedAttempts: userFailures, window: '15min' },
          recommendedAction: 'Временная блокировка аккаунта, уведомление пользователя',
        });
      }
    }

    // Проверка по IP
    if (ipAddress) {
      const ipFailures = await this.getFailureCount(
        'auth_failures',
        'ip_address',
        ipAddress,
        windowStart
      );

      if (ipFailures >= this.config.maxFailedAuthPerIp) {
        return this.createAlert({
          type: 'CREDENTIAL_STUFFING',
          severity: ipFailures >= this.config.maxFailedAuthPerIp * 2 ? 'CRITICAL' : 'HIGH',
          ipAddress,
          description: `Множественные неудачные попытки аутентификации с IP: ${ipAddress}`,
          evidence: { failedAttempts: ipFailures, window: '15min' },
          recommendedAction: 'Блокировка IP, проверка на ботнет активность',
        });
      }
    }

    return null;
  }

  /**
   * Проверка на аномалии расшифровки
   */
  async checkDecryptionAnomalies(
    userId: string | undefined,
    failedAttempts: number,
    timestamp: Date
  ): Promise<AnomalyAlert | null> {
    if (!userId) return null;

    const windowStart = new Date(timestamp.getTime() - this.config.decryptionWindowMs);

    const decryptionFailures = await this.getFailureCount(
      'decryption_failures',
      'user_id',
      userId,
      windowStart
    );

    if (decryptionFailures >= this.config.maxDecryptionFailuresPerUser) {
      return this.createAlert({
        type: 'ENCRYPTION_ANOMALY',
        severity: 'HIGH',
        userId,
        description: `Подозрительная активность расшифровки: ${decryptionFailures} неудач за ${this.config.decryptionWindowMs / 3600000} часа`,
        evidence: { failedAttempts: decryptionFailures, window: '1hour' },
        recommendedAction: 'Проверка целостности данных, возможная ротация ключей',
      });
    }

    return null;
  }

  /**
   * Проверка на аномалии объема запросов
   */
  async checkVolumeAnomalies(
    userId: string | undefined,
    requestCount: number,
    timestamp: Date
  ): Promise<AnomalyAlert | null> {
    if (!userId) return null;

    const windowStart = new Date(timestamp.getTime() - this.config.requestWindowMs);

    const recentRequests = await this.getRequestCount(userId, windowStart);

    if (recentRequests >= this.config.maxRequestsPerMinute) {
      return this.createAlert({
        type: 'VOLUME_ANOMALY',
        severity: recentRequests >= this.config.maxRequestsPerMinute * 2 ? 'CRITICAL' : 'MEDIUM',
        userId,
        description: `Аномально высокий объем запросов: ${recentRequests} за минуту`,
        evidence: { requestCount: recentRequests, window: '1min' },
        recommendedAction: 'Применение rate limiting, проверка на автоматизированные запросы',
      });
    }

    return null;
  }

  /**
   * Статистическая детекция аномалий (z-score метод)
   */
  async checkStatisticalAnomaly(
    userId: string,
    metric: string,
    currentValue: number
  ): Promise<AnomalyAlert | null> {
    const stats = await this.getMetricStats(userId, metric);

    if (!stats || stats.count < this.config.minSampleSize) {
      return null; // Недостаточно данных для статистики
    }

    const zScore = Math.abs((currentValue - stats.mean) / stats.stdDev);

    if (zScore > this.config.stdDevMultiplier) {
      return this.createAlert({
        type: 'BEHAVIORAL_ANOMALY',
        severity: zScore > this.config.stdDevMultiplier * 2 ? 'HIGH' : 'MEDIUM',
        userId,
        description: `Статистическая аномалия: ${metric} отклоняется на ${zScore.toFixed(2)} стандартных отклонений`,
        evidence: {
          currentValue,
          mean: stats.mean,
          stdDev: stats.stdDev,
          zScore,
        },
        recommendedAction: 'Анализ паттерна поведения пользователя',
      });
    }

    return null;
  }

  /**
   * Проверка временных аномалий (доступ в необычное время)
   */
  checkTimeAnomaly(userId: string, timestamp: Date): AnomalyAlert | null {
    const hour = timestamp.getUTCHours();

    // Предположим, что нормальное время активности - 6:00 - 22:00
    if (hour < 6 || hour > 22) {
      // Это не критично, только предупреждение
      return this.createAlert({
        type: 'TIME_ANOMALY',
        severity: 'LOW',
        userId,
        description: `Активность в необычное время: ${hour}:00 UTC`,
        evidence: { hour, timestamp: timestamp.toISOString() },
        recommendedAction: 'Мониторинг, возможное уведомление пользователя',
      });
    }

    return null;
  }

  /**
   * Проверка географических аномалий
   */
  async checkGeographicAnomaly(
    userId: string,
    currentIp: string,
    timestamp: Date
  ): Promise<AnomalyAlert | null> {
    const recentLocations = await this.getRecentLocations(userId, 24 * 60 * 60 * 1000); // 24 часа

    if (recentLocations.length > 1) {
      const uniqueCountries = new Set(recentLocations.map((l) => l.country));

      if (uniqueCountries.size > 2) {
        return this.createAlert({
          type: 'GEOGRAPHIC_ANOMALY',
          severity: 'HIGH',
          userId,
          description: `Активность из нескольких стран за короткое время: ${uniqueCountries.size}`,
          evidence: {
            countries: Array.from(uniqueCountries),
            ips: recentLocations.map((l) => l.ip),
          },
          recommendedAction: 'Проверка аккаунта на компрометацию',
        });
      }
    }

    return null;
  }

  /**
   * Создание и отправка алерта
   */
  private async createAlert(alert: Omit<AnomalyAlert, 'id' | 'timestamp'>): Promise<AnomalyAlert> {
    const fullAlert: AnomalyAlert = {
      ...alert,
      id: `anomaly_${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
    };

    // Сохранение в Supabase
    await this.persistAlert(fullAlert);

    // Отправка всем зарегистрированным callback'ам
    for (const callback of this.alertCallbacks) {
      try {
        await callback(fullAlert);
      } catch (error) {
        console.error('[AnomalyDetector] Callback error:', error);
      }
    }

    // Локальное логирование
    console.log('[AnomalyDetector] Alert:', JSON.stringify(fullAlert, null, 2));

    return fullAlert;
  }

  /**
   * Сохранение алерта в Supabase
   */
  private async persistAlert(alert: AnomalyAlert): Promise<void> {
    try {
      const response = await fetch(`${this.supabaseUrl}/rest/v1/anomaly_alerts`, {
        method: 'POST',
        headers: {
          apikey: this.supabaseKey,
          Authorization: `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alert),
      });

      if (!response.ok) {
        console.error('[AnomalyDetector] Failed to persist alert:', await response.text());
      }
    } catch (error) {
      console.error('[AnomalyDetector] Error persisting alert:', error);
    }
  }

  /**
   * Получение счетчика неудач по пользователю/IP
   */
  private async getFailureCount(
    table: string,
    field: string,
    value: string,
    since: Date
  ): Promise<number> {
    try {
      const response = await fetch(
        `${this.supabaseUrl}/rest/v1/${table}?${field}=eq.${value}&timestamp=gt.${since.toISOString()}`,
        {
          headers: {
            apikey: this.supabaseKey,
            Authorization: `Bearer ${this.supabaseKey}`,
            Prefer: 'count=exact',
          },
        }
      );

      if (response.ok) {
        const count = response.headers.get('X-Total-Count');
        return count ? parseInt(count, 10) : 0;
      }
    } catch (error) {
      console.error('[AnomalyDetector] Error getting failure count:', error);
    }

    return 0;
  }

  /**
   * Получение счетчика запросов по пользователю
   */
  private async getRequestCount(userId: string, since: Date): Promise<number> {
    return this.getFailureCount('api_requests', 'user_id', userId, since);
  }

  /**
   * Получение статистики метрики для пользователя
   */
  private async getMetricStats(
    userId: string,
    metric: string
  ): Promise<{
    mean: number;
    stdDev: number;
    count: number;
  }> {
    // В реальной реализации здесь будет запрос к агрегированным данным
    // Для примера возвращаем заглушку
    return { mean: 0, stdDev: 1, count: 0 };
  }

  /**
   * Получение недавних локаций пользователя
   */
  private async getRecentLocations(
    userId: string,
    windowMs: number
  ): Promise<
    Array<{
      ip: string;
      country: string;
      timestamp: string;
    }>
  > {
    const since = new Date(Date.now() - windowMs);

    try {
      const response = await fetch(
        `${this.supabaseUrl}/rest/v1/security_events?user_id=eq.${userId}&timestamp=gt.${since.toISOString()}&select=ip_address,details,timestamp`,
        {
          headers: {
            apikey: this.supabaseKey,
            Authorization: `Bearer ${this.supabaseKey}`,
          },
        }
      );

      if (response.ok) {
        const events = await response.json();
        return events.map((e: any) => ({
          ip: e.ip_address,
          country: e.details?.country || 'unknown',
          timestamp: e.timestamp,
        }));
      }
    } catch (error) {
      console.error('[AnomalyDetector] Error getting locations:', error);
    }

    return [];
  }

  /**
   * Полная проверка всех типов аномалий
   */
  async checkAllAnomalies(
    userId: string | undefined,
    ipAddress: string | undefined,
    authFailures: number,
    decryptionFailures: number,
    requestCount: number,
    timestamp: Date
  ): Promise<AnomalyAlert[]> {
    const alerts: AnomalyAlert[] = [];

    const authAnomaly = await this.checkAuthAnomalies(userId, ipAddress, authFailures, timestamp);
    if (authAnomaly) alerts.push(authAnomaly);

    const decryptionAnomaly = await this.checkDecryptionAnomalies(
      userId,
      decryptionFailures,
      timestamp
    );
    if (decryptionAnomaly) alerts.push(decryptionAnomaly);

    const volumeAnomaly = await this.checkVolumeAnomalies(userId, requestCount, timestamp);
    if (volumeAnomaly) alerts.push(volumeAnomaly);

    if (userId) {
      const timeAnomaly = this.checkTimeAnomaly(userId, timestamp);
      if (timeAnomaly) alerts.push(timeAnomaly);

      const geoAnomaly = await this.checkGeographicAnomaly(userId, ipAddress || '', timestamp);
      if (geoAnomaly) alerts.push(geoAnomaly);
    }

    return alerts;
  }
}
