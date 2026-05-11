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
  setUser: (user: UserProfile | null) => void;
}

export const AuthContext = createContext<AuthContextType>({
  userId: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  subscriptionTier: 'free',
  signOut: async () => {},
  setUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

// Провайдер аутентификации
function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUserState] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const storeSetUser = useStore((s) => s.setUser);
  const setOnline = useStore((s) => s.setOnline);

  // Функция для ручного обновления пользователя (из форм регистрации/входа)
  const setUser = (newUser: UserProfile | null) => {
    console.log('[AuthProvider] setUser called:', newUser?.id || null);
    setUserState(newUser);
    if (newUser) {
      storeSetUser(newUser);
    }
  };

  useEffect(() => {
    console.log('[AuthProvider] Initializing auth...');

    // Проверяем существующую сессию
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('[AuthProvider] getSession error:', error);
        setIsLoading(false);
        return;
      }

      console.log(
        '[AuthProvider] getSession result:',
        session ? '✅ session found' : '❌ no session'
      );

      if (session?.user) {
        console.log('[AuthProvider] User logged in:', {
          id: session.user.id,
          email: session.user.email,
        });

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

    // Подписываемся на изменения состояния auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthProvider] onAuthStateChange:', {
        event,
        userId: session?.user?.id,
        hasSession: !!session,
      });

      if (session?.user) {
        console.log('[AuthProvider] Session created/updated for user:', session.user.id);
        setUserId(session.user.id);
        const userProfile: UserProfile = {
          id: session.user.id,
          username: session.user.email || 'User',
          subscription_tier: 'free',
          created_at: session.user.created_at,
        };
        setUserState(userProfile);
        storeSetUser(userProfile);
      } else if (event === 'SIGNED_OUT') {
        console.log('[AuthProvider] User signed out');
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
      console.log('[AuthProvider] Cleanup');
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [storeSetUser, setOnline]);

  const signOut = async () => {
    console.log('[AuthProvider] Signing out...');
    try {
      await supabase.auth.signOut();
      setUserId(null);
      setUserState(null);
      storeSetUser(null);
      console.log('[AuthProvider] Signed out successfully');
    } catch (error) {
      console.error('[AuthProvider] Sign out error:', error);
    }
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
        setUser,
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
