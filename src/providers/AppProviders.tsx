import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProviderV2 } from '@/hooks/useAuthProvider';
import type { ReactNode } from 'react';

interface AppProvidersProps {
  readonly children: ReactNode;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProviderV2>{children}</AuthProviderV2>
    </QueryClientProvider>
  );
}