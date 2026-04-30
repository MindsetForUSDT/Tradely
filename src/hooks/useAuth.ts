import {
  createContext,
  useContext,
  createElement,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';

export interface Profile {
  readonly id: string;
  readonly username: string;
  readonly avatar_url: string | null;
  readonly subscription_tier: 'free' | 'pro';
  readonly subscription_expires_at: string | null;
  readonly trial_started_at: string | null;
  readonly created_at: string;
}

interface AuthState {
  readonly user: Profile | null;
  readonly isLoading: boolean;
  readonly isAuthenticated: boolean;
  readonly signOut: () => Promise<void>;
  readonly refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

let cachedProfile: Profile | null = null;

async function loadProfile(): Promise<Profile | null> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      cachedProfile = null;
      return null;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    cachedProfile = profile;
    return cachedProfile;
  } catch {
    return cachedProfile;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(cachedProfile);
  const [isLoading, setIsLoading] = useState(!cachedProfile);
  const mountedRef = useRef(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    mountedRef.current = true;

    if (cachedProfile) {
      setUser(cachedProfile);
      setIsLoading(false);
    } else {
      loadProfile().then((profile) => {
        if (mountedRef.current) {
          setUser(profile);
          setIsLoading(false);
        }
      });
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
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

    return () => {
      mountedRef.current = false;
      authListener?.subscription?.unsubscribe();
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

  return createElement(
    AuthContext.Provider,
    {
      value: {
        user,
        isLoading,
        isAuthenticated: !!user,
        signOut,
        refreshProfile,
      },
    },
    children
  );
}

export function useAuth() {
  return useContext(AuthContext);
}