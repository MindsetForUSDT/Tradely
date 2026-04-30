import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  subscription_tier: 'free' | 'pro';
  subscription_expires_at: string | null;
  trial_started_at: string | null;
  created_at: string;
}

interface AuthState {
  user: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

// Кеш профиля вне React
let cachedProfile: Profile | null = null;

async function loadProfile(): Promise<Profile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      cachedProfile = null;
      return null;
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    cachedProfile = data;
    return data;
  } catch {
    return cachedProfile;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(cachedProfile);
  const [isLoading, setIsLoading] = useState(!cachedProfile);
  const mountedRef = useRef(true);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    // Загружаем профиль только один раз
    if (cachedProfile) {
      setUser(cachedProfile);
      setIsLoading(false);
    } else {
      loadProfile().then(profile => {
        if (mountedRef.current) {
          setUser(profile);
          setIsLoading(false);
        }
      });
    }

    // ЕДИНСТВЕННАЯ подписка на изменения
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;

      if (event === 'SIGNED_OUT') {
        cachedProfile = null;
        setUser(null);
        setIsLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const profile = await loadProfile();
        if (mountedRef.current) {
          setUser(profile);
          setIsLoading(false);
        }
      }
    });

    subscriptionRef.current = subscription;

    return () => {
      mountedRef.current = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    cachedProfile = null;
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const profile = await loadProfile();
    if (mountedRef.current) {
      setUser(profile);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}