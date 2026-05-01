// FIX: 2026-05-02 — esbuild JSX parsing bug on Render
// Обход через React.createElement вместо JSX

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/hooks/useAuth';
import type { Profile } from '@/hooks/useAuth';

interface AuthState {
  readonly user: Profile | null;
  readonly isLoading: boolean;
  readonly isAuthenticated: boolean;
  readonly signOut: () => Promise<void>;
  readonly refreshProfile: () => Promise<void>;
}

let cachedProfileV2: Profile | null = null;

async function loadProfileV2(): Promise<Profile | null> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      cachedProfileV2 = null;
      return null;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    cachedProfileV2 = profile;
    return cachedProfileV2;
  } catch {
    return cachedProfileV2;
  }
}

export function AuthProviderV2({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(cachedProfileV2);
  const [isLoading, setIsLoading] = useState(!cachedProfileV2);
  const mountedRef = useRef(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    mountedRef.current = true;

    if (cachedProfileV2) {
      setUser(cachedProfileV2);
      setIsLoading(false);
    } else {
      loadProfileV2().then((p) => {
        if (mountedRef.current) { setUser(p); setIsLoading(false); }
      });
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (!mountedRef.current) return;
      if (event === 'SIGNED_OUT') {
        cachedProfileV2 = null;
        setUser(null);
        setIsLoading(false);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const p = await loadProfileV2();
        if (mountedRef.current) { setUser(p); setIsLoading(false); }
      }
    });

    return () => {
      mountedRef.current = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    cachedProfileV2 = null;
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const p = await loadProfileV2();
    if (mountedRef.current) setUser(p);
  }, []);

  const value: AuthState = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    signOut,
    refreshProfile,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}