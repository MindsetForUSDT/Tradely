// providers/AppProviders.tsx
import { useEffect, useState, createContext, useContext, ReactNode, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import { useStore } from '@/store/useStore';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { OfflineBanner } from '@/components/ui/OfflineBanner';

// QueryClient с оптимальными настройками
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000, // 5 минут — данные актуальны
      gcTime: 30 * 60_000, // 30 минут — удерживаем в памяти
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Экспоненциальная задержка
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        console.error('[Mutation Error]', error);
      },
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

  const setUser = (newUser: UserProfile | null) => {
    setUserState(newUser);
    if (newUser) {
      storeSetUser(newUser);
    }
  };

  // Загрузка профиля из таблицы profiles
  const loadUserProfile = useCallback(async (userId: string, email?: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

      if (error) {
        console.error('[AuthProvider] Profile load error:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('[AuthProvider] Profile load exception:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await Promise.race([
          supabase.auth.getSession(),
          new Promise<{ data: { session: null }; error: any }>((resolve) =>
            setTimeout(() => resolve({ data: { session: null }, error: null }), 10000)
          ),
        ]);

        if (!isMounted) return;

        if (error) {
          console.error('[AuthProvider] getSession error:', error);
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          const profile = await loadUserProfile(session.user.id, session.user.email || undefined);

          if (!isMounted) return;

          setUserId(session.user.id);
          const userProfile: UserProfile = {
            id: session.user.id,
            username: profile?.username || session.user.email || 'User',
            email: session.user.email,
            subscription_tier: profile?.subscription_tier || 'free',
            subscription_expires_at: profile?.subscription_expires_at,
            avatar_url: profile?.avatar_url,
            created_at: session.user.created_at,
          };
          setUserState(userProfile);
          storeSetUser(userProfile);
        }
        setIsLoading(false);
      } catch (err) {
        console.error('[AuthProvider] Session check error:', err);
        if (isMounted) setIsLoading(false);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        const profile = await loadUserProfile(session.user.id, session.user.email || undefined);

        if (!isMounted) return;

        setUserId(session.user.id);
        const userProfile: UserProfile = {
          id: session.user.id,
          username: profile?.username || session.user.email || 'User',
          email: session.user.email,
          subscription_tier: profile?.subscription_tier || 'free',
          subscription_expires_at: profile?.subscription_expires_at,
          avatar_url: profile?.avatar_url,
          created_at: session.user.created_at,
        };
        setUserState(userProfile);
        storeSetUser(userProfile);
      } else if (event === 'SIGNED_OUT') {
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
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [storeSetUser, setOnline, loadUserProfile]);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('[AuthProvider] Sign out error:', error);
        toast.error('Ошибка выхода: ' + error.message);
        return;
      }

      // Очистка состояния
      setUserId(null);
      setUserState(null);
      storeSetUser(null);

      // Очистка кэша запросов
      queryClient.clear();

      // Очистка localStorage (кроме критичных данных)
      const keysToRemove = Object.keys(localStorage).filter(
        (key) =>
          key.startsWith('tradeumdiary-') ||
          key.startsWith('supabase.auth.token') ||
          key.startsWith('sb-')
      );
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      toast.success('Вы вышли из аккаунта');
    } catch (error: any) {
      console.error('[AuthProvider] Sign out exception:', error);
      toast.error('Ошибка выхода: ' + (error.message || 'Неизвестная ошибка'));
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
