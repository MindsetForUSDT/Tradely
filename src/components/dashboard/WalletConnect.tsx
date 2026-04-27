import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
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
  last_synced_at: string | null;
  error_message: string | null;
  added_at: string;
}

const CHAINS: { value: BlockchainNetwork; label: string; icon: string }[] = [
  { value: 'ethereum', label: 'Ethereum', icon: '⟠' },
  { value: 'solana', label: 'Solana', icon: '◎' },
  { value: 'polygon', label: 'Polygon', icon: '⬡' },
  { value: 'bsc', label: 'BSC', icon: '🔶' },
  { value: 'arbitrum', label: 'Arbitrum', icon: '🔷' },
  { value: 'optimism', label: 'Optimism', icon: '🔴' },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'В очереди', color: 'text-yellow-400' },
  processing: { label: 'Обработка', color: 'text-blue-400' },
  completed: { label: 'Готово', color: 'text-accent-green' },
  failed: { label: 'Ошибка', color: 'text-accent-red' },
};

export function WalletConnect() {
  const { user } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newChain, setNewChain] = useState<BlockchainNetwork>('ethereum');
  const [newLabel, setNewLabel] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const fetchWallets = useCallback(async () => {
    if (!user) return;
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/wallets?user_id=eq.${user.id}&order=added_at.desc`,
      {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session?.access_token}`,
        },
      }
    );
    const data = await res.json();
    setWallets(Array.isArray(data) ? data : []);
    setIsLoading(false);
  }, [user]);

  useEffect(() => { fetchWallets(); }, [fetchWallets]);

  const handleAddWallet = async () => {
    if (!newAddress.trim() || !user) return;
    if (newAddress.length < 10) { toast.error('Введите корректный адрес'); return; }
    setIsAdding(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/wallets`, {
      method: 'POST',
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id: user.id,
        address: newAddress.trim(),
        chain: newChain,
        label: newLabel.trim() || null,
      }),
    });
    if (res.ok) {
      toast.success('Кошелёк добавлен!');
      setNewAddress('');
      setNewLabel('');
      setShowAddForm(false);
      fetchWallets();
    } else {
      const err = await res.json();
      toast.error(err.message || 'Ошибка добавления');
    }
    setIsAdding(false);
  };

  const handleDeleteWallet = async (walletId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/wallets?id=eq.${walletId}`, {
      method: 'DELETE',
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session?.access_token}`,
      },
    });
    if (res.ok) {
      toast.success('Кошелёк удалён');
      fetchWallets();
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Кошельки</h1>
            <p className="text-sm text-text-muted mt-1">Добавьте публичные адреса для автоматического импорта сделок</p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Отмена' : '+ Кошелёк'}
          </Button>
        </div>

        <AnimatePresence>
          {showAddForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <Card padding="md" className="mb-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Адрес кошелька</label>
                  <input type="text" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="0x... или Solana-адрес" className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Сеть</label>
                    <select value={newChain} onChange={(e) => setNewChain(e.target.value as BlockchainNetwork)} className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-green/30">
                      {CHAINS.map((c) => (
                        <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Название</label>
                    <input type="text" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Основной" className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30" />
                  </div>
                </div>
                <Button variant="primary" isLoading={isAdding} onClick={handleAddWallet} className="w-full">Добавить кошелёк</Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="space-y-3">{[1, 2].map((i) => (<Card key={i} padding="md"><div className="animate-pulse space-y-2"><div className="h-4 w-48 bg-surface-border rounded" /><div className="h-3 w-32 bg-surface-border rounded" /></div></Card>))}</div>
        ) : wallets.length === 0 ? (
          <Card padding="lg"><div className="flex flex-col items-center justify-center py-8 text-text-muted"><p className="text-sm font-medium">Нет добавленных кошельков</p><p className="text-xs mt-1">Нажмите «+ Кошелёк» чтобы начать</p></div></Card>
        ) : (
          <AnimatePresence>
            <div className="space-y-3">
              {wallets.map((wallet) => {
                const chain = CHAINS.find((c) => c.value === wallet.chain);
                const status = STATUS_MAP[wallet.processing_status] || { label: wallet.processing_status, color: 'text-text-muted' };
                return (
                  <motion.div key={wallet.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <Card padding="md">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{chain?.icon}</span>
                            <span className="text-sm font-medium truncate">{wallet.label || shortenAddress(wallet.address, 6)}</span>
                            <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-overlay', status?.color)}>{status?.label}</span>
                          </div>
                          <p className="text-xs text-text-muted font-mono">{shortenAddress(wallet.address, 8)}</p>
                        </div>
                        <button onClick={() => handleDeleteWallet(wallet.id)} className="p-2 text-text-muted hover:text-accent-red transition-colors rounded-lg hover:bg-accent-red/5">🗑</button>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
}