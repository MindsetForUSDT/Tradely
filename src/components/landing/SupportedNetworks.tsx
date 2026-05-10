import { Icon } from '@/components/ui/Icons';

const networks = [
  { name: 'Ethereum', icon: 'metamask' as const },
  { name: 'Solana', icon: 'wallet' as const },
  { name: 'Polygon', icon: 'trades' as const },
  { name: 'BSC', icon: 'binance' as const },
  { name: 'Arbitrum', icon: 'chart' as const },
  { name: 'Optimism', icon: 'shield' as const },
  { name: 'Avalanche', icon: 'star' as const },
  { name: 'Base', icon: 'journal' as const },
];

export function SupportedNetworks() {
  return (
    <section className="py-16 px-4 border-y border-cyber-700/20">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-xs text-text-muted uppercase tracking-widest mb-6">
          Поддерживаемые сети
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {networks.map((n) => (
            <div
              key={n.name}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyber-900/50 border border-cyber-700/30"
            >
              <Icon name={n.icon} size={18} className="text-neon-cyan" />
              <span className="text-sm text-text-secondary">{n.name}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-text-muted mt-6">
          Данные синхронизируются через официальное API
        </p>
      </div>
    </section>
  );
}
