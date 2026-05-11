// providers/AppProviders.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { OfflineBanner } from '@/components/ui/OfflineBanner';

// QueryClient с оптимальными настройками
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000, // В v5 заменили cacheTime на gcTime
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Типы
interface UserProfile {
  id: string;
  username: string;
  email?: string;
  subscription_tier: 'free' | 'pro';
  subscription_expires_at?: string; // ✅ Добавлено
  avatar_url?: string;
  created_at?: string;
}

interface AuthContextType {
  userId: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  subscriptionTier: 'free' | 'pro';
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  userId: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  subscriptionTier: 'free',
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Провайдер аутентификации
function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUserState] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const storeSetUser = useStore((s) => s.setUser);
  const setOnline = useStore((s) => s.setOnline);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        const userProfile: UserProfile = {
          id: session.user.id,
          username: session.user.email || 'User',
          subscription_tier: 'free',
          created_at: session.user.created_at,
        };
        setUserState(userProfile);
        storeSetUser(userProfile);
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        const userProfile: UserProfile = {
          id: session.user.id,
          username: session.user.email || 'User',
          subscription_tier: 'free',
          created_at: session.user.created_at,
        };
        setUserState(userProfile);
        storeSetUser(userProfile);
      } else {
        setUserId(null);
        setUserState(null);
        storeSetUser(null);
      }
    });

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [storeSetUser, setOnline]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserId(null);
    setUserState(null);
    storeSetUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        userId,
        user,
        isAuthenticated: !!userId,
        isLoading,
        subscriptionTier: user?.subscription_tier || 'free',
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Главный провайдер
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <OfflineBanner />
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1A1A1A',
                  color: '#FFFFFF',
                  border: '1px solid #2A2A2A',
                  borderRadius: '12px',
                  fontSize: '14px',
                },
                success: {
                  iconTheme: { primary: '#00FFA3', secondary: '#1A1A1A' },
                },
                error: {
                  iconTheme: { primary: '#FF3B5C', secondary: '#1A1A1A' },
                },
              }}
            />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
