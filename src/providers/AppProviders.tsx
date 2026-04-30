/**
 * TradeumDiary — Root Application Providers
 * 
 * Порядок провайдеров важен:
 * 1. QueryClientProvider (React Query) — для всех запросов данных
 * 2. AuthProvider (кастомный) — для аутентификации
 * 3. ErrorBoundary (на уровне main.tsx)
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/useAuth';
import type { FC, ReactNode } from 'react';

interface AppProvidersProps {
  readonly children: ReactNode;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 минут
      gcTime: 30 * 60 * 1000, // 30 минут
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

export const AppProviders: FC<AppProvidersProps> = ({ children }) => {
  return createElement(
    QueryClientProvider,
    { client: queryClient },
    createElement(AuthProvider, null, children)
  );
};

AppProviders.displayName = 'AppProviders';