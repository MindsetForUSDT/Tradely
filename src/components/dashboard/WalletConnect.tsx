// ============================================================
// TradeumDiary — Компонент управления кошельками
// Добавление, просмотр и удаление кошельков
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { shortenAddress, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Wallet, BlockchainNetwork } from '@/types';

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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Загрузка кошельков
  const fetchWallets = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (error) throw error;
      setWallets(data as Wallet[]);
    } catch (err) {
      console.error('❌ Ошибка загрузки кошельков:', err);
      toast.error('Ошибка загрузки кошельков');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  // Подписка на изменения статуса обработки
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('wallet-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchWallets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchWallets]);

  // Добавление кошелька
  const handleAddWallet = async () => {
    if (!newAddress.trim() || !user) return;

    // Базовая валидация адреса
    if (newAddress.length < 10) {
      toast.error('Введите корректный адрес кошелька');
      return;
    }

    setIsAdding(true);

    try {
      const { error } = await supabase.from('wallets').insert({
        user_id: user.id,
        address: newAddress.trim(),
        chain: newChain,
        label: newLabel.trim() || null,
      });

      if (error) {
        if (error.message.includes('unique_wallet_per_user')) {
          toast.error('Этот кошелёк уже добавлен');
        } else if (error.message.includes('3')) {
          toast.error('Бесплатный план: не более 3 кошельков');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Кошелёк добавлен! Импорт начнётся автоматически.');
      setNewAddress('');
      setNewLabel('');
      setShowAddForm(false);
      fetchWallets();
    } catch (err) {
      console.error('❌ Ошибка добавления кошелька:', err);
      toast.error('Ошибка добавления кошелька');
    } finally {
      setIsAdding(false);
    }
  };

  // Удаление кошелька
  const handleDeleteWallet = async (walletId: string) => {
    setDeletingId(walletId);

    try {
      const { error } = await supabase
        .from('wallets')
        .delete()
        .eq('id', walletId);

      if (error) throw error;

      toast.success('Кошелёк удалён');
      fetchWallets();
    } catch (err) {
      console.error('❌ Ошибка удаления кошелька:', err);
      toast.error('Ошибка удаления кошелька');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Кошельки</h1>
            <p className="text-sm text-text-muted mt-1">
              Добавьте публичные адреса для автоматического импорта сделок
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? 'Отмена' : '+ Кошелёк'}
          </Button>
        </div>

        {/* Форма добавления */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <Card padding="md" className="mb-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Адрес кошелька
                  </label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="0x... или Solana-адрес"
                    className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30 focus:border-accent-green/50 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      Сеть
                    </label>
                    <select
                      value={newChain}
                      onChange={(e) => setNewChain(e.target.value as BlockchainNetwork)}
                      className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-green/30 focus:border-accent-green/50 transition-colors"
                    >
                      {CHAINS.map((chain) => (
                        <option key={chain.value} value={chain.value}>
                          {chain.icon} {chain.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      Название (опционально)
                    </label>
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="Основной"
                      className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30 focus:border-accent-green/50 transition-colors"
                    />
                  </div>
                </div>

                <Button
                  variant="primary"
                  isLoading={isAdding}
                  onClick={handleAddWallet}
                  className="w-full"
                >
                  Добавить кошелёк
                </Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Список кошельков */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Card key={i} padding="md">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 w-48 bg-surface-border rounded" />
                  <div className="h-3 w-32 bg-surface-border rounded" />
                </div>
              </Card>
            ))}
          </div>
        ) : wallets.length === 0 ? (
          <Card padding="lg">
            <div className="flex flex-col items-center justify-center py-8 text-text-muted">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4 opacity-50">
                <path d="M21 12V7H5a2 2 0 010-4h14v4" />
                <path d="M3 5v14a2 2 0 002 2h16v-5" />
                <path d="M18 12a2 2 0 000 4h4v-4h-4z" />
              </svg>
              <p className="text-sm font-medium">Нет добавленных кошельков</p>
              <p className="text-xs mt-1">Нажмите «+ Кошелёк» чтобы начать</p>
            </div>
          </Card>
        ) : (
          <AnimatePresence>
            <div className="space-y-3">
              {wallets.map((wallet) => {
                const chain = CHAINS.find((c) => c.value === wallet.chain);
                const status = STATUS_MAP[wallet.processing_status];

                return (
                  <motion.div
                    key={wallet.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <Card padding="md">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{chain?.icon}</span>
                            <span className="text-sm font-medium truncate">
                              {wallet.label || shortenAddress(wallet.address, 6)}
                            </span>
                            <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-overlay', status?.color)}>
                              {status?.label}
                            </span>
                          </div>
                          <p className="text-xs text-text-muted font-mono">
                            {shortenAddress(wallet.address, 8)}
                          </p>
                        </div>

                        <button
                          onClick={() => handleDeleteWallet(wallet.id)}
                          disabled={deletingId === wallet.id}
                          className="p-2 text-text-muted hover:text-accent-red transition-colors rounded-lg hover:bg-accent-red/5"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </div>

                      {wallet.error_message && (
                        <p className="text-xs text-accent-red mt-2">
                          {wallet.error_message}
                        </p>
                      )}
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