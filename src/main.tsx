import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppProviders } from '@/providers/AppProviders';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import './index.css';
import './styles/unified-design.css';
import './styles/premium-product.css';
import './styles/cinematic-system.css';
import './styles/commercial-workspace.css';
import './styles/loss-diagnostics.css';
import './styles/product-surfaces-v6.css';
import './styles/settings-auth-v7.css';
import './styles/progress-v8.css';
import './styles/public-v9.css';

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
