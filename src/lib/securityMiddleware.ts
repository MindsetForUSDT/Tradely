// src/lib/securityMiddleware.ts
// Client-side security headers and middleware
// Добавляет HTTP security headers через мета-теги и конфигурацию

/**
 * Security headers конфигурация
 */
export const securityHeaders = {
  // Content Security Policy - обновлено для поддержки Google Fonts и Supabase WebSocket
  contentSecurityPolicy: `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com;
    img-src 'self' data: https: blob:;
    font-src 'self' data: https://fonts.gstatic.com;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.binance.com https://api.bybit.com;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
    worker-src 'self' blob:;
  `
    .replace(/\s+/g, ' ')
    .trim(),

  // Permissions Policy
  permissionsPolicy: `
    camera=(),
    microphone=(),
    geolocation=(),
    payment=(),
    usb=()
  `
    .replace(/\s+/g, ' ')
    .trim(),

  // Referrer Policy
  referrerPolicy: 'strict-origin-when-cross-origin',

  // Cross-Origin Policies
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginEmbedderPolicy: 'require-corp',
  crossOriginResourcePolicy: 'same-origin',
};

/**
 * Устанавливает security meta tags в head документа
 */
export function setSecurityMetaTags(): void {
  const head = document.head;

  // CSP через meta tag
  const cspMeta = document.createElement('meta');
  cspMeta.httpEquiv = 'Content-Security-Policy';
  cspMeta.content = securityHeaders.contentSecurityPolicy;
  head.appendChild(cspMeta);

  // Permissions Policy
  const permissionsMeta = document.createElement('meta');
  permissionsMeta.httpEquiv = 'Permissions-Policy';
  permissionsMeta.content = securityHeaders.permissionsPolicy;
  head.appendChild(permissionsMeta);

  // Referrer Policy
  const referrerMeta = document.createElement('meta');
  referrerMeta.name = 'referrer';
  referrerMeta.content = securityHeaders.referrerPolicy;
  head.appendChild(referrerMeta);

  // Prevent caching для чувствительных страниц
  const noCacheMeta = document.createElement('meta');
  noCacheMeta.httpEquiv = 'Cache-Control';
  noCacheMeta.content = 'no-store, no-cache, must-revalidate, proxy-revalidate';
  head.appendChild(noCacheMeta);

  // X-Content-Type-Options (через meta не работает, но добавляем для полноты)
  const xContentTypeMeta = document.createElement('meta');
  xContentTypeMeta.httpEquiv = 'X-Content-Type-Options';
  xContentTypeMeta.content = 'nosniff';
  head.appendChild(xContentTypeMeta);
}

/**
 * Устанавливает заголовок для всех будущих запросов
 */
export function setupSecurityHeadersForFetch(): void {
  // Сохраняем оригинальный fetch
  const originalFetch = window.fetch;

  // Переопределяем fetch для добавления security headers
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers);

    // Добавляем security headers
    headers.set('X-Request-Id', crypto.randomUUID());
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');

    // Вызываем оригинальный fetch
    return originalFetch(input, {
      ...init,
      headers,
    });
  };
}

/**
 * Защита от clickjacking через X-Frame-Options и CSP
 */
export function preventClickjacking(): void {
  // Проверка на framing
  if (window !== window.top) {
    console.warn('[Security] Attempted framing detected');
    // Можно либо блокировать, либо логируовать
    // window.location.href = window.top.location.href;
  }
}

/**
 * Защита от XSS через CSP nonce
 */
export function generateCSPNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * Хэш для inline скриптов в CSP
 */
export async function generateScriptHash(scriptContent: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(scriptContent);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

/**
 * Защита от CSRF через token
 */
export async function generateCSRFToken(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * Проверяет CSRF token
 */
export function validateCSRFToken(token: string, expectedToken: string): boolean {
  if (token.length !== expectedToken.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Санитизация HTML для предотвращения XSS
 */
export function sanitizeHTML(input: string): string {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Санитизация URL для предотвращения javascript: инъекций
 */
export function sanitizeURL(url: string): string {
  const suspiciousPatterns = [/^javascript:/i, /^data:text\/html/i, /^vbscript:/i, /^about:/i];

  const sanitized = url.trim();

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(sanitized)) {
      console.warn('[Security] Blocked suspicious URL:', url);
      return '';
    }
  }

  return sanitized;
}

/**
 * Инициализация всех security middleware
 */
export function initSecurityMiddleware(): void {
  setSecurityMetaTags();
  setupSecurityHeadersForFetch();
  preventClickjacking();

  // Security middleware initialized
}

/**
 * Хук для использования в React компонентах
 */
export function useSecurityHeaders(): void {
  // Выполняем инициализацию при монтировании компонента
  if (typeof window !== 'undefined') {
    initSecurityMiddleware();
  }
}
