import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icons';

export function RequireWallet() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <Card padding="lg" className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-green/10 flex items-center justify-center">
          <Icon name="wallet" size={32} className="text-accent-green" />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2">Подключите кошелёк</h2>
          <p className="text-sm text-text-muted leading-relaxed">
            Для доступа к дашборду необходимо подключить хотя бы один кошелёк.
          </p>
        </div>
        <button
          onClick={() => (window.location.href = '/dashboard/wallets')}
          className="w-full py-3 bg-accent-green text-surface rounded-xl font-semibold hover:bg-accent-green-dim transition-all duration-200 active:scale-[0.98] inline-flex items-center justify-center gap-2"
        >
          <Icon name="wallet-add" size={18} />
          Подключить кошелёк
        </button>
      </Card>
    </div>
  );
}

/* ✅ Исправлено: SVG заменён на Icon, добавлены transition */
