import { Navigate } from 'react-router-dom';

function hasToken(): boolean {
  const key = 'sb-' + (import.meta.env.VITE_SUPABASE_URL as string).split('//')[1] + '-auth-token';
  return !!localStorage.getItem(key);
}

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  if (!hasToken()) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}