import React, { createContext, useContext, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ReactNode } from 'react';

interface UserProfile {
  id: string;
  email?: string;
  subscription_tier: 'free' | 'pro';
  subscription_expires_at: string | null;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1, refetchOnWindowFocus: false } },
});

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
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
            setUser(
              data
                ? {
                    id: data.id,
                    email: session.user.email,
                    subscription_tier: data.subscription_tier,
                    subscription_expires_at: data.subscription_expires_at,
                  }
                : null
            );
            setReady(true);
          })
          .catch(() => setReady(true));
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
            setUser(
              data
                ? {
                    id: data.id,
                    email: session.user.email,
                    subscription_tier: data.subscription_tier,
                    subscription_expires_at: data.subscription_expires_at,
                  }
                : null
            );
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
      { className: 'min-h-screen flex items-center justify-center bg-surface' },
      React.createElement('div', {
        className:
          'w-10 h-10 rounded-full border-2 border-accent-green border-t-transparent animate-spin',
      })
    );
  }

  const value: AuthContextType = {
    user,
    isLoading: false,
    isAuthenticated: !!user,
    signOut: async () => {
      await supabase.auth.signOut();
      setUser(null);
    },
    refreshProfile: async () => {},
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function AppProviders({ children }: { children: ReactNode }) {
  return React.createElement(
    QueryClientProvider,
    { client: queryClient },
    React.createElement(AuthProvider, null, children)
  );
}
