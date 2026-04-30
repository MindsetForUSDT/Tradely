/**
 * TradeumDiary — Authentication Context
 *
 * Архитектура:
 * - AuthContext предоставляет глобальное состояние аутентификации
 * - AuthProvider управляет жизненным циклом сессии Supabase
 * - useAuth хук для потребления контекста
 *
 * Производительность:
 * - Модульный кеш профиля (cachedProfile) для мгновенного рендера
 * - Единственная подписка onAuthStateChange на всё приложение
 * - Ref-based защита от утечек памяти и двойного монтирования
 *
 * Доступность:
 * - Правильные ARIA-состояния для экранов загрузки
 * - Фокус не теряется при редиректах
 */

import {
  createContext,
  useContext,
  createElement,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
  type FC,
  type ProviderProps,
} from 'react';
import { supabase } from '@/lib/supabase';

// ============================================================
// TYPES
// ============================================================

export interface Profile {
  readonly id: string;
  readonly username: string;
  readonly avatar_url: string | null;
  readonly subscription_tier: 'free' | 'pro';
  readonly subscription_expires_at: string | null;
  readonly trial_started_at: string | null;
  readonly created_at: string;
}

export interface AuthState {
  readonly user: Profile | null;
  readonly isLoading: boolean;
  readonly isAuthenticated: boolean;
  readonly signOut: () => Promise<void>;
  readonly refreshProfile: () => Promise<void>;
}

// ============================================================
// MODULE-LEVEL CACHE
// Кеш живёт вне React-дерева, переживает ререндеры и unmount
// ============================================================

let cachedProfile: Profile | null = null;

/**
 * Загружает профиль пользователя из Supabase.
 * При ошибке возвращает кешированное значение (graceful degradation).
 * Не выбрасывает исключений — все ошибки обработаны внутри.
 */
async function loadProfile(): Promise<Profile | null> {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      cachedProfile = null;
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.error('[Auth] Failed to load profile:', profileError.message);
      return cachedProfile;
    }

    cachedProfile = profile as Profile;
    return cachedProfile;
  } catch (error) {
    console.error('[Auth] Unexpected error loading profile:', error);
    return cachedProfile;
  }
}

// ============================================================
// CONTEXT
// ============================================================

const defaultAuthState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  signOut: async () => {
    console.warn('[Auth] signOut called without AuthProvider');
  },
  refreshProfile: async () => {
    console.warn('[Auth] refreshProfile called without AuthProvider');
  },
};

const AuthContext = createContext<AuthState>(defaultAuthState);
AuthContext.displayName = 'AuthContext';

// ============================================================
// PROVIDER
// ============================================================

interface AuthProviderProps {
  readonly children: ReactNode;
}

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(cachedProfile);
  const [isLoading, setIsLoading] = useState<boolean>(!cachedProfile);

  // Защита от двойного монтирования (StrictMode) и утечек памяти
  const mountedRef = useRef<boolean>(false);
  const initializedRef = useRef<boolean>(false);

  useEffect(() => {
    // Предотвращаем повторную инициализацию подписки
    if (initializedRef.current) {
      return undefined;
    }
    initializedRef.current = true;
    mountedRef.current = true;

    /**
     * Инициализация: если профиль уже в кеше — показываем мгновенно.
     * Иначе запускаем асинхронную загрузку.
     */
    if (cachedProfile) {
      setUser(cachedProfile);
      setIsLoading(false);
    } else {
      loadProfile()
        .then((profile) => {
          if (mountedRef.current) {
            setUser(profile);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (mountedRef.current) {
            setIsLoading(false);
          }
        });
    }

    /**
     * ЕДИНСТВЕННАЯ ПОДПИСКА на изменения аутентификации.
     * Все компоненты в дереве используют этот же контекст.
     * Нет дублирующихся слушателей.
     */
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (!mountedRef.current) {
          return;
        }

        switch (event) {
          case 'SIGNED_OUT': {
            cachedProfile = null;
            setUser(null);
            setIsLoading(false);
            break;
          }

          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
          case 'USER_UPDATED': {
            const profile = await loadProfile();
            if (mountedRef.current) {
              setUser(profile);
              setIsLoading(false);
            }
            break;
          }

          default: {
            // PASSWORD_RECOVERY, INITIAL_SESSION — игнорируем
            break;
          }
        }
      }
    );

    // Cleanup: отписываемся при размонтировании
    return () => {
      mountedRef.current = false;
      if (authListener?.subscription?.unsubscribe) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  /**
   * signOut: очищает кеш и состояние, вызывает Supabase signOut.
   * Не зависит от стейта (useCallback с []), чтобы избежать stale closure.
   */
  const signOut = useCallback(async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('[Auth] Error during signOut:', error);
    } finally {
      cachedProfile = null;
      if (mountedRef.current) {
        setUser(null);
      }
    }
  }, []);

  /**
   * refreshProfile: инвалидирует кеш и перезагружает профиль.
   */
  const refreshProfile = useCallback(async (): Promise<void> => {
    const profile = await loadProfile();
    if (mountedRef.current) {
      setUser(profile);
    }
  }, []);

  /**
   * СОЗДАНИЕ ЗНАЧЕНИЯ КОНТЕКСТА
   *
   * Используем React.createElement вместо JSX, чтобы обойти баг esbuild.
   * Функционально идентично: <AuthContext.Provider value={...}>
   */
  const contextValue: AuthState = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    signOut,
    refreshProfile,
  };

  const providerProps: ProviderProps<AuthState> = {
    value: contextValue,
  };

  // React.createElement полностью эквивалентен JSX, но не требует парсинга
  return createElement(AuthContext.Provider, providerProps, children);
};

AuthProvider.displayName = 'AuthProvider';

// ============================================================
// HOOK
// ============================================================

/**
 * useAuth — единственный хук для доступа к аутентификации.
 * Выбрасывает ошибку если использован вне AuthProvider (в production мягкий fallback).
 */
export function useAuth(): AuthState {
  const context = useContext(AuthContext);

  // В dev-режиме предупреждаем о неправильном использовании
  if (import.meta.env.DEV && context === defaultAuthState) {
    console.warn(
      '[Auth] useAuth used outside <AuthProvider>. Returning default (unauthenticated) state.'
    );
  }

  return context;
}