import React, { createContext, useContext, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

interface UserProfile {
  id: string;
  email?: string;
  subscription_tier: 'free' | 'pro';
  subscription_expires_at: string | null;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1, refetchOnWindowFocus: false } },
});

function AuthProvider({ children }: { children: ReactNode }) {
  const [user] = useState<UserProfile | null>(null);

  const value: AuthContextType = {
    user,
    isLoading: false,
    isAuthenticated: false,
    signOut: async () => {},
    refreshProfile: async () => {},
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function AppProviders({ children }: AppProvidersProps) {
  return React.createElement(
    QueryClientProvider,
    { client: queryClient },
    React.createElement(AuthProvider, null, children)
  );
}

interface AppProvidersProps {
  readonly children: ReactNode;
}
