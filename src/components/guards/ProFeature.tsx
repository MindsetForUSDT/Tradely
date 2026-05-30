// components/guards/ProFeature.tsx — ПРЕМИУМ ВЕРСИЯ
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface ProFeatureProps {
  children: ReactNode;
  fallback?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  blur?: boolean;
}

export function ProFeature({ children, fallback, size = 'md', blur = true }: ProFeatureProps) {
  const { user } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const now = new Date();
  const expiresAt = user?.subscription_expires_at ? new Date(user.subscription_expires_at) : null;
  const isPro = user?.subscription_tier === 'pro' && expiresAt && expiresAt > now;

  if (isPro) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <>
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border border-surface-border bg-surface-100',
          blur && 'group'
        )}
      >
        <div
          className={cn(
            sizeClasses[size],
            blur &&
              'blur-sm select-none group-hover:blur-none group-hover:select-auto transition-all duration-300'
          )}
        >
          {children}
        </div>

        {/* Overlay с CTA */}
        <div className="absolute inset-0 flex items-center justify-center bg-surface-100/95 backdrop-blur-sm">
          <div className="text-center p-6 max-w-xs">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-accent-purple/20 to-accent-cyan/20 flex items-center justify-center mb-3 border border-accent-purple/30">
              <span className="text-2xl">💎</span>
            </div>
            <h3 className="text-base font-bold text-text-primary mb-1">
              <span className="bg-gradient-to-r from-accent-purple to-accent-cyan bg-clip-text text-transparent">
                Pro функция
              </span>
            </h3>
            <p className="text-text-muted text-xs mb-4">Доступно для Pro подписчиков</p>
            <Button
              onClick={() => setShowUpgradeModal(true)}
              className="w-full bg-gradient-to-r from-accent-purple to-accent-cyan hover:from-accent-cyan hover:to-accent-green transition-all text-xs py-2"
            >
              <Icon name="pro" size={14} className="mr-1.5" />
              Upgrade to Pro
            </Button>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowUpgradeModal(false)}
        >
          <div
            className="w-full max-w-2xl bg-surface-100 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-accent-purple/20 to-accent-cyan/20 p-8 border-b border-surface-border">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-accent-purple to-accent-cyan flex items-center justify-center mb-4 shadow-lg shadow-accent-purple/30">
                  <span className="text-4xl">💎</span>
                </div>
                <h2 className="text-3xl font-bold text-text-primary mb-2">
                  Upgrade to{' '}
                  <span className="bg-gradient-to-r from-accent-purple to-accent-cyan bg-clip-text text-transparent">
                    Pro
                  </span>
                </h2>
                <p className="text-text-muted">Откройте весь потенциал TradeumDiary</p>
              </div>
            </div>

            <div className="p-8 space-y-6">
              {/* Что включено */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Icon name="shield" size={18} className="text-accent-green" />
                  Что вы получаете:
                </h3>
                <div className="grid gap-2.5">
                  {[
                    '📊 Продвинутая аналитика P&L',
                    '🧠 Поведенческая психометрика',
                    '📈 AI-инсайты и рекомендации',
                    '🔍 Forensic анализ сделок',
                    '🎯 Институциональные метрики',
                    '📱 Приоритетная поддержка',
                  ].map((feature, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 bg-surface-overlay rounded-lg"
                    >
                      <div className="w-6 h-6 rounded-full bg-accent-green/20 flex items-center justify-center flex-shrink-0">
                        <Icon name="shield" size={12} className="text-accent-green" />
                      </div>
                      <span className="text-text-primary text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Выберите план:</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 bg-surface-overlay rounded-xl border border-surface-border hover:border-accent-primary/50 transition-colors cursor-pointer">
                    <p className="text-xs text-text-muted uppercase mb-2">Monthly</p>
                    <p className="text-2xl font-bold font-mono text-text-primary">$19</p>
                    <p className="text-xs text-text-muted">/месяц</p>
                  </div>
                  <div className="p-4 bg-gradient-to-b from-accent-purple/20 to-accent-cyan/20 rounded-xl border-2 border-accent-purple/50 relative cursor-pointer">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-accent-purple to-accent-cyan text-white text-xs font-medium rounded-full shadow-lg">
                      Популярные
                    </div>
                    <p className="text-xs text-text-muted uppercase mb-2">Quarterly</p>
                    <p className="text-2xl font-bold font-mono text-text-primary">$49</p>
                    <p className="text-xs text-accent-green">экономия 18%</p>
                  </div>
                  <div className="p-4 bg-surface-overlay rounded-xl border border-surface-border hover:border-accent-primary/50 transition-colors cursor-pointer">
                    <p className="text-xs text-text-muted uppercase mb-2">Yearly</p>
                    <p className="text-2xl font-bold font-mono text-text-primary">$149</p>
                    <p className="text-xs text-accent-green">экономия 35%</p>
                  </div>
                </div>
              </div>

              {/* Guarantee */}
              <div className="p-4 bg-accent-green/5 rounded-lg border border-accent-green/20">
                <p className="text-sm text-text-primary flex items-center gap-2">
                  <Icon name="shield" size={14} className="text-accent-green" />
                  <span>30-дневная гарантия возврата средств</span>
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <Button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    window.location.href = '/payment';
                  }}
                  className="w-full bg-gradient-to-r from-accent-purple to-accent-cyan hover:from-accent-cyan hover:to-accent-green transition-all py-4 text-lg"
                >
                  <span className="mr-2">💎</span>
                  Начать Pro подписку
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowUpgradeModal(false)}
                  className="w-full"
                >
                  Возможно позже
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
