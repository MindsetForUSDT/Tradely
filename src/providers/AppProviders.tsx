import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ReactNode, useEffect, useState, useCallback, useMemo, useRef } from 'react';
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

const STORAGE_KEYS = {
  USER: 'tradeumdiary-user',
  USER_ID: 'tradeumdiary-user-id',
  API_TOKEN: 'tradeumdiary-api-token',
} as const;

function safelyParseUser(data: string | null): UserProfile | null {
  if (!data) return null;
  try {
    const parsed = JSON.parse(data);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.id === 'string' &&
      typeof parsed.username === 'string'
    ) {
      return parsed as UserProfile;
    }
    return null;
  } catch {
    return null;
  }
}

function AuthProviderInner({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const storeSetUser = useStore((s) => s.setUser);
  const initDone = useRef(false);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    const savedUser = safelyParseUser(localStorage.getItem(STORAGE_KEYS.USER));
    const savedUserId = localStorage.getItem(STORAGE_KEYS.USER_ID);
    const savedToken = localStorage.getItem(STORAGE_KEYS.API_TOKEN);

    if (savedUserId && savedUser) {
      setUserId(savedUserId);
      setProfile(savedUser);
      storeSetUser(savedUser);
      if (savedToken) {
        api.setTokenProvider(() => Promise.resolve(savedToken));
      }
    }

    setIsLoading(false);
  }, [storeSetUser]);

  const signOut = useCallback(() => {
    setUserId(null);
    setProfile(null);
    storeSetUser(null);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.USER_ID);
    localStorage.removeItem(STORAGE_KEYS.API_TOKEN);
    api.setTokenProvider(() => Promise.resolve(null));
    queryClient.clear();
    return Promise.resolve();
  }, [storeSetUser]);

  const setUser = useCallback(
    (newUser: UserProfile | null, token?: string) => {
      if (newUser) {
        setProfile(newUser);
        storeSetUser(newUser);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
        localStorage.setItem(STORAGE_KEYS.USER_ID, newUser.id);

        if (token) {
          localStorage.setItem(STORAGE_KEYS.API_TOKEN, token);
          api.setTokenProvider(() => Promise.resolve(token));
        }

        setUserId(newUser.id);
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
