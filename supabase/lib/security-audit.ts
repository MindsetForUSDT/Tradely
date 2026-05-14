// supabase/lib/security-audit.ts
// Система аудита безопасности с SIEM интеграцией
// Логирование всех критических событий безопасности

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export type SecurityEventType =
  | 'AUTH_SUCCESS'
  | 'AUTH_FAILURE'
  | 'AUTH_LOCKOUT'
  | 'ENCRYPTION_OPERATION'
  | 'DECRYPTION_OPERATION'
  | 'KEY_ROTATION'
  | 'DATA_ACCESS'
  | 'DATA_MODIFICATION'
  | 'PRIVILEGE_ESCALATION'
  | 'CONFIGURATION_CHANGE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SUSPICIOUS_ACTIVITY'
  | 'ADMIN_ACTION'
  | 'ERROR';

export type SecurityEventSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'ERROR';

export interface SecurityEvent {
  id: string;
  timestamp: string;
  eventType: SecurityEventType;
  severity: SecurityEventSeverity;
  userId?: string;
  requestId: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, unknown>;
  metadata: {
    component: string;
    version: string;
    environment: string;
  };
}

/**
 * Ключевые слова для детекции подозрительной активности
 */
const SUSPICIOUS_PATTERNS = [
  'multiple failed',
  'unusual',
  'anomaly',
  'attack',
  'breach',
  'exploit',
  'injection',
  'xss',
  'csrf',
  'overflow',
  'unauthorized',
  'forbidden',
];

/**
 * Класс для аудита безопасности
 */
