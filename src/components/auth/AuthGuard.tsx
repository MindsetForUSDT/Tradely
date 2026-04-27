import { Navigate } from 'react-router-dom';
import { getToken } from '@/lib/supabase';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const token = getToken();

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}