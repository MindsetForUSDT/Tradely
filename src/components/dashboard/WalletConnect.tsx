import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useWallets } from '@/hooks/useWallets';
import { shortenAddress, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

type ConnectionType = 'wallet' | 'exchange';
type Exchange = 'binance' | 'bybit' | 'okx';

const EXCHANGES: { value: Exchange; label: string; icon: string }[] = [
  { value: 'binance', label: 'Binance', icon: '🔶' },
  { value: 'bybit', label: 'Bybit', icon: '🔷' },
  { value: 'okx', label: 'OKX', icon: '🔵' },
];

export function WalletConnect() {
  const { wallets, refresh } = useWallets();
  const [showForm, setShowForm] = useState(false);
  const [connectionType, setConnectionType] = useState<ConnectionType>('wallet');
  const [exchange, setExchange] = useState<Exchange>('binance');
  const [address, setAddress] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [label, setLabel] = useState('');
  const [adding, setAdding] = useState(false);

  const addConnection = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Не авторизован');
      return;
    }

    if (connectionType === 'wallet' && !address.trim()) {
      toast.error('Введите адрес кошелька');
      return;
    }
    if (connectionType === 'exchange' && (!apiKey.trim() || !apiSecret.trim())) {
      toast.error('Введите API ключ и секрет');
      return;
    }

    setAdding(true);
    try {
      const { error } = await supabase.from('wallets').insert({
        user_id: user.id,
        address:
          connectionType === 'wallet'
            ? address.trim()
            : `${exchange}:${apiKey.trim().slice(0, 8)}...`,
        chain: connectionType === 'exchange' ? 'exchange' : 'ethereum',
        label:
          label.trim() || (connectionType === 'wallet' ? address.trim().slice(0, 8) : exchange),
      });

      if (error) throw error;
      toast.success(connectionType === 'wallet' ? 'Кошелёк добавлен!' : 'Биржа подключена!');
      setShowForm(false);
      setAddress('');
      setApiKey('');
      setApiSecret('');
      setLabel('');
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка');
    }
    setAdding(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Кошельки и биржи</h1>
          <p className="text-sm text-text-muted mt-1">
            Подключите кошелёк или биржу для импорта сделок
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Отмена' : '+ Подключить'}
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
              {/* Выбор типа подключения */}
              <div className="flex gap-2">
                <button
                  onClick={() => setConnectionType('wallet')}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                    connectionType === 'wallet'
                      ? 'bg-accent-green text-surface'
                      : 'bg-surface-overlay text-text-secondary'
                  )}
                >
                  💳 Кошелёк
                </button>
                <button
                  onClick={() => setConnectionType('exchange')}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                    connectionType === 'exchange'
                      ? 'bg-accent-green text-surface'
                      : 'bg-surface-overlay text-text-secondary'
                  )}
                >
                  🏦 Биржа
                </button>
              </div>

              {/* Поля для кошелька */}
              {connectionType === 'wallet' && (
                <>
                  <div>
                    <span className="text-xs text-text-muted block mb-1">Адрес кошелька</span>
                    <input
                      type="text"
                      placeholder="0x..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30 font-mono"
                    />
                  </div>
                </>
              )}

              {/* Поля для биржи */}
              {connectionType === 'exchange' && (
                <>
                  <div>
                    <span className="text-xs text-text-muted block mb-1">Биржа</span>
                    <select
                      value={exchange}
                      onChange={(e) => setExchange(e.target.value as Exchange)}
                      className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-green/30"
                    >
                      {EXCHANGES.map((e) => (
                        <option key={e.value} value={e.value}>
                          {e.icon} {e.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="text-xs text-text-muted block mb-1">API Key</span>
                    <input
                      type="password"
                      placeholder="Введите API ключ"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30 font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-text-muted block mb-1">API Secret</span>
                    <input
                      type="password"
                      placeholder="Введите секретный ключ"
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                      className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30 font-mono"
                    />
                  </div>

                  {/* Блок безопасности */}
                  <div className="p-4 rounded-xl bg-accent-green/5 border border-accent-green/20 space-y-2">
                    <p className="text-accent-green font-semibold text-sm">
                      🔒 Только для чтения (Read-only)
                    </p>
                    <p className="text-text-secondary text-xs leading-relaxed">
                      При создании API ключа на бирже включите <strong>только чтение</strong> и
                      отключите торговлю и вывод средств. Ваши средства в полной безопасности — сайт
                      не сможет совершать сделки.
                    </p>
                    <div className="text-xs text-text-muted space-y-1 mt-2">
                      <p>
                        • Binance: отметьте{' '}
                        <span className="text-accent-green">Enable Spot Trading</span> → снимите
                        галочку <strong>Enable Trading</strong>
                      </p>
                      <p>
                        • Bybit: выберите <span className="text-accent-green">Read-only</span> при
                        создании ключа
                      </p>
                      <p>
                        • OKX: поставьте <span className="text-accent-green">Trade</span> →{' '}
                        <strong>Read</strong>
                      </p>
                    </div>
                  </div>
                </>
              )}

              <div>
                <span className="text-xs text-text-muted block mb-1">Название (опционально)</span>
                <input
                  type="text"
                  placeholder="Мой кошелёк"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30"
                />
              </div>

              <Button
                variant="primary"
                onClick={addConnection}
                isLoading={adding}
                className="w-full"
              >
                {connectionType === 'wallet' ? 'Добавить кошелёк' : 'Подключить биржу'}
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Список кошельков */}
      {wallets.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-green/10 flex items-center justify-center mb-4">
              <span className="text-2xl">💳</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Нет подключений</h3>
            <p className="text-sm text-text-muted">Добавьте кошелёк или биржу для импорта сделок</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {wallets.map((w: any) => (
            <Card key={w.id} padding="md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{w.label || shortenAddress(w.address, 8)}</p>
                  <p className="text-xs text-text-muted font-mono">
                    {w.chain === 'exchange' ? 'Биржа' : shortenAddress(w.address, 12)}
                  </p>
                </div>
                <span
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full',
                    w.processing_status === 'completed'
                      ? 'text-accent-green bg-accent-green/5'
                      : 'text-text-muted bg-surface-overlay'
                  )}
                >
                  {w.processing_status === 'completed' ? 'Готово' : w.processing_status}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
