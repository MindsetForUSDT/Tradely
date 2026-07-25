import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { shortenAddress, cn } from '@/lib/utils';
import { Icon, type IconProps } from '@/components/ui/Icons';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { WalletValidator } from '@/components/wallets/WalletValidator';

// ===================== ТИПЫ =====================

type Category = 'crypto' | 'stocks' | 'forex';

interface Provider {
  id: string;
  label: string;
  icon: IconProps['name'];
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
  error_message?: string;
  last_synced_at?: string;
  cex_provider?: string;
  web3_provider?: string;
  added_at: string;
  _count?: { trades: number };
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
    icon: 'walletconnect',
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
    icon: 'kraken',
    url: 'https://www.kraken.com',
    category: 'crypto',
    type: 'cex',
  },
  {
    id: 'gateio',
    label: 'Gate.io',
    icon: 'gateio',
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

const CATEGORIES: Array<{
  id: Category;
  label: string;
  desc: string;
  icon: IconProps['name'];
}> = [{ id: 'crypto', label: 'Крипто', desc: 'Биржи и Web3 кошельки', icon: 'binance' }];

const getBybitHistoryMinDate = () => {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - 2);
  return date.toISOString().split('T')[0];
};

const getTodayDate = () => new Date().toISOString().split('T')[0];

