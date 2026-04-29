import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ✅ Увеличиваем до 2 минут — данные не будут запрашиваться повторно при быстрых переходах
      staleTime: 2 * 60 * 1000,

      // ✅ Кеш живёт 30 минут даже после unmount компонента
      gcTime: 30 * 60 * 1000,

      // ✅ 3 ретрая при ошибках вместо бесконечных
      retry: 3,

      // ✅ Не перезапрашиваем при возврате на вкладку (уменьшает нагрузку)
      refetchOnWindowFocus: false,

      // ✅ Не перезапрашиваем при переподключении к интернету
      refetchOnReconnect: false,
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