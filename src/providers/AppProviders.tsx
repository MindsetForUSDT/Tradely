import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ReactNode, useEffect, useState, useCallback, useMemo } from 'react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { Toaster } from 'react-hot-toast';
import { AuthContext, type UserProfile } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: { retry: 1 },
  },
});

function AuthProviderInner({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const storeSetUser = useStore((s) => s.setUser);

  useEffect(() => {
    let active = true;
    api
      .get<{ user: UserProfile }>('/auth/me')
      .then(({ user: sessionUser }) => {
        if (!active) return;
        setUserId(sessionUser.id);
        setProfile(sessionUser);
        storeSetUser(sessionUser);
      })
      .catch(() => {
        if (!active) return;
        setUserId(null);
        setProfile(null);
        storeSetUser(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [storeSetUser]);

  const signOut = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUserId(null);
      setProfile(null);
      storeSetUser(null);
      localStorage.removeItem('tradeumdiary-user');
      localStorage.removeItem('tradeumdiary-user-id');
      localStorage.removeItem('tradeumdiary-api-token');
      queryClient.clear();
    }
  }, [storeSetUser]);

  const setUser = useCallback(
    (newUser: UserProfile | null) => {
      if (newUser) {
        setProfile(newUser);
        storeSetUser(newUser);
        setUserId(newUser.id);
      } else {
        setProfile(null);
        storeSetUser(null);
        setUserId(null);
      }
    },
    [storeSetUser]
  );

  const contextValue = useMemo(
    () => ({
      userId,
      user,
      isAuthenticated: !!userId,
      isLoading,
      subscriptionTier: user?.subscription_tier || 'free',
      signOut,
      setUser,
    }),
    [userId, user, isLoading, signOut, setUser]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProviderInner>
            <OfflineBanner />
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#0D0F11',
                  color: '#F4F4F2',
                  border: '1px solid #34373C',
                  borderRadius: '6px',
                  fontSize: '12px',
                },
                success: {
                  iconTheme: { primary: '#71B67A', secondary: '#0D0F11' },
                },
                error: {
                  iconTheme: { primary: '#E15B5B', secondary: '#0D0F11' },
                },
              }}
            />
          </AuthProviderInner>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
