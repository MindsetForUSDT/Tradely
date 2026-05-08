import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function RequireWallet() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <Card padding="lg" className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-green/10 flex items-center justify-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-accent-green"
          >
            <path d="M21 12V7H5a2 2 0 010-4h14v4" />
            <path d="M3 5v14a2 2 0 002 2h16v-5" />
            <path d="M18 12a2 2 0 000 4h4v-4h-4z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2">Подключите кошелёк</h2>
          <p className="text-sm text-text-muted leading-relaxed">
            Для доступа к дашборду необходимо подключить хотя бы один кошелёк. Мы автоматически
            импортируем историю сделок и построим аналитику.
          </p>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => (window.location.href = '/dashboard/wallets')}
            className="w-full py-3 bg-accent-green text-surface rounded-xl font-semibold"
          >
            Подключить кошелёк
          </button>
          <p className="text-xs text-text-muted">
            Поддерживаются Ethereum, Solana, Polygon, BSC, Arbitrum, Optimism
          </p>
        </div>
      </Card>
    </div>
  );
}
