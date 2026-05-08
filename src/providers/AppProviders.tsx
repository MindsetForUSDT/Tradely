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

function getUserIdFromLocalStorage(): string | null {
  try {
    const raw = localStorage.getItem('tradeumdiary-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const token = parsed?.access_token;
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload?.sub || null;
  } catch {
    return null;
  }
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const userId = getUserIdFromLocalStorage();

    if (!userId) {
      setReady(true);
      return;
    }

    supabase
      .from('profiles')
      .select('id, subscription_tier, subscription_expires_at')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        setUser(
          data
            ? {
                id: data.id,
                subscription_tier: data.subscription_tier,
                subscription_expires_at: data.subscription_expires_at,
              }
            : null
        );
        setReady(true);
      })
      .catch(() => {
        setReady(true);
      });
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
      localStorage.removeItem('tradeumdiary-auth');
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
