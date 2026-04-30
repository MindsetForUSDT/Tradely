import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useWallets } from '@/hooks/useWallets';
import { shortenAddress, cn } from '@/lib/utils';
import { CHAINS, validateAddress, type BlockchainNetwork } from '@/lib/chains';
import { verifyWallet } from '@/lib/explorer';
import toast from 'react-hot-toast';

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
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    balance?: string;
    transactionsCount?: number;
    error?: string;
  } | null>(null);

  // ============================================================
  // Слушатели смены сети и аккаунта MetaMask
  // ============================================================
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const handleChainChanged = (chainId: string) => {
      console.warn('[Wallet] Chain changed to:', chainId);
      // Перезагружаем страницу при смене сети (рекомендация MetaMask)
      window.location.reload();
    };

    const handleAccountsChanged = (accounts: string[]) => {
      console.warn('[Wallet] Account changed:', accounts);
      if (accounts.length === 0) {
        // Пользователь отключил кошелёк
        toast.error('Кошелёк отключён');
      }
    };

    window.ethereum.on('chainChanged', handleChainChanged);
    window.ethereum.on('accountsChanged', handleAccountsChanged);

    return () => {
      window.ethereum?.removeListener?.('chainChanged', handleChainChanged);
      window.ethereum?.removeListener?.('accountsChanged', handleAccountsChanged);
    };
  }, []);

  const handleVerify = async () => {
    // Валидация формата
    const validation = validateAddress(address, chain);
    if (!validation.valid) {
      toast.error(validation.error!);
      return;
    }

    setVerifying(true);
    setVerificationResult(null);

    try {
      const result = await verifyWallet(address, chain);

      if (result.exists) {
        setVerificationResult({
          verified: true,
          balance: result.balance,
          transactionsCount: result.transactionsCount,
        });
        toast.success('Кошелёк найден в сети!');
      } else {
        setVerificationResult({
          verified: false,
          error: result.error || 'Адрес не найден',
        });
        toast.error(result.error || 'Адрес не найден в сети');
      }
    } catch (err) {
      setVerificationResult({
        verified: false,
        error: 'Ошибка проверки',
      });
      toast.error('Ошибка проверки адреса');
    } finally {
      setVerifying(false);
    }
  };

  const addWallet = async () => {
    if (!verificationResult?.verified) {
      toast.error('Сначала проверьте адрес');
      return;
    }

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

      if (error) {
        if (error.code === '23505') {
          toast.error('Этот кошелёк уже добавлен');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Кошелёк добавлен!');
      setAddress('');
      setLabel('');
      setVerificationResult(null);
      setShowForm(false);
      refresh();
    } catch (e) {
      toast.error('Ошибка добавления');
    } finally {
      setAdding(false);
    }
  };

  const deleteWallet = async (id: string) => {
    const { error } = await supabase.from('wallets').delete().eq('id', id);
    if (error) {
      toast.error('Ошибка удаления');
    } else {
      toast.success('Кошелёк удалён');
      refresh();
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Кошельки</h1>
          <p className="text-sm text-text-muted mt-1">
            {wallets.length > 0
              ? `Добавлено кошельков: ${wallets.length}`
              : 'Добавьте кошелёк для импорта сделок'}
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setShowForm(!showForm);
            setVerificationResult(null);
            setAddress('');
            setLabel('');
          }}
        >
          {showForm ? 'Отмена' : '+ Кошелёк'}
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card padding="md" className="mb-4 space-y-4">
              <div>
                <label className="text-xs text-text-muted block mb-1">Адрес кошелька</label>
                <input
                  type="text"
                  placeholder="0x... или Solana адрес"
                  value={address}
                  onChange={e => {
                    setAddress(e.target.value);
                    setVerificationResult(null);
                  }}
                  className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-text-muted block mb-1">Сеть</label>
                  <select
                    value={chain}
                    onChange={e => {
                      setChain(e.target.value as BlockchainNetwork);
                      setVerificationResult(null);
                    }}
                    className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-green/30"
                  >
                    {CHAINS.map(c => (
                      <option key={c.value} value={c.value}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-text-muted block mb-1">Название (опционально)</label>
                  <input
                    type="text"
                    placeholder="Мой кошелёк"
                    value={label}
                    onChange={e => setLabel(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30"
                  />
                </div>
              </div>

              {/* Результат проверки */}
              {verificationResult && (
                <div
                  className={cn(
                    'p-4 rounded-xl text-sm',
                    verificationResult.verified
                      ? 'bg-accent-green/5 border border-accent-green/20'
                      : 'bg-accent-red/5 border border-accent-red/20'
                  )}
                >
                  {verificationResult.verified ? (
                    <div className="space-y-1">
                      <p className="text-accent-green font-medium">✓ Кошелёк подтверждён</p>
                      {verificationResult.balance && (
                        <p className="text-text-secondary text-xs">
                          Баланс: {verificationResult.balance} wei
                        </p>
                      )}
                      {verificationResult.transactionsCount !== undefined && (
                        <p className="text-text-secondary text-xs">
                          Транзакций: {verificationResult.transactionsCount}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-accent-red">{verificationResult.error}</p>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleVerify}
                  isLoading={verifying}
                  className="flex-1"
                >
                  Проверить адрес
                </Button>
                <Button
                  variant="primary"
                  onClick={addWallet}
                  isLoading={adding}
                  disabled={!verificationResult?.verified}
                  className="flex-1"
                >
                  Добавить
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Список кошельков */}
      {isLoading ? (
        <Card padding="md">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-surface-border rounded-lg" />
            ))}
          </div>
        </Card>
      ) : wallets.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-green/10 flex items-center justify-center mb-4">
              <span className="text-2xl">💳</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Нет кошельков</h3>
            <p className="text-sm text-text-muted mb-4">
              Добавьте адрес кошелька для автоматического импорта сделок
            </p>
            <p className="text-xs text-text-muted">
              Поддерживаются: {CHAINS.map(c => c.label).join(', ')}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {wallets.map(w => {
            const chainConfig = CHAINS.find(x => x.value === w.chain);
            const status = STATUS_MAP[w.processing_status] || {
              label: w.processing_status,
              color: 'text-text-muted',
            };

            return (
              <Card key={w.id} padding="md">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{chainConfig?.icon}</span>
                      <span className="text-sm font-medium truncate">
                        {w.label || shortenAddress(w.address, 6)}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full',
                          status.color,
                          'bg-surface-overlay'
                        )}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted font-mono">
                      {shortenAddress(w.address, 8)}
                    </p>
                    {w.error_message && (
                      <p className="text-xs text-accent-red mt-1">{w.error_message}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <a
                      href={`${chainConfig?.explorerUrl}/${w.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-text-muted hover:text-accent-green transition-colors"
                      title="Открыть в explorer"
                    >
                      ↗
                    </a>
                    <button
                      onClick={() => deleteWallet(w.id)}
                      className="text-text-muted hover:text-accent-red transition-colors p-1"
                      title="Удалить кошелёк"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}