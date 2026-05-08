import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { shortenAddress, cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

type WalletSource = 'metamask' | 'trustwallet' | 'binance' | 'bybit' | 'okx' | 'manual';

const SOURCES = [
  { value: 'metamask' as WalletSource, label: 'MetaMask', icon: '🦊', desc: 'Браузерный кошелёк' },
  {
    value: 'trustwallet' as WalletSource,
    label: 'Trust Wallet',
    icon: '🛡️',
    desc: 'Мобильный кошелёк',
  },
  { value: 'binance' as WalletSource, label: 'Binance', icon: '🔶', desc: 'Биржа (API ключ)' },
  { value: 'bybit' as WalletSource, label: 'Bybit', icon: '🔷', desc: 'Биржа (API ключ)' },
  { value: 'okx' as WalletSource, label: 'OKX', icon: '🔵', desc: 'Биржа (API ключ)' },
  { value: 'manual' as WalletSource, label: 'Другой', icon: '💳', desc: 'Ввести адрес' },
];

export function WalletConnect() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [source, setSource] = useState<WalletSource | null>(null);
  const [address, setAddress] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [label, setLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const queryClient = useQueryClient();

  const isExchange = source === 'binance' || source === 'bybit' || source === 'okx';

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    const raw = localStorage.getItem('tradeumdiary-auth');
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      const uid =
        p?.user?.id ||
        (p?.access_token ? JSON.parse(atob(p.access_token.split('.')[1])).sub : null);
      if (!uid) return;
      const { data } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', uid)
        .order('added_at', { ascending: false });
      if (data) setWallets(data);
    } catch {
      /* ignore */
    }
  };

  const handleAdd = async () => {
    const raw = localStorage.getItem('tradeumdiary-auth');
    if (!raw) {
      toast.error('Не авторизован: нет данных сессии');
      return;
    }

    let uid: string | null = null;
    try {
      const p = JSON.parse(raw);
      uid = p?.user?.id;
      if (!uid && p?.access_token) {
        const payload = JSON.parse(atob(p.access_token.split('.')[1]));
        uid = payload.sub;
      }
    } catch {
      toast.error('Ошибка чтения сессии');
      return;
    }

    if (!uid) {
      toast.error('Не авторизован: ID не найден');
      return;
    }
    if (!isExchange && !address.trim()) {
      toast.error('Введите адрес');
      return;
    }
    if (isExchange && (!apiKey.trim() || !apiSecret.trim())) {
      toast.error('Введите API ключ и секрет');
      return;
    }

    setAdding(true);
    try {
      const walletAddress = isExchange ? `${source}:${apiKey.slice(0, 8)}***` : address.trim();
      const { error } = await supabase.from('wallets').insert({
        user_id: uid,
        address: walletAddress,
        chain: 'ethereum',
        label: label || source || 'Кошелёк',
      });
      if (error) {
        toast.error('Ошибка: ' + error.message);
        setAdding(false);
        return;
      }
      toast.success('Добавлен!');
      setSource(null);
      setAddress('');
      setApiKey('');
      setApiSecret('');
      setLabel('');
      loadWallets();
      queryClient.invalidateQueries({ queryKey: ['trades'] });
    } catch {
      toast.error('Сетевая ошибка');
    }
    setAdding(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Кошельки</h1>
        <div className="relative" style={{ zIndex: 50 }}>
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="px-4 py-2 bg-accent-green text-surface rounded-xl text-sm font-semibold cursor-pointer"
          >
            + Кошелёк
          </button>
          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-surface-elevated border border-surface-border rounded-2xl shadow-2xl z-50">
              <div className="p-2">
                <p className="text-xs text-text-muted px-3 py-2">Выберите источник</p>
                {SOURCES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => {
                      setSource(s.value);
                      setShowDropdown(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface-overlay text-left cursor-pointer"
                  >
                    <span className="text-2xl">{s.icon}</span>
                    <div>
                      <p className="text-sm">{s.label}</p>
                      <p className="text-xs text-text-muted">{s.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {source && (
        <Card padding="md" className="space-y-4">
          <button
            type="button"
            onClick={() => setSource(null)}
            className="text-text-muted hover:text-text-primary text-sm cursor-pointer"
          >
            ← Назад
          </button>
          {isExchange && (
            <>
              <div className="p-4 rounded-xl bg-accent-green/5 border border-accent-green/20">
                <p className="text-accent-green font-semibold text-sm">🔒 Только чтение</p>
                <p className="text-text-secondary text-xs mt-1">
                  Создайте API ключ с правами только на чтение.
                </p>
              </div>
              <input
                type="password"
                placeholder="API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white font-mono"
              />
              <input
                type="password"
                placeholder="API Secret"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white font-mono"
              />
            </>
          )}
          {!isExchange && (
            <input
              type="text"
              placeholder="0x..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white font-mono"
            />
          )}
          <input
            type="text"
            placeholder="Название"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            className="w-full py-3 bg-accent-green text-surface rounded-xl font-semibold disabled:opacity-50 cursor-pointer"
          >
            {adding ? 'Добавление...' : 'Добавить'}
          </button>
        </Card>
      )}

      {!source && wallets.length === 0 && (
        <Card padding="lg">
          <div className="text-center py-8">
            <span className="text-3xl">💳</span>
            <h3 className="text-lg font-semibold mt-4">Нет кошельков</h3>
            <p className="text-sm text-text-muted mt-1">Нажмите + Кошелёк</p>
          </div>
        </Card>
      )}
      {!source && wallets.length > 0 && (
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
