import { useAuth } from '@/hooks/useAuth';

export function ProGuard({
  children,
  requirePro = false,
}: {
  children: React.ReactNode;
  requirePro?: boolean;
}) {
  const { user } = useAuth();
  if (!user) {
    window.location.href = '/';
    return null;
  }

  const now = new Date();
  const expiresAt = user.subscription_expires_at ? new Date(user.subscription_expires_at) : null;
  const isTierActive = expiresAt && expiresAt > now;
  const isPro = user.subscription_tier === 'pro' && isTierActive;
  const isTrialActive = user.subscription_tier === 'free' && isTierActive;

  if (requirePro && !isPro) {
    window.location.href = '/subscribe';
    return null;
  }
  if (!isPro && !isTrialActive) {
    window.location.href = '/subscribe';
    return null;
  }

  return <>{children}</>;
}
