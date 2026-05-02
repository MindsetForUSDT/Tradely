import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/hooks/useAuth';
import type { Profile } from '@/hooks/useAuth';

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

function SimpleAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            setUser(data);
            setReady(true);
          })
          .catch(() => {
            setReady(true);
          });
      } else {
        setReady(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            setUser(data);
          })
          .catch(() => {});
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!ready) {
    return React.createElement(
      'div',
      {
        className: 'min-h-screen flex items-center justify-center bg-surface',
      },
      React.createElement('div', {
        className:
          'w-8 h-8 rounded-full border-2 border-accent-green border-t-transparent animate-spin',
      })
    );
  }

  return React.createElement(
    AuthContext.Provider,
    {
      value: {
        user,
        isLoading: false,
        isAuthenticated: !!user,
        signOut: async () => {
          await supabase.auth.signOut();
          setUser(null);
        },
        refreshProfile: async () => {
          const {
            data: { user: u },
          } = await supabase.auth.getUser();
          if (u) {
            const { data } = await supabase.from('profiles').select('*').eq('id', u.id).single();
            if (data) setUser(data);
          }
        },
      },
    },
    children
  );
}

export function AppProviders({ children }: AppProvidersProps) {
  return React.createElement(
    QueryClientProvider,
    { client: queryClient },
    React.createElement(SimpleAuthProvider, null, children)
  );
}
