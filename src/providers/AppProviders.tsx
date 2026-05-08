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
    let mounted = true;

    async function init() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (mounted) {
            setUser(
              profile
                ? {
                    id: profile.id,
                    email: session.user.email,
                    subscription_tier: profile.subscription_tier,
                    subscription_expires_at: profile.subscription_expires_at,
                  }
                : null
            );
            setReady(true);
          }
        } else {
          setReady(true);
        }
      } catch {
        if (mounted) setReady(true);
      }
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (mounted && profile) {
            setUser({
              id: profile.id,
              email: session.user.email,
              subscription_tier: profile.subscription_tier,
              subscription_expires_at: profile.subscription_expires_at,
            });
          }
        } catch {
          /* ignore */
        }
      } else {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-10 h-10 rounded-full border-2 border-accent-green border-t-transparent animate-spin" />
      </div>
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
