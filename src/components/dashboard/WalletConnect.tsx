import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { shortenAddress, cn } from '@/lib/utils';
import { Icon } from '@/components/ui/Icons';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { WalletValidator } from '@/components/wallets/WalletValidator';

// ===================== ТИПЫ =====================

type Category = 'crypto' | 'stocks' | 'forex';

interface Provider {
  id: string;
  label: string;
  icon: string;
  url: string;
  category: Category;
  type: 'web3' | 'cex' | 'broker';
  needsPassphrase?: boolean;
}

interface WalletFormData {
  category: Category | null;
  provider: Provider | null;
  apiKey: string;
  apiSecret: string;
  apiPassphrase: string;
  label: string;
  startDate: string;
  autoSync: boolean;
  syncInterval: number;
  validatedBalance: number | null;
}

interface Wallet {
  id: string;
  user_id: string;
  address: string;
  chain: string;
  label?: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  last_synced_at?: string;
  cex_provider?: string;
  web3_provider?: string;
  added_at: string;
}

// ===================== ПРОВАЙДЕРЫ =====================

const PROVIDERS: Provider[] = [
  // --- Крипто / Web3 ---
  {
    id: 'metamask',
    label: 'MetaMask',
    icon: 'metamask',
    url: 'https://metamask.io',
    category: 'crypto',
    type: 'web3',
  },
  {
    id: 'walletconnect',
    label: 'WalletConnect',
    icon: 'trustwallet',
    url: 'https://walletconnect.com',
    category: 'crypto',
    type: 'web3',
  },
  {
    id: 'trustwallet',
    label: 'Trust Wallet',
    icon: 'trustwallet',
    url: 'https://trustwallet.com',
    category: 'crypto',
    type: 'web3',
  },
  {
    id: 'coinbase',
    label: 'Coinbase Wallet',
    icon: 'coinbase',
    url: 'https://www.coinbase.com/wallet',
    category: 'crypto',
    type: 'web3',
  },
  // --- Крипто / CEX ---
  {
    id: 'binance',
    label: 'Binance',
    icon: 'binance',
    url: 'https://www.binance.com',
    category: 'crypto',
    type: 'cex',
  },
  {
    id: 'bybit',
    label: 'Bybit',
    icon: 'bybit',
    url: 'https://www.bybit.com',
    category: 'crypto',
    type: 'cex',
  },
  {
    id: 'okx',
    label: 'OKX',
    icon: 'okx',
    url: 'https://www.okx.com',
    category: 'crypto',
    type: 'cex',
    needsPassphrase: true,
  },
  {
    id: 'kucoin',
    label: 'KuCoin',
    icon: 'kucoin',
    url: 'https://www.kucoin.com',
    category: 'crypto',
    type: 'cex',
  },
  {
    id: 'kraken',
    label: 'Kraken',
    icon: 'alert',
    url: 'https://www.kraken.com',
    category: 'crypto',
    type: 'cex',
  },
  {
    id: 'gateio',
    label: 'Gate.io',
    icon: 'alert',
    url: 'https://www.gate.io',
    category: 'crypto',
    type: 'cex',
  },
  // --- Фондовый рынок ---
  {
    id: 'tinkoff',
    label: 'Тинькофф Инвестиции',
    icon: 'wallet',
    url: 'https://www.tinkoff.ru/invest/',
    category: 'stocks',
    type: 'broker',
  },
  {
    id: 'ibkr',
    label: 'Interactive Brokers',
    icon: 'wallet',
    url: 'https://www.interactivebrokers.com',
    category: 'stocks',
    type: 'broker',
  },
  {
    id: 'freedom',
    label: 'Freedom Finance',
    icon: 'wallet',
    url: 'https://freedomfinance.ru',
    category: 'stocks',
    type: 'broker',
  },
  {
    id: 'bcs',
    label: 'БКС Мир инвестиций',
    icon: 'wallet',
    url: 'https://www.bcs.ru',
    category: 'stocks',
    type: 'broker',
  },
  {
    id: 'finam',
    label: 'Финам',
    icon: 'wallet',
    url: 'https://www.finam.ru',
    category: 'stocks',
    type: 'broker',
  },
  // --- Forex ---
  {
    id: 'alpari',
    label: 'Alpari',
    icon: 'wallet',
    url: 'https://alpari.com',
    category: 'forex',
    type: 'broker',
  },
  {
    id: 'roboforex',
    label: 'RoboForex',
    icon: 'wallet',
    url: 'https://roboforex.com',
    category: 'forex',
    type: 'broker',
  },
  {
    id: 'fxopen',
    label: 'FXOpen',
    icon: 'wallet',
    url: 'https://fxopen.com',
    category: 'forex',
    type: 'broker',
  },
];

