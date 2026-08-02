import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppProviders } from '@/providers/AppProviders';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { applyTheme, readStoredTheme } from '@/lib/theme';
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
import './styles/data-quality-v10.css';
import './styles/risk-discipline-v11.css';
import './styles/first-run-v12.css';
import './styles/performance-analytics-v13.css';
import './styles/billing-v14.css';
import './styles/design-foundation-v15.css';

applyTheme(readStoredTheme(window.localStorage));

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
