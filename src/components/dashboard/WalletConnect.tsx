import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { useWallets } from '@/hooks/useWallets';
import { shortenAddress, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

type WalletSource = 'metamask' | 'trustwallet' | 'binance' | 'bybit' | 'okx' | 'manual';

const SOURCES: { value: WalletSource; label: string; icon: string; description: string }[] = [
  { value: 'metamask', label: 'MetaMask', icon: '🦊', description: 'Браузерный кошелёк' },
  { value: 'trustwallet', label: 'Trust Wallet', icon: '🛡️', description: 'Мобильный кошелёк' },
  { value: 'binance', label: 'Binance', icon: '🔶', description: 'Биржа (только API ключ)' },
  { value: 'bybit', label: 'Bybit', icon: '🔷', description: 'Биржа (только API ключ)' },
  { value: 'okx', label: 'OKX', icon: '🔵', description: 'Биржа (только API ключ)' },
  { value: 'manual', label: 'Другой кошелёк', icon: '💳', description: 'Ввести адрес вручную' },
];

export function WalletConnect() {
  const { wallets, refresh } = useWallets();
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedSource, setSelectedSource] = useState<WalletSource | null>(null);
  const [address, setAddress] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [label, setLabel] = useState('');
  const [adding, setAdding] = useState(false);

  const isExchange =
    selectedSource === 'binance' || selectedSource === 'bybit' || selectedSource === 'okx';

  const addWallet = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Не авторизован');
      return;
    }

    if (!isExchange && !address.trim()) {
      toast.error('Введите адрес кошелька');
      return;
    }
    if (isExchange && (!apiKey.trim() || !apiSecret.trim())) {
      toast.error('Введите API ключ и секрет');
      return;
    }

    setAdding(true);
    const walletAddress = isExchange
      ? `${selectedSource}:${apiKey.trim().slice(0, 8)}***`
      : address.trim();

    const { error } = await supabase.from('wallets').insert({
      user_id: user.id,
      address: walletAddress,
      chain: 'ethereum',
      label: label.trim() || selectedSource || 'Кошелёк',
    });

    if (error) {
      toast.error('Ошибка добавления');
    } else {
      toast.success('Кошелёк добавлен!');
      setShowDropdown(false);
      setSelectedSource(null);
      setAddress('');
      setApiKey('');
      setApiSecret('');
      setLabel('');
      refresh();
    }
    setAdding(false);
  };

  const handleSourceSelect = (source: WalletSource) => {
    setSelectedSource(source);
    setShowDropdown(false);
  };

  const handleBack = () => {
    setSelectedSource(null);
    setShowDropdown(true);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Кошельки</h1>
          <p className="text-sm text-text-muted mt-1">
            {wallets.length > 0
              ? `Подключено: ${wallets.length}`
              : 'Подключите кошелёк для импорта сделок'}
          </p>
        </div>

        {/* Выпадающее меню */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="px-4 py-2 bg-accent-green text-surface rounded-xl text-sm font-semibold hover:bg-accent-green-dim transition-colors cursor-pointer"
          >
            + Кошелёк
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-surface-elevated border border-surface-border rounded-2xl shadow-2xl z-50 overflow-hidden">
              <div className="p-2">
                <p className="text-xs text-text-muted px-3 py-2">Выберите источник кошелька</p>
                {SOURCES.map((source) => (
                  <button
                    key={source.value}
                    onClick={() => handleSourceSelect(source.value)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface-overlay transition-colors text-left"
                  >
                    <span className="text-2xl">{source.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{source.label}</p>
                      <p className="text-xs text-text-muted">{source.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Форма добавления */}
      {selectedSource && (
        <Card padding="md" className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={handleBack}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              ← Назад
            </button>
            <span className="text-sm font-medium text-text-primary">
              {SOURCES.find((s) => s.value === selectedSource)?.icon}{' '}
              {SOURCES.find((s) => s.value === selectedSource)?.label}
            </span>
          </div>

          {isExchange ? (
            <>
              <div className="p-4 rounded-xl bg-accent-green/5 border border-accent-green/20">
                <p className="text-accent-green font-semibold text-sm">
                  🔒 Только для чтения (Read-only)
                </p>
                <p className="text-text-secondary text-xs mt-1 leading-relaxed">
                  Создайте API ключ с правами <strong>только на чтение</strong>. Торговля и вывод
                  средств невозможны. Ваши средства в безопасности.
                </p>
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
            </>
          ) : (
            <div>
              <span className="text-xs text-text-muted block mb-1">Адрес кошелька</span>
              <input
                type="text"
                placeholder={selectedSource === 'metamask' ? '0x...' : 'Введите адрес'}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30 font-mono"
              />
            </div>
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

          <button
            onClick={addWallet}
            disabled={adding}
            className="w-full py-3 bg-accent-green text-surface rounded-xl font-semibold hover:bg-accent-green-dim transition-colors disabled:opacity-50 cursor-pointer"
          >
            {adding ? 'Добавление...' : 'Добавить кошелёк'}
          </button>
        </Card>
      )}

      {/* Список кошельков */}
      {!selectedSource && wallets.length === 0 && (
        <Card padding="lg">
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-green/10 flex items-center justify-center mb-4">
              <span className="text-2xl">💳</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Нет кошельков</h3>
            <p className="text-sm text-text-muted">Нажмите "+ Кошелёк" чтобы добавить</p>
          </div>
        </Card>
      )}

      {!selectedSource && wallets.length > 0 && (
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