const CATEGORIES: Array<{ id: Category; label: string; desc: string; icon: string }> = [
  { id: 'crypto', label: 'Крипто', desc: 'Биржи и Web3 кошельки', icon: 'binance' },
  { id: 'stocks', label: 'Фондовый рынок', desc: 'Брокеры РФ и мира', icon: 'wallet' },
  { id: 'forex', label: 'Forex', desc: 'Валютные брокеры', icon: 'wallet' },
];

const INITIAL_FORM: WalletFormData = {
  category: null,
  provider: null,
  apiKey: '',
  apiSecret: '',
  apiPassphrase: '',
  label: '',
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  autoSync: true,
  syncInterval: 60,
  validatedBalance: null,
};

// ===================== КОМПОНЕНТ =====================

export function WalletConnect() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<'category' | 'provider' | 'details'>('category');
  const [form, setForm] = useState<WalletFormData>(INITIAL_FORM);
  const [adding, setAdding] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_verifying, setVerifying] = useState(false);
  const [syncingWalletId, setSyncingWalletId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [validationStatus, setValidationStatus] = useState<{
    valid: boolean;
    balance?: number;
  } | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<Wallet[]>('/wallets');
      setWallets(data);
    } catch {
      setWallets([]);
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!form.provider) {
      errors.provider = 'Выберите провайдера';
    }

    if (form.provider?.type !== 'web3') {
      if (!form.apiKey.trim()) errors.apiKey = 'Введите API ключ';
      if (!form.apiSecret.trim()) errors.apiSecret = 'Введите API секрет';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form]);

  const handleSelectCategory = (category: Category) => {
    setForm({ ...INITIAL_FORM, category });
    setStep('provider');
    setValidationErrors({});
  };

  const handleSelectProvider = (provider: Provider) => {
    setForm((prev) => ({ ...prev, provider, validatedBalance: null }));
    setStep('details');
    setValidationErrors({});
    setValidationStatus(null);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleVerify = async () => {
    if (!validateForm()) return;
    setVerifying(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      toast.success('Подключение успешно проверено!');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ошибка проверки';
      toast.error(msg);
    }
    setVerifying(false);
  };

  const handleValidation = (valid: boolean, balance?: number) => {
    setValidationStatus({ valid, balance });
    if (valid) {
      setForm((prev) => ({ ...prev, validatedBalance: balance ?? null }));
    }
  };

  const handleAdd = async () => {
    if (!validateForm()) return;
    if (!form.provider) return;

    // Для CEX провайдеров проверяем валидацию
    if (form.provider.type === 'cex' && !validationStatus?.valid) {
      toast.error('Сначала проверьте API ключи');
      return;
    }

    setAdding(true);
    try {
      // Преобразуем дату в формат ISO для БД
      const importFromDate = form.startDate ? new Date(form.startDate) : undefined;

      const walletData = {
        address: `${form.provider.id}:${Date.now().toString(36)}`,
        chain: form.provider.category,
        label: form.label || form.provider.label,
        cex_provider: form.provider.type === 'cex' ? form.provider.id : null,
        web3_provider: form.provider.type === 'web3' ? form.provider.id : null,
        processing_status: 'pending',
        import_from_date: importFromDate ? importFromDate.toISOString() : undefined,
        // API ключи передаем отдельно, сервер зашифрует их
        ...(form.provider.type !== 'web3' && {
          apiKey: form.apiKey,
          apiSecret: form.apiSecret,
          ...(form.provider.needsPassphrase && { apiPassphrase: form.apiPassphrase }),
        }),
        settings: JSON.stringify({
          category: form.provider.category,
          providerType: form.provider.type,
          providerId: form.provider.id,
          autoSync: form.autoSync,
          syncInterval: form.syncInterval,
          ...(validationStatus?.balance && { initialBalance: validationStatus.balance }),
        }),
      };

      await api.post<Wallet>('/wallets', walletData);
      toast.success('Кошелёк добавлен!');

      setForm(INITIAL_FORM);
      setStep('category');
      setValidationErrors({});
      setValidationStatus(null);
      await loadWallets();
      queryClient.invalidateQueries({ queryKey: ['trades'] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ошибка при добавлении';
      toast.error(msg);
    }
    setAdding(false);
  };

  const handleManualSync = async (walletId: string) => {
    if (syncingWalletId) {
      toast.error('Синхронизация уже запущена');
      return;
    }
    setSyncingWalletId(walletId);
    try {
      await api.post(`/wallets/${walletId}/sync`, {});
      toast.success('Синхронизация запущена!');
      await loadWallets();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ошибка синхронизации';
      toast.error(msg);
    } finally {
      setSyncingWalletId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Удалить кошелёк и все связанные сделки? Это действие нельзя отменить.'))
      return;
    try {
      await api.delete(`/wallets/${id}`);
      await loadWallets();
      toast.success('Кошелёк удалён');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ошибка удаления';
      toast.error(msg);
    }
  };

  const getWalletIcon = (w: Wallet): string => {
    const lbl = (w.label || '').toLowerCase();
    if (lbl.includes('meta')) return 'metamask';
    if (lbl.includes('trust') || lbl.includes('walletconnect')) return 'trustwallet';
    if (lbl.includes('coinbase')) return 'coinbase';
    if (['binance', 'bybit', 'okx', 'kucoin', 'kraken', 'gate.io'].some((x) => lbl.includes(x)))
      return 'binance';
    return 'wallet';
  };

  const getCategoryLabel = (chain: string): string => {
    const map: Record<string, string> = { crypto: 'Крипто', stocks: 'Фондовый', forex: 'Forex' };
    return map[chain] || chain;
  };

  // ===================== RENDER =====================

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {isLoading && (
        <div className="p-4 rounded-xl bg-accent-green/5 border border-accent-green/20">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
            <p className="text-accent-green font-semibold text-sm">Загрузка кошельков...</p>
          </div>
        </div>
      )}

      {/* === ШАГ 1: Выбор категории === */}
      {step === 'category' && (
        <>
          <Card padding="lg" className="space-y-4">
            <h3 className="text-base font-semibold">Выберите рынок</h3>
            <div className="grid grid-cols-3 gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat.id)}
                  className="p-4 rounded-xl border border-surface-border bg-surface-elevated hover:bg-surface-overlay hover:border-accent-green/30 transition-all duration-200 text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent-green/10 flex items-center justify-center mb-3 group-hover:bg-accent-green/20 transition-colors">
                    <Icon name={cat.icon as any} size={22} className="text-accent-green" />
                  </div>
                  <p className="text-sm font-semibold">{cat.label}</p>
                  <p className="text-xs text-text-muted mt-1">{cat.desc}</p>
                </button>
              ))}
            </div>
          </Card>

          {wallets.length === 0 && !isLoading && (
            <Card padding="lg">
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-green/10 flex items-center justify-center mb-4">
                  <Icon name="wallet" size={28} className="text-accent-green" />
                </div>
                <h3 className="text-lg font-semibold">Нет подключений</h3>
                <p className="text-sm text-text-muted mt-1">
                  Выберите рынок выше, чтобы добавить кошелёк
                </p>
              </div>
            </Card>
          )}

          {wallets.length > 0 && (
            <div className="space-y-3">
              {wallets.map((w) => (
                <Card key={w.id} padding="md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent-green/10 flex items-center justify-center">
                        <Icon
                          name={getWalletIcon(w) as any}
                          size={20}
                          className="text-accent-green"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {w.label || shortenAddress(w.address, 8)}
                        </p>
                        <p className="text-xs text-text-muted font-mono truncate">{w.address}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-border text-text-muted mt-0.5 inline-block">
                          {getCategoryLabel(w.chain)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full block mb-1',
                            w.processing_status === 'completed'
                              ? 'text-accent-green bg-accent-green/5'
                              : w.processing_status === 'pending'
                                ? 'text-yellow-400 bg-yellow-400/5'
                                : 'text-text-muted bg-surface-border'
                          )}
                        >
                          {w.processing_status === 'completed'
                            ? 'Готово'
                            : w.processing_status === 'pending'
                              ? 'Ожидает'
                              : 'Обработка'}
                        </span>
                        {w.processing_status === 'pending' && (
                          <button
                            onClick={() => handleManualSync(w.id)}
                            disabled={syncingWalletId === w.id}
                            className="text-xs text-accent-green hover:underline disabled:text-text-muted"
                          >
                            {syncingWalletId === w.id ? 'Запуск...' : 'Синхронизировать'}
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(w.id)}
                        className="text-text-muted hover:text-accent-red transition-colors p-1 rounded-lg hover:bg-accent-red/5"
                        title="Удалить"
                      >
                        <Icon name="delete" size={14} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* === ШАГ 2: Выбор провайдера === */}
      {step === 'provider' && form.category && (
        <Card padding="lg" className="space-y-4">
          <button
            onClick={() => {
              setStep('category');
              setValidationErrors({});
            }}
            className="text-text-muted hover:text-text-primary text-sm inline-flex items-center gap-1.5 transition-colors"
          >
            <Icon name="back" size={14} /> Назад к рынкам
          </button>

          <h3 className="text-base font-semibold">
            {CATEGORIES.find((c) => c.id === form.category)?.label} — выберите провайдера
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {PROVIDERS.filter((p) => p.category === form.category).map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectProvider(p)}
                className="p-4 rounded-xl border border-surface-border bg-surface-elevated hover:bg-surface-overlay hover:border-accent-green/30 transition-all duration-200 text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-accent-green/10 flex items-center justify-center shrink-0 group-hover:bg-accent-green/20 transition-colors">
                    <Icon name={p.icon as any} size={20} className="text-accent-green" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{p.label}</p>
                    <p className="text-[10px] text-text-muted">
                      {p.type === 'web3' ? 'Web3' : p.type === 'cex' ? 'Биржа' : 'Брокер'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* === ШАГ 3: Детали подключения === */}
      {step === 'details' && form.provider && (
        <Card padding="lg" className="space-y-5">
          <button
            onClick={() => {
              setStep('provider');
              setValidationErrors({});
            }}
            className="text-text-muted hover:text-text-primary text-sm inline-flex items-center gap-1.5 transition-colors"
          >
            <Icon name="back" size={14} /> Назад к провайдерам
          </button>

          <div className="flex items-center gap-3 pb-3 border-b border-surface-border">
            <div className="w-10 h-10 rounded-lg bg-accent-green/10 flex items-center justify-center">
              <Icon name={form.provider.icon as any} size={22} className="text-accent-green" />
            </div>
            <div>
              <h3 className="text-base font-semibold">{form.provider.label}</h3>
              <a
                href={form.provider.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent-green hover:underline"
              >
                Перейти на сайт
              </a>
            </div>
          </div>

          {form.provider.type === 'web3' && (
            <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
              <p className="text-yellow-400 text-sm">
                Подключение Web3 кошелька осуществляется напрямую через браузерное расширение.
                Нажмите «Добавить», чтобы продолжить.
              </p>
            </div>
          )}

          {form.provider.type !== 'web3' && (
            <>
              <div className="p-4 rounded-xl bg-accent-green/5 border border-accent-green/20">
                <p className="text-accent-green font-semibold text-sm inline-flex items-center gap-1.5 mb-2">
                  <Icon name="wallet" size={14} /> Только чтение (Read-only)
                </p>
                <p className="text-text-secondary text-xs leading-relaxed">
                  Создайте API ключ с правами только на чтение истории сделок. Ваши средства в
                  безопасности.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-text-muted font-medium">API Key</label>
                <input
                  type="password"
                  placeholder="Введите API Key"
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  className={cn(
                    'w-full px-4 py-3 bg-surface-elevated border rounded-xl text-sm text-white font-mono focus:outline-none focus:ring-2 transition-all',
                    validationErrors.apiKey
                      ? 'border-accent-red focus:ring-accent-red/30'
                      : 'border-surface-border focus:ring-accent-green/30'
                  )}
                />
                {validationErrors.apiKey && (
                  <p className="text-xs text-accent-red mt-1">{validationErrors.apiKey}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs text-text-muted font-medium">API Secret</label>
                <input
                  type="password"
                  placeholder="Введите API Secret"
                  value={form.apiSecret}
                  onChange={(e) => setForm({ ...form, apiSecret: e.target.value })}
                  className={cn(
                    'w-full px-4 py-3 bg-surface-elevated border rounded-xl text-sm text-white font-mono focus:outline-none focus:ring-2 transition-all',
                    validationErrors.apiSecret
                      ? 'border-accent-red focus:ring-accent-red/30'
                      : 'border-surface-border focus:ring-accent-green/30'
                  )}
                />
                {validationErrors.apiSecret && (
                  <p className="text-xs text-accent-red mt-1">{validationErrors.apiSecret}</p>
                )}
              </div>

              {form.provider.needsPassphrase && (
                <div className="space-y-1">
                  <label className="text-xs text-text-muted font-medium">API Passphrase</label>
                  <input
                    type="password"
                    placeholder="Введите Passphrase"
                    value={form.apiPassphrase}
                    onChange={(e) => setForm({ ...form, apiPassphrase: e.target.value })}
                    className="w-full px-4 py-3 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-accent-green/30"
                  />
                </div>
              )}

              {/* Компонент валидации */}
              <WalletValidator
                provider={form.provider.id}
                apiKey={form.apiKey}
                apiSecret={form.apiSecret}
                onValidation={handleValidation}
              />
            </>
          )}

          <div className="p-4 rounded-xl bg-surface-elevated border border-surface-border space-y-3">
            <p className="text-sm font-semibold">Настройки импорта</p>
            <div className="space-y-1">
              <label className="text-xs text-text-muted font-medium">Импортировать сделки с</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-green/30"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoSync"
                checked={form.autoSync}
                onChange={(e) => setForm({ ...form, autoSync: e.target.checked })}
                className="w-4 h-4 rounded bg-surface-overlay border-surface-border text-accent-green focus:ring-accent-green"
              />
              <label htmlFor="autoSync" className="text-sm text-text-primary">
                Автосинхронизация
              </label>
            </div>
            {form.autoSync && (
              <div className="space-y-1">
                <label className="text-xs text-text-muted font-medium">Интервал</label>
                <select
                  value={form.syncInterval}
                  onChange={(e) => setForm({ ...form, syncInterval: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-green/30"
                >
                  <option value={15}>Каждые 15 минут</option>
                  <option value={30}>Каждые 30 минут</option>
                  <option value={60}>Каждый час</option>
                  <option value={180}>Каждые 3 часа</option>
                  <option value={360}>Каждые 6 часов</option>
                  <option value={720}>Каждые 12 часов</option>
                  <option value={1440}>Ежедневно</option>
                </select>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-text-muted font-medium">Название</label>
            <input
              type="text"
              placeholder="Например, Основной счёт"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="w-full px-4 py-3 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-green/30 transition-all"
            />
          </div>

          <button
            onClick={handleAdd}
            disabled={adding || syncingWalletId !== null}
            className="w-full py-3.5 bg-accent-green text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent-green-dim transition-all active:scale-[0.98]"
          >
            {adding ? 'Добавление...' : 'Добавить кошелёк'}
          </button>
        </Card>
      )}
    </div>
  );
}
