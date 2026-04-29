import { ReactNode, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface ProGuardProps {
  children: ReactNode;
  requirePro?: boolean;
}

// Лёгкий спиннер для Suspense
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 mx-auto rounded-full border-2 border-accent-green border-t-transparent animate-spin" />
        <p className="text-text-muted text-sm">Загрузка...</p>
      </div>
    </div>
  );
}

export function ProGuard({ children, requirePro = false }: ProGuardProps) {
  const { user, isLoading: authLoading } = useAuth();

  // Кошельки загружаем параллельно через React Query
  const { data: wallets = [], isLoading: walletsLoading } = useQuery({
    queryKey: ['wallets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .order('added_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,               // Запрос только когда есть пользователь
    staleTime: 60 * 1000,          // 1 минута кеша
  });

  // Единый loading state
  if (authLoading) {
    return <PageLoader />;
  }

  // Не авторизован
  if (!user) {
    return <Navigate to="/" replace />;
  }

  const now = new Date();
  const expiresAt = user.subscription_expires_at ? new Date(user.subscription_expires_at) : null;
  const isTierActive = expiresAt && expiresAt > now;
  const isPro = user.subscription_tier === 'pro' && isTierActive;
  const isTrialActive = user.subscription_tier === 'free' && isTierActive;

  if (requirePro && !isPro) {
    return <Navigate to="/subscribe" replace />;
  }

  if (isPro || isTrialActive) {
    // Показываем контент, даже если кошельки ещё грузятся
    if (walletsLoading) {
      return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
    }

    if (!wallets || wallets.length === 0) {
      return <Navigate to="/dashboard/wallets?required=true" replace />;
    }

    return <>{children}</>;
  }

  return <Navigate to="/subscribe" replace />;
}