export class SecurityAuditor {
  private supabaseUrl: string;
  private supabaseKey: string;
  private siemWebhook?: string;
  private environment: string;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    siemWebhook?: string,
    environment: string = 'production'
  ) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
    this.siemWebhook = siemWebhook;
    this.environment = environment;
  }

  /**
   * Генерация уникального ID события
   */
  private generateEventId(): string {
    return `evt_${crypto.randomUUID()}`;
  }

  /**
   * Получение IP адреса из запроса
   */
  private getClientIp(req: Request): string | undefined {
    // Проверка различных заголовков для определения реального IP
    const forwarded = req.headers.get('X-Forwarded-For');
    const realIp = req.headers.get('X-Real-IP');
    const cfIp = req.headers.get('CF-Connecting-IP'); // Cloudflare

    if (cfIp) return cfIp;
    if (realIp) return realIp;
    if (forwarded) return forwarded.split(',')[0].trim();

    return undefined;
  }

  /**
   * Определение уровня серьезности события
   */
  private determineSeverity(
    eventType: SecurityEventType,
    details: Record<string, unknown>
  ): SecurityEventSeverity {
    switch (eventType) {
      case 'AUTH_LOCKOUT':
      case 'PRIVILEGE_ESCALATION':
      case 'SUSPICIOUS_ACTIVITY':
        return 'CRITICAL';

      case 'AUTH_FAILURE':
      case 'RATE_LIMIT_EXCEEDED':
      case 'ERROR':
        return 'WARNING';

      case 'CONFIGURATION_CHANGE':
      case 'ADMIN_ACTION':
        return details?.['automatic'] ? 'INFO' : 'WARNING';

      case 'ENCRYPTION_OPERATION':
      case 'DECRYPTION_OPERATION':
      case 'KEY_ROTATION':
        return 'INFO';

      default:
        return 'INFO';
    }
  }

  /**
   * Создание и логирование события безопасности
   */
  async logEvent(
    eventType: SecurityEventType,
    req: Request,
    details: Record<string, unknown>,
    userId?: string
  ): Promise<void> {
    const eventId = this.generateEventId();
    const timestamp = new Date().toISOString();
    const requestId = crypto.randomUUID().substring(0, 8);

    const event: SecurityEvent = {
      id: eventId,
      timestamp,
      eventType,
      severity: this.determineSeverity(eventType, details),
      userId,
      requestId,
      ipAddress: this.getClientIp(req),
      userAgent: req.headers.get('User-Agent') || undefined,
      details,
      metadata: {
        component: 'security-audit',
        version: '1.0.0',
        environment: this.environment,
      },
    };

    // Определяем, нужно ли проверять на подозрительную активность
    const isSuspicious = this.detectSuspiciousActivity(eventType, details);
    if (isSuspicious) {
      await this.logEvent(
        'SUSPICIOUS_ACTIVITY',
        req,
        {
          originalEventType: eventType,
          reason: 'Pattern match or anomaly detected',
          details,
        },
        userId
      );
    }

    try {
      // Сохранение в Supabase
      await this.persistEvent(event);

      // Отправка в SIEM (если настроен)
      if (this.siemWebhook) {
        await this.sendToSiem(event);
      }

      // Локальное логирование для разработки
      if (this.environment === 'development') {
        console.log('[SecurityAudit]', JSON.stringify(event, null, 2));
      }
    } catch (error) {
      console.error('[SecurityAudit] Failed to log event:', error);
    }
  }

  /**
   * Сохранение события в Supabase
   */
  private async persistEvent(event: SecurityEvent): Promise<void> {
    try {
      const response = await fetch(`${this.supabaseUrl}/rest/v1/security_events`, {
        method: 'POST',
        headers: {
          apikey: this.supabaseKey,
          Authorization: `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'skip=representation',
        },
        body: JSON.stringify({
          id: event.id,
          timestamp: event.timestamp,
          event_type: event.eventType,
          severity: event.severity,
          user_id: event.userId,
          request_id: event.requestId,
          ip_address: event.ipAddress,
          user_agent: event.userAgent,
          details: event.details,
          metadata: event.metadata,
        }),
      });

      if (!response.ok) {
        console.error('[SecurityAudit] Failed to persist event:', await response.text());
      }
    } catch (error) {
      console.error('[SecurityAudit] Error persisting event:', error);
    }
  }

  /**
   * Отправка события в SIEM систему
   */
  private async sendToSiem(event: SecurityEvent): Promise<void> {
    if (!this.siemWebhook) return;

    try {
      // Формат Syslog для SIEM
      const syslogMessage = this.formatSyslog(event);

      await fetch(this.siemWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: event,
          syslog: syslogMessage,
          received_at: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('[SecurityAudit] Failed to send to SIEM:', error);
      // Не выбрасываем ошибку, чтобы не нарушать основную логику
    }
  }

  /**
   * Форматирование события в Syslog формат
   */
  private formatSyslog(event: SecurityEvent): string {
    const priority = this.getSyslogPriority(event.severity);
    const timestamp = new Date(event.timestamp).toISOString();
    const message = this.formatSyslogMessage(event);

    return `<${priority}>${timestamp} ${event.metadata.component} ${event.id}: ${message}`;
  }

  /**
   * Получение syslog priority
   */
  private getSyslogPriority(severity: SecurityEventSeverity): number {
    const severityMap = {
      INFO: 6,
      WARNING: 4,
      CRITICAL: 2,
      ERROR: 3,
    };
    const facility = 16; // local0
    return facility * 8 + severityMap[severity];
  }

  /**
   * Форматирование сообщения для syslog
   */
  private formatSyslogMessage(event: SecurityEvent): string {
    const parts = [
      `type=${event.eventType}`,
      `severity=${event.severity}`,
      `user_id=${event.userId || 'anonymous'}`,
      `ip=${event.ipAddress || 'unknown'}`,
      `request_id=${event.requestId}`,
    ];

    if (Object.keys(event.details).length > 0) {
      parts.push(`details=${JSON.stringify(event.details)}`);
    }

    return parts.join(' ');
  }

  /**
   * Детекция подозрительной активности
   */
  private detectSuspiciousActivity(
    eventType: SecurityEventType,
    details: Record<string, unknown>
  ): boolean {
    // Критические типы событий всегда подозрительны
    if (eventType === 'PRIVILEGE_ESCALATION' || eventType === 'AUTH_LOCKOUT') {
      return true;
    }

    // Проверка на множественные неудачные попытки
    if (eventType === 'AUTH_FAILURE') {
      const failureCount = details?.['failureCount'];
      if (typeof failureCount === 'number' && failureCount >= 5) {
        return true;
      }
    }

    // Проверка на аномалии в деталях
    const detailsStr = JSON.stringify(details).toLowerCase();
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (detailsStr.includes(pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Создание удобных методов для разных типов событий
   */
  async logAuthSuccess(req: Request, userId: string, method: string): Promise<void> {
    await this.logEvent('AUTH_SUCCESS', req, { method }, userId);
  }

  async logAuthFailure(
    req: Request,
    reason: string,
    failureCount?: number,
    userId?: string
  ): Promise<void> {
    await this.logEvent('AUTH_FAILURE', req, { reason, failureCount }, userId);
  }

  async logAuthLockout(req: Request, userId: string, attemptCount: number): Promise<void> {
    await this.logEvent('AUTH_LOCKOUT', req, { attemptCount }, userId);
  }

  async logEncryptionOperation(
    req: Request,
    userId: string,
    operation: string,
    success: boolean
  ): Promise<void> {
    await this.logEvent(
      success ? 'ENCRYPTION_OPERATION' : 'ERROR',
      req,
      { operation, success },
      userId
    );
  }

  async logDecryptionOperation(
    req: Request,
    userId: string,
    success: boolean,
    reason?: string
  ): Promise<void> {
    await this.logEvent(
      success ? 'DECRYPTION_OPERATION' : 'ERROR',
      req,
      { success, reason },
      userId
    );
  }

  async logKeyRotation(req: Request, userId: string, recordsMigrated: number): Promise<void> {
    await this.logEvent('KEY_ROTATION', req, { recordsMigrated }, userId);
  }

  async logRateLimitExceeded(
    req: Request,
    userId: string,
    limit: number,
    window: number
  ): Promise<void> {
    await this.logEvent('RATE_LIMIT_EXCEEDED', req, { limit, window }, userId);
  }

  async logAdminAction(
    req: Request,
    userId: string,
    action: string,
    details: Record<string, unknown>
  ): Promise<void> {
    await this.logEvent('ADMIN_ACTION', req, { action, ...details }, userId);
  }

  async logConfigurationChange(
    req: Request,
    userId: string,
    setting: string,
    oldValue: unknown,
    newValue: unknown
  ): Promise<void> {
    await this.logEvent(
      'CONFIGURATION_CHANGE',
      req,
      {
        setting,
        oldValue,
        newValue,
      },
      userId
    );
  }
}

/**
 * Singleton экземпляр аудита (для использования в Edge Functions)
 */
let auditorInstance: SecurityAuditor | null = null;

export function getSecurityAuditor(
  supabaseUrl?: string,
  supabaseKey?: string,
  siemWebhook?: string
): SecurityAuditor {
  if (!auditorInstance && supabaseUrl && supabaseKey) {
    auditorInstance = new SecurityAuditor(supabaseUrl, supabaseKey, siemWebhook);
  }
  return auditorInstance!;
}
