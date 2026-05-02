import React, { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    if (cachedProfileV2) {
      setUser(cachedProfileV2);
      setIsLoading(false);
    } else {
      loadProfileV2().then((p) => {
        if (mounted) {
          setUser(p);
          setIsLoading(false);
        }
      });
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') {
        cachedProfileV2 = null;
        setUser(null);
        setIsLoading(false);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const p = await loadProfileV2();
        if (mounted) {
          setUser(p);
          setIsLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
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
    setUser(p);
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
