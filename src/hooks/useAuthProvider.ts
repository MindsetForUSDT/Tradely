import React, { useState, useEffect, useCallback, type ReactNode } from 'react';
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

export function AuthProviderV2({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        if (!session) {
          setUser(null);
          setIsLoading(false);
          return;
        }

        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile }) => {
            if (mounted) {
              setUser(profile);
              setIsLoading(false);
            }
          })
          .catch(() => {
            if (mounted) {
              setUser(null);
              setIsLoading(false);
            }
          });
      })
      .catch(() => {
        if (mounted) {
          setUser(null);
          setIsLoading(false);
        }
      });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsLoading(false);
        return;
      }
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (mounted) {
          setUser(profile);
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
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (authUser) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
      if (profile) setUser(profile);
    }
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
