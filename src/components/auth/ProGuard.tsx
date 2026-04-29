import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ReactNode } from 'react';

interface ProGuardProps {
  children: ReactNode;
  requirePro?: boolean;
}

export function ProGuard({ children, requirePro = false }: ProGuardProps) {
  const { user, isLoading: authLoading } = useAuth();

  // ✅ Кошельки загружаются ПАРАЛЛЕЛЬНО с авторизацией,
  // а не ждут её завершения
  const { data: wallets } = useQuery({
    queryKey: ['wallets'],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    // ✅ Запрос выполняется только когда есть user.id
    enabled: !!user?.id,
    // ✅ Кошельки кешируем на 5 минут
    staleTime: 5 * 60 * 1000,
  });

  // ✅ Быстрый спиннер только при первой загрузке
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-8 h-8 rounded-full border-2 border-accent-green border-t-transparent animate-spin" />
      </div>
    );
  }

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
    // ✅ Не ждём загрузки кошельков — показываем контент сразу
    // Проверка на пустые кошельки произойдёт в DashboardLayout
    return <>{children}</>;
  }

  return <Navigate to="/subscribe" replace />;
}