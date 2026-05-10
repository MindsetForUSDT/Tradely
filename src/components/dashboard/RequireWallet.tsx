import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icons';

export function RequireWallet() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <Card glow="cyan" scanLine className="max-w-md w-full text-center p-8 space-y-6">
        <div className="w-16 h-16 mx-auto border border-neon-cyan/20 flex items-center justify-center bg-surface-elevated">
          <Icon name="wallet" size={32} className="text-neon-cyan" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-text-primary mb-2">ИНИЦИАЛИЗАЦИЯ</h2>
          <p className="font-mono text-xs text-text-secondary leading-relaxed">
            Для доступа к торговому терминалу необходимо подключить кошелёк.
          </p>
        </div>
        <button
          onClick={() => (window.location.href = '/dashboard/wallets')}
          className="hud-button-primary w-full"
        >
          [ ПОДКЛЮЧИТЬ КОШЕЛЁК ]
        </button>
        <p className="font-mono text-[10px] text-text-muted">↑ ETH · SOL · BSC · ARB · BASE ↑</p>
      </Card>
    </div>
  );
}
