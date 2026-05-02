import { createContext, useContext } from 'react';

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
// Перенаправление на единый провайдер
export { useAuth, AuthContext } from '@/providers/AppProviders';
export type { Profile } from '@/types';
export const AuthContext = createContext<AuthState>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}
