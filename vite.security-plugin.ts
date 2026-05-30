// vite.security-plugin.ts
// Vite plugin для добавления HTTP Security Headers в production build

import type { Plugin } from 'vite';
import type { ServerOptions } from 'vite';

export interface SecurityHeadersOptions {
  // Content Security Policy
  contentSecurityPolicy?: string;

  // Разрешить inline scripts (не рекомендуется для production)
  allowInlineScripts?: boolean;

  // Разрешить inline styles
  allowInlineStyles?: boolean;

  // Report URI для CSP violations
  reportUri?: string;

  // Дополнительные кастомные заголовки
  customHeaders?: Record<string, string>;
}

export function securityHeaders(options: SecurityHeadersOptions = {}): Plugin {
  const {
    contentSecurityPolicy,
    allowInlineScripts = false,
    allowInlineStyles = false,
    reportUri,
    customHeaders = {},
  } = options;

  const cspDirective = buildContentSecurityPolicy({
    allowInlineScripts,
    allowInlineStyles,
    reportUri,
    customCSP: contentSecurityPolicy,
  });

  return {
    name: 'vite-security-headers',

    configureServer(server) {
      // Добавляем security headers в development
      server.middlewares.use((req, res, next) => {
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader(
          'Permissions-Policy',
          'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
        );
        res.setHeader('Content-Security-Policy', cspDirective);
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

        // Custom headers
        Object.entries(customHeaders).forEach(([key, value]) => {
          res.setHeader(key, value);
        });

        next();
      });
    },

    configurePreviewServer(server) {
      // Добавляем security headers в preview
      server.middlewares.use((req, res, next) => {
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader(
          'Permissions-Policy',
          'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
        );
        res.setHeader('Content-Security-Policy', cspDirective);
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

        Object.entries(customHeaders).forEach(([key, value]) => {
          res.setHeader(key, value);
        });

        next();
      });
    },

    generateBundle(_, bundle) {
      // Добавляем security meta tags в HTML
      for (const fileName in bundle) {
        if (fileName.endsWith('.html')) {
          const chunk = bundle[fileName];
          if (chunk.type === 'asset' && typeof chunk.source === 'string') {
            let html = chunk.source;

            // Добавляем CSP meta tag
            const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${cspDirective}">`;
            if (!html.includes('Content-Security-Policy')) {
              html = html.replace('</head>', `${cspMeta}\n</head>`);
            }

            // Добавляем Permissions-Policy meta tag
            const permissionsMeta = `<meta http-equiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=(), payment=(), usb=()">`;
            if (!html.includes('Permissions-Policy')) {
              html = html.replace('</head>', `${permissionsMeta}\n</head>`);
            }

            // Добавляем Referrer-Policy meta tag
            const referrerMeta = `<meta name="referrer" content="strict-origin-when-cross-origin">`;
            if (!html.includes('referrer')) {
              html = html.replace('</head>', `${referrerMeta}\n</head>`);
            }

            // Добавляем X-Content-Type-Options meta tag
            const xContentTypeMeta = `<meta http-equiv="X-Content-Type-Options" content="nosniff">`;
            if (!html.includes('X-Content-Type-Options')) {
              html = html.replace('</head>', `${xContentTypeMeta}\n</head>`);
            }

            // Добавляем Cache-Control meta tag
            const cacheControlMeta = `<meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate, proxy-revalidate">`;
            if (!html.includes('Cache-Control')) {
              html = html.replace('</head>', `${cacheControlMeta}\n</head>`);
            }

            chunk.source = html;
          }
        }
      }
    },
  };
}

/**
 * Построение Content Security Policy
 */
function buildContentSecurityPolicy(options: {
  allowInlineScripts: boolean;
  allowInlineStyles: boolean;
  reportUri?: string;
  customCSP?: string;
}): string {
  if (options.customCSP) {
    return options.customCSP;
  }

  const directives: string[] = ["default-src 'self'"];

  // Script-src
  const scriptSources = ["'self'"];
  if (options.allowInlineScripts) {
    scriptSources.push("'unsafe-inline'");
  }
  // Добавляем blob: для Service Worker
  scriptSources.push('blob:');
  directives.push(`script-src ${scriptSources.join(' ')}`);

  // Style-src
  const styleSources = ["'self'"];
  if (options.allowInlineStyles) {
    styleSources.push("'unsafe-inline'");
  }
  // Добавляем Google Fonts
  styleSources.push('https://fonts.googleapis.com');
  styleSources.push('https://fonts.gstatic.com');
  directives.push(`style-src ${styleSources.join(' ')}`);

  // Img-src
  directives.push("img-src 'self' data: https: blob:");

  // Font-src
  directives.push("font-src 'self' data: https://fonts.gstatic.com");

  // Connect-src - добавляем WebSocket для Supabase и localhost для API
  const connectSources = [
    "'self'",
    'http://localhost:3000',
    'http://localhost:3001',
    'https://*.supabase.co',
    'wss://*.supabase.co',
  ];
  // Добавляем API бирж
  connectSources.push('https://api.binance.com');
  connectSources.push('https://api.bybit.com');
  connectSources.push('https://www.googleapis.com');
  directives.push(`connect-src ${connectSources.join(' ')}`);

  // Frame-ancestors
  directives.push("frame-ancestors 'none'");

  // Base-uri
  directives.push("base-uri 'self'");

  // Form-action
  directives.push("form-action 'self'");

  // Worker-src - для Service Worker
  directives.push("worker-src 'self' blob:");

  // Report-uri (если указано)
  if (options.reportUri) {
    directives.push(`report-uri ${options.reportUri}`);
  }

  return directives.join('; ');
}

/**
 * Конфигурация для production с максимальными ограничениями
 */
export function productionSecurityHeaders(): Plugin {
  return securityHeaders({
    allowInlineScripts: false,
    allowInlineStyles: false,
    reportUri: '/csp-report', // Endpoint для отчетов о нарушениях CSP
  });
}

/**
 * Конфигурация для development с менее строгими ограничениями
 */
export function developmentSecurityHeaders(): Plugin {
  return securityHeaders({
    allowInlineScripts: true,
    allowInlineStyles: true,
  });
}
