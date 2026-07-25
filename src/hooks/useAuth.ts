import { createContext, useContext } from 'react';

export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  subscription_tier: 'free' | 'pro';
  subscription_expires_at?: string;
  avatar_url?: string;
  created_at?: string;
}

export interface AuthContextType {
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