const formatSyncTime = (value?: string) => {
  if (!value) return 'Ещё не запускалась';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const getStatusMeta = (wallet: Wallet) => {
  switch (wallet.processing_status) {
    case 'completed':
      return {
        label: 'Синхронизировано',
        description: 'Данные актуальны',
        className: 'ready',
      };
    case 'processing':
      return {
        label: 'Синхронизация',
        description: 'Загружаем историю сделок',
        className: 'processing',
      };
    case 'failed':
      return {
        label: 'Ошибка импорта',
        description: wallet.error_message || 'Повторите синхронизацию',
        className: 'failed',
      };
    default:
      return {
        label: 'Готов к запуску',
        description: 'Ожидает первой синхронизации',
        className: 'pending',
      };
  }
};

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

  const loadWallets = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await api.get<Wallet[]>('/wallets');
      setWallets(data);
    } catch {
      setWallets([]);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWallets();
  }, [loadWallets]);

  useEffect(() => {
    if (!wallets.some((wallet) => ['pending', 'processing'].includes(wallet.processing_status))) {
      return;
    }
    const timer = window.setInterval(() => void loadWallets(true), 2500);
    return () => window.clearInterval(timer);
  }, [loadWallets, wallets]);

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
          autoSync: true,
          syncInterval: form.syncInterval,
          ...(validationStatus?.balance && { initialBalance: validationStatus.balance }),
        }),
      };

      const createdWallet = await api.post<Wallet>('/wallets', walletData);
      toast.success('Источник подключён. Запускаем первый импорт.');

      setForm(INITIAL_FORM);
      setStep('category');
      setValidationErrors({});
      setValidationStatus(null);
      await loadWallets(true);
      void handleManualSync(createdWallet.id);
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
      toast.success('Синхронизация запущена');

      for (let attempt = 0; attempt < 80; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const data = await api.get<Wallet[]>('/wallets');
        setWallets(data);
        const current = data.find((wallet) => wallet.id === walletId);
        if (current?.processing_status === 'completed') {
          await queryClient.invalidateQueries({ queryKey: ['trades'] });
          toast.success('Финальные сделки обновлены');
          return;
        }
        if (current?.processing_status === 'failed') {
          throw new Error(current.error_message || 'Импорт завершился с ошибкой');
        }
      }
      throw new Error('Синхронизация выполняется дольше ожидаемого. Проверьте статус позже.');
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
      await loadWallets(true);
      toast.success('Кошелёк удалён');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ошибка удаления';
      toast.error(msg);
    }
  };

  const getWalletIcon = (w: Wallet): IconProps['name'] => {
    const lbl = (w.label || '').toLowerCase();
    if (lbl.includes('meta')) return 'metamask';
    if (lbl.includes('walletconnect')) return 'walletconnect';
    if (lbl.includes('trust')) return 'trustwallet';
    if (lbl.includes('coinbase')) return 'coinbase';
    if (lbl.includes('binance')) return 'binance';
    if (lbl.includes('bybit')) return 'bybit';
    if (lbl.includes('okx')) return 'okx';
    if (lbl.includes('kucoin')) return 'kucoin';
    if (lbl.includes('kraken')) return 'kraken';
    if (lbl.includes('gate.io') || lbl.includes('gateio')) return 'gateio';
    return 'wallet';
  };

  const getCategoryLabel = (chain: string): string => {
    const map: Record<string, string> = { crypto: 'Крипто', stocks: 'Фондовый', forex: 'Forex' };
    return map[chain] || chain;
  };

  // ===================== RENDER =====================

  return (
    <div className="sources-v3-page max-w-none mx-auto px-4 py-6 space-y-6">
      <header className="sources-v3-heading">
        <div>
          <h1>Источники</h1>
          <p>
            Подключите биржу или кошелёк один раз — новые сделки будут импортироваться
            автоматически.
          </p>
        </div>
        <span>Автоимпорт всегда включён</span>
      </header>
      {isLoading && (
        <div className="p-4 rounded-xl bg-accent-green/5 border border-accent-green/20">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
            <p className="text-accent-green font-semibold text-sm">Загрузка кошельков...</p>
          </div>
        </div>
      )}

      {/* === ШАГ 1: Обзор и выбор категории === */}
      {step === 'category' && (
        <>
          <section className="sources-health" aria-label="Состояние автоимпорта">
            <div className="sources-health-summary">
              <div
                className={cn(
                  'sources-health-ring',
                  wallets.some((wallet) => wallet.processing_status === 'failed') && 'failed'
                )}
              >
                {wallets.length
                  ? wallets.some((wallet) => wallet.processing_status === 'failed')
                    ? '!'
                    : wallets.some((wallet) => wallet.processing_status === 'processing')
                      ? '···'
                      : '100%'
                  : '0%'}
              </div>
              <span>
                <small>Состояние автоимпорта</small>
                <strong>
                  {wallets.length === 0
                    ? 'Подключите первый источник'
                    : wallets.some((wallet) => wallet.processing_status === 'failed')
                      ? 'Требуется внимание'
                      : wallets.some((wallet) => wallet.processing_status === 'processing')
                        ? 'Идёт синхронизация'
                        : 'Все источники в порядке'}
                </strong>
                <em>
                  {wallets.length
                    ? 'Tradeum автоматически поддерживает данные актуальными'
                    : 'После подключения импорт запустится автоматически'}
                </em>
              </span>
            </div>
            <div className="sources-health-metrics">
              <article>
                <small>Подключено источников</small>
                <strong>{wallets.length}</strong>
              </article>
              <article>
                <small>Сделок импортировано</small>
                <strong>
                  {wallets.reduce((total, wallet) => total + (wallet._count?.trades || 0), 0)}
                </strong>
              </article>
              <article>
                <small>Последняя синхронизация</small>
                <strong>
                  {formatSyncTime(
                    wallets
                      .map((wallet) => wallet.last_synced_at)
                      .filter(Boolean)
                      .sort()
                      .at(-1)
                  )}
                </strong>
              </article>
            </div>
          </section>

          <section className="sources-market">
            <h2>Выберите рынок</h2>
            {CATEGORIES.map((cat) => (
              <button key={cat.id} onClick={() => handleSelectCategory(cat.id)}>
                <span>
                  <Icon name={cat.icon} size={21} />
                </span>
                <div>
                  <strong>{cat.label}</strong>
                  <small>{cat.desc}</small>
                </div>
                <Icon name="forward" size={16} />
              </button>
            ))}
          </section>

          {wallets.length === 0 && !isLoading && (
            <section className="sources-empty">
              <Icon name="wallet" size={27} />
              <strong>Подключённых источников пока нет</strong>
              <span>Выберите рынок выше — API-ключи используются только для чтения.</span>
            </section>
          )}

          {wallets.length > 0 && (
            <section className="sources-connections">
              <header>
                <div>
                  <h2>Подключённые источники</h2>
                  <p>Статус, объём данных и управление синхронизацией.</p>
                </div>
              </header>
              {wallets.map((w) => {
                const status = getStatusMeta(w);
                const tradeCount = w._count?.trades || 0;
                const isSyncing = w.processing_status === 'processing' || syncingWalletId === w.id;
                return (
                  <article key={w.id} className={`source-connection ${status.className}`}>
                    <div className="source-identity">
                      <span>
                        <Icon name={getWalletIcon(w)} size={23} />
                      </span>
                      <div>
                        <strong>{w.label || shortenAddress(w.address, 8)}</strong>
                        <small>{shortenAddress(w.address, 13)}</small>
                        <em>{getCategoryLabel(w.chain)}</em>
                      </div>
                    </div>
                    <div className="source-stat">
                      <small>Статус</small>
                      <strong>
                        <i /> {status.label}
                      </strong>
                      <span title={w.error_message}>{status.description}</span>
                    </div>
                    <div className="source-stat">
                      <small>Сделки</small>
                      <strong>{tradeCount}</strong>
                      <span>импортировано</span>
                    </div>
                    <div className="source-stat">
                      <small>Последняя синхронизация</small>
                      <strong>{formatSyncTime(w.last_synced_at)}</strong>
                      <span>{w.last_synced_at ? 'Автоимпорт включён' : 'Первый запуск'}</span>
                    </div>
                    <div className="source-actions">
                      <button
                        onClick={() => handleManualSync(w.id)}
                        disabled={isSyncing}
                        className="source-sync-button"
                      >
                        <Icon name="refresh" size={15} />
                        {isSyncing ? 'Синхронизация…' : 'Синхронизировать'}
                      </button>
                      <button
                        onClick={() => handleDelete(w.id)}
                        className="source-delete-button"
                        title="Удалить"
                        aria-label={`Удалить ${w.label || 'источник'}`}
                      >
                        <Icon name="delete" size={15} />
                      </button>
                    </div>
                    <div className="source-progress">
                      <header>
                        <strong>Прогресс синхронизации</strong>
                        <span>
                          {w.processing_status === 'failed'
                            ? 'Импорт остановлен — исправьте ошибку и повторите'
                            : isSyncing
                              ? 'Загружаем историю и формируем финальные сделки'
                              : w.last_synced_at
                                ? 'Последний цикл автоимпорта завершён'
                                : 'Готово к первому импорту'}
                        </span>
                      </header>
                      <div className="source-progress-track">
                        <span className="done">
                          <i>1</i>
                          <strong>Источник подключён</strong>
                          <small>{formatSyncTime(w.added_at)}</small>
                        </span>
                        <span
                          className={cn(
                            w.processing_status === 'failed'
                              ? 'failed'
                              : isSyncing
                                ? 'active'
                                : w.last_synced_at && 'done'
                          )}
                        >
                          <i>2</i>
                          <strong>Загрузка истории</strong>
                          <small>
                            {isSyncing ? 'Выполняется' : `${tradeCount} записей найдено`}
                          </small>
                        </span>
                        <span
                          className={cn(
                            w.processing_status === 'completed' && 'done',
                            w.processing_status === 'failed' && 'failed'
                          )}
                        >
                          <i>3</i>
                          <strong>Сделки импортированы</strong>
                          <small>
                            {w.last_synced_at ? formatSyncTime(w.last_synced_at) : 'Ожидает'}
                          </small>
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </>
      )}

      {/* === ШАГ 2: Выбор провайдера === */}
      {step === 'provider' && form.category && (
        <Card padding="lg" className="sources-v3-card space-y-4">
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
                    <Icon name={p.icon} size={20} className="text-accent-green" />
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
        <Card padding="lg" className="sources-v3-card space-y-5">
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
              <Icon name={form.provider.icon} size={22} className="text-accent-green" />
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
                min={form.provider.id === 'bybit' ? getBybitHistoryMinDate() : undefined}
                max={getTodayDate()}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-green/30"
              />
            </div>
            <div className="sources-v3-always-on">
              <span>Автоматическая синхронизация</span>
              <strong>Всегда включена</strong>
            </div>
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
