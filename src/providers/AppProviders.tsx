import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/hooks/useAuth';
import type { Profile } from '@/hooks/useAuth';
import type { ReactNode } from 'react';

interface AppProvidersProps {
  readonly children: ReactNode;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1, refetchOnWindowFocus: false },
  },
});

export function AppProviders({ children }: AppProvidersProps) {
  const [user, setUser] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setReady(true), 2000);
    return () => clearTimeout(timeout);
  }, []);

  // Если не готовы — показываем минимум
  if (!ready) {
    return React.createElement(
      'div',
      { className: 'min-h-screen flex items-center justify-center bg-surface' },
      React.createElement('div', {
        className:
          'w-8 h-8 rounded-full border-2 border-accent-green border-t-transparent animate-spin',
      })
    );
  }

  return React.createElement(
    QueryClientProvider,
    { client: queryClient },
    React.createElement(
      AuthContext.Provider,
      {
        value: {
          user,
          isLoading: false,
          isAuthenticated: false,
          signOut: async () => {
            await supabase.auth.signOut();
            setUser(null);
          },
          refreshProfile: async () => {},
        },
      },
      children
    )
  );
}
