import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useWallets } from '@/hooks/useWallets';
import { shortenAddress, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

type BlockchainNetwork = 'ethereum' | 'solana' | 'polygon' | 'bsc' | 'arbitrum' | 'optimism';

interface Wallet {
  id: string;
  user_id: string;
  address: string;
  chain: string;
  label: string | null;
  processing_status: string;
  error_message: string | null;
  added_at: string;
}

const CHAINS = [
  { value: 'ethereum' as BlockchainNetwork, label: 'Ethereum', icon: '⟠' },
  { value: 'solana' as BlockchainNetwork, label: 'Solana', icon: '◎' },
  { value: 'polygon' as BlockchainNetwork, label: 'Polygon', icon: '⬡' },
  { value: 'bsc' as BlockchainNetwork, label: 'BSC', icon: '🔶' },
  { value: 'arbitrum' as BlockchainNetwork, label: 'Arbitrum', icon: '🔷' },
  { value: 'optimism' as BlockchainNetwork, label: 'Optimism', icon: '🔴' },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'В очереди', color: 'text-yellow-400' },
  processing: { label: 'Обработка', color: 'text-blue-400' },
  completed: { label: 'Готово', color: 'text-accent-green' },
  failed: { label: 'Ошибка', color: 'text-accent-red' },
};

export function WalletConnect() {
  const { wallets, isLoading, refresh } = useWallets();
  const [showForm, setShowForm] = useState(false);
  const [address, setAddress] = useState('');
  const [chain, setChain] = useState<BlockchainNetwork>('ethereum');
  const [label, setLabel] = useState('');
  const [adding, setAdding] = useState(false);

  const addWallet = async () => {
    if (!address.trim()) { toast.error('Введите адрес'); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setAdding(true);
    try {
      const { error } = await supabase.from('wallets').insert({
        user_id: user.id,
        address: address.trim(),
        chain,
        label: label.trim() || null,
      });

      if (error) throw error;

      toast.success('Кошелёк добавлен!');
      setAddress('');
      setLabel('');
      setShowForm(false);
      refresh();
    } catch (e) {
      toast.error('Ошибка добавления');
    }
    setAdding(false);
  };

  const deleteWallet = async (id: string) => {
    const { error } = await supabase.from('wallets').delete().eq('id', id);
    if (!error) refresh();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Кошельки</h1>
          <p className="text-sm text-text-muted mt-1">Автоматический импорт сделок</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Отмена' : '+ Кошелёк'}
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Card padding="md" className="mb-4 space-y-4">
              <input
                type="text"
                placeholder="Адрес кошелька"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30"
              />
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={chain}
                  onChange={e => setChain(e.target.value as BlockchainNetwork)}
                  className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-green/30"
                >
                  {CHAINS.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                </select>
                <input
                  type="text"
                  placeholder="Название"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30"
                />
              </div>
              <Button variant="primary" onClick={addWallet} isLoading={adding} className="w-full">
                Добавить
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <Card padding="md"><div className="animate-pulse h-16 bg-surface-border rounded" /></Card>
      ) : wallets.length === 0 ? (
        <Card padding="lg"><p className="text-center text-text-muted">Нет кошельков</p></Card>
      ) : (
        <div className="space-y-3">
          {wallets.map(w => {
            const c = CHAINS.find(x => x.value === w.chain);
            const s = STATUS_MAP[w.processing_status] || { label: w.processing_status, color: 'text-text-muted' };
            return (
              <Card key={w.id} padding="md">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span>{c?.icon}</span>
                      <span className="text-sm font-medium">{w.label || shortenAddress(w.address, 6)}</span>
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full bg-surface-overlay', s.color)}>
                        {s.label}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted font-mono mt-1">{shortenAddress(w.address, 8)}</p>
                  </div>
                  <button onClick={() => deleteWallet(w.id)} className="text-text-muted hover:text-accent-red">
                    🗑
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}