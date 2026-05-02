import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useWallets } from '@/hooks/useWallets';
import { shortenAddress, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

type ConnectionType = 'wallet' | 'exchange';
type Exchange = 'binance' | 'bybit' | 'okx';

const EXCHANGES = [
  { value: 'binance' as Exchange, label: 'Binance', icon: '🔶' },
  { value: 'bybit' as Exchange, label: 'Bybit', icon: '🔷' },
  { value: 'okx' as Exchange, label: 'OKX', icon: '🔵' },
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
  const [importingId, setImportingId] = useState<string | null>(null);

  const addWallet = async () => {
    if (!address.trim()) {
      toast.error('Введите адрес кошелька');
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setAdding(true);
    const { error } = await supabase.from('wallets').insert({
      user_id: user.id,
      address: address.trim(),
      chain: 'ethereum',
      label: label.trim() || address.trim().slice(0, 8),
    });

    if (error) {
      toast.error('Ошибка');
    } else {
      toast.success('Кошелёк добавлен!');
      setShowForm(false);
      setAddress('');
      setLabel('');
      refresh();
    }
    setAdding(false);
  };

  const addExchange = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      toast.error('Введите API ключ и секрет');
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setAdding(true);
    const { error } = await supabase.from('wallets').insert({
      user_id: user.id,
      address: `${exchange}:${apiKey.trim().slice(0, 8)}...`,
      chain: 'ethereum',
      label: label.trim() || exchange,
    });

    if (error) {
      toast.error('Ошибка');
    } else {
      toast.success(`${exchange} подключена!`);
      setShowForm(false);
      setApiKey('');
      setApiSecret('');
      setLabel('');
      refresh();
    }
    setAdding(false);
  };

  const importFromExchange = async (walletId: string) => {
    setImportingId(walletId);
    toast.loading('Импорт сделок...');

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-exchange-trades`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          exchange: 'binance',
          apiKey: '',
          apiSecret: '',
          userId: '77629667-dd24-487b-90ac-a2dbea8b994a',
        }),
      }
    );

    const data = await res.json();
    toast.dismiss();
    if (data.success) toast.success(`Импортировано ${data.imported} сделок`);
    else toast.error(data.error || 'Ошибка импорта');
    setImportingId(null);
    refresh();
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

      {showForm && (
        <Card padding="md" className="mb-4 space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setConnectionType('wallet')}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium',
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
                'flex-1 py-2 rounded-lg text-sm font-medium',
                connectionType === 'exchange'
                  ? 'bg-accent-green text-surface'
                  : 'bg-surface-overlay text-text-secondary'
              )}
            >
              🏦 Биржа
            </button>
          </div>

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
              <div>
                <span className="text-xs text-text-muted block mb-1">Название</span>
                <input
                  type="text"
                  placeholder="Мой кошелёк"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30"
                />
              </div>
              <Button variant="primary" onClick={addWallet} isLoading={adding} className="w-full">
                Добавить кошелёк
              </Button>
            </>
          )}

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
                  placeholder="API ключ"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30 font-mono"
                />
              </div>
              <div>
                <span className="text-xs text-text-muted block mb-1">API Secret</span>
                <input
                  type="password"
                  placeholder="Секретный ключ"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30 font-mono"
                />
              </div>
              <div>
                <span className="text-xs text-text-muted block mb-1">Название</span>
                <input
                  type="text"
                  placeholder={exchange}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30"
                />
              </div>
              <div className="p-4 rounded-xl bg-accent-green/5 border border-accent-green/20">
                <p className="text-accent-green font-semibold text-sm">🔒 Только для чтения</p>
                <p className="text-text-secondary text-xs mt-1">
                  Создайте API ключ с правами <strong>только на чтение</strong>. Торговля и вывод
                  средств невозможны.
                </p>
              </div>
              <Button variant="primary" onClick={addExchange} isLoading={adding} className="w-full">
                Подключить биржу
              </Button>
            </>
          )}
        </Card>
      )}

      {wallets.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-green/10 flex items-center justify-center mb-4">
              <span className="text-2xl">💳</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Нет подключений</h3>
            <p className="text-sm text-text-muted">Добавьте кошелёк или биржу</p>
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
                    {shortenAddress(w.address, 12)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={importingId === w.id}
                    onClick={() => importFromExchange(w.id)}
                  >
                    🔄 Импорт
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
