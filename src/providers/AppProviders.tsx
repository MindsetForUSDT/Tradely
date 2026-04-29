// ============================================================
// TradeumDiary — Провайдеры приложения
// React Query + глобальные настройки
// ============================================================

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Создаём клиент Query с глобальными настройками
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Данные считаются свежими 30 секунд (можно менять per-query)
      staleTime: 30 * 1000,

      // Повторяем запросы при ошибках
      retry: 2,

      // Запросы не выполняются, пока вкладка не в фокусе
      refetchOnWindowFocus: true,

      // Не показываем устаревшие данные при ошибке
      useErrorBoundary: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}