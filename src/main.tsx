import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProviders } from '@/providers/AppProviders';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

// ✅ Отключаем StrictMode на время разработки
// В production это не влияет на работу
ReactDOM.createRoot(root).render(
  <ErrorBoundary>
    <AppProviders>
      <App />
    </AppProviders>
  </ErrorBoundary>
);