import { createElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppProviders } from '@/providers/AppProviders';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error(
    '[Bootstrap] Root element #root not found in DOM. Check your index.html.'
  );
}

const root = createRoot(rootElement);

// StrictMode только в dev, в production не влияет
const app = createElement(
  StrictMode,
  null,
  createElement(
    ErrorBoundary,
    null,
    createElement(
      AppProviders,
      null,
      createElement(App, null)
    )
  )
);

root.render(app);

// Регистрируем Service Worker для PWA (если нужно)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[PWA] Service Worker registration failed:', error);
    });
  });
}