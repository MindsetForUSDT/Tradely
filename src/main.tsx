import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppProviders } from '@/providers/AppProviders';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { wakeUpDatabase, startDatabaseKeepAlive } from '@/lib/database-wake';
import './index.css';

wakeUpDatabase().then(() => {
  console.log('[Main] Database is ready');
});

startDatabaseKeepAlive();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <AppProviders>
        <App />
      </AppProviders>
    </ErrorBoundary>
  </StrictMode>
);
