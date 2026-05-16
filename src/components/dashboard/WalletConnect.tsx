// components/dashboard/WalletConnect.tsx — Улучшенная версия с интеграцией ExchangeAdapter
import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { shortenAddress, cn, validateWalletAddress, isValidEVMAddress } from '@/lib/utils';
import { Icon } from '@/components/ui/Icons';
import { useQueryClient } from '@tanstack/react-query';
import { getUserIdFromCache, getUserIdFromCacheAsync } from '@/lib/auth';
import toast from 'react-hot-toast';
import { encryptApiCredentials } from '@/lib/encryption';
import { retry } from '@/lib/retry';

// Типы
type WalletType = 'web3' | 'cex' | 'watch-only' | 'import' | 'hardware' | 'qr';
type Web3Provider = 'metamask' | 'walletconnect' | 'coinbase' | 'brave';
type CEXProvider = 'binance' | 'bybit' | 'okx' | 'kucoin' | 'kraken' | 'gateio';
type Network =
  | 'ethereum'
  | 'solana'
  | 'polygon'
  | 'bsc'
  | 'arbitrum'
  | 'optimism'
  | 'avalanche'
  | 'base';

interface WalletFormData {
  type: WalletType | null;
  web3Provider: Web3Provider | null;
  cexProvider: CEXProvider | null;
  network: Network;
  address: string;
  apiKey: string;
  apiSecret: string;
  apiPassphrase: string; // Для OKX, Coinbase
  label: string;
  startDate: string; // Дата начала импорта
  autoSync: boolean; // Автосинхронизация
  syncInterval: number; // Интервал синхронизации (минуты)
}

const NETWORKS = [
  { value: 'ethereum' as Network, label: 'Ethereum' },
  { value: 'solana' as Network, label: 'Solana' },
  { value: 'polygon' as Network, label: 'Polygon' },
  { value: 'bsc' as Network, label: 'BSC' },
  { value: 'arbitrum' as Network, label: 'Arbitrum' },
  { value: 'optimism' as Network, label: 'Optimism' },
  { value: 'avalanche' as Network, label: 'Avalanche' },
  { value: 'base' as Network, label: 'Base' },
];

const WEB3_PROVIDERS = [
  { value: 'metamask' as Web3Provider, label: 'MetaMask', icon: 'metamask' as const },
  { value: 'walletconnect' as Web3Provider, label: 'WalletConnect', icon: 'trustwallet' as const },
  { value: 'coinbase' as Web3Provider, label: 'Coinbase Wallet', icon: 'coinbase' as const },
  { value: 'brave' as Web3Provider, label: 'Brave Wallet', icon: 'brave' as const },
];

const CEX_PROVIDERS: Array<{ value: CEXProvider; label: string; icon: string; guideUrl?: string }> =
  [
    {
      value: 'binance',
      label: 'Binance',
      icon: 'binance',
      guideUrl: 'https://www.binance.com/en/my/settings/api-management',
    },
    { value: 'bybit', label: 'Bybit', icon: 'bybit', guideUrl: 'https://www.bybit.com/en-US/api/' },
    { value: 'okx', label: 'OKX', icon: 'okx', guideUrl: 'https://www.okx.com/account/my-api' },
    {
      value: 'kucoin',
      label: 'KuCoin',
      icon: 'kucoin',
      guideUrl: 'https://www.kucoin.com/account/api',
    },
    {
      value: 'kraken',
      label: 'Kraken',
      icon: 'alert',
      guideUrl: 'https://www.kraken.com/myaccount/api',
    },
    {
      value: 'gateio',
      label: 'Gate.io',
      icon: 'alert',
      guideUrl: 'https://www.gate.io/account/api',
    },
  ];

// Приведение типа для иконок
type CEXProviderIcon = 'binance' | 'bybit' | 'okx' | 'kucoin' | 'alert';

const CEX_PROVIDERS_TYPED = CEX_PROVIDERS.map((p) => ({
  ...p,
  icon: p.icon as CEXProviderIcon,
}));

const INITIAL_FORM: WalletFormData = {
  type: null,
  web3Provider: null,
  cexProvider: null,
  network: 'ethereum',
  address: '',
  apiKey: '',
  apiSecret: '',
  apiPassphrase: '',
  label: '',
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 дней назад
  autoSync: true,
  syncInterval: 60, // 1 час по умолчанию
};

export function WalletConnect() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [step, setStep] = useState<'select' | 'details' | 'verify'>('select');
  const [form, setForm] = useState<WalletFormData>(INITIAL_FORM);
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [databaseAwaking, setDatabaseAwaking] = useState(false);
  const queryClient = useQueryClient();
  const addressInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    const uid = await getUserIdFromCacheAsync();
    if (!uid) return;

    try {
      const data = await retry(
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);

          const result = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', uid)
            .order('added_at', { ascending: false })
            .limit(50)
            .abortSignal(controller.signal);

          clearTimeout(timeoutId);
          return result;
        },
        { maxRetries: 1, initialDelay: 5000, maxDelay: 10000 }
      );

      if (data.error) {
        console.error('[loadWallets] Error:', data.error);

        if (
          data.error.message?.includes('503') ||
          data.error.message?.includes('Connection reset') ||
          data.error.message?.includes('HTTP2_PING')
        ) {
          setDatabaseAwaking(true);
          toast.error('База данных "просыпается". Подождите 30-60 секунд и обновите страницу.');

          // Автоматически пробуем снова через 45 секунд
          setTimeout(() => {
            setDatabaseAwaking(false);
            loadWallets();
          }, 45000);
        } else {
          toast.error('Ошибка загрузки кошельков');
        }
        return;
      }

      setDatabaseAwaking(false);
      if (data.data) setWallets(data.data);
    } catch (e: any) {
      console.error('[loadWallets] Error after retries:', e);

      if (e.message?.includes('timeout')) {
        setDatabaseAwaking(true);
        toast.error('База данных "просыпается". Подождите 30-60 секунд и обновите страницу.');
      } else {
        toast.error('Ошибка загрузки кошельков: ' + (e.message || 'Неизвестная ошибка'));
      }
    }
  };

  // Валидация формы с проверкой адреса
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (form.type === 'web3' && !form.web3Provider) {
      errors.web3Provider = 'Выберите провайдера';
    }

    if (form.type === 'cex') {
      if (!form.cexProvider) errors.cexProvider = 'Выберите биржу';
      if (!form.apiKey.trim()) errors.apiKey = 'Введите API ключ';
      if (!form.apiSecret.trim()) errors.apiSecret = 'Введите API секрет';

      if (form.apiKey && !/^[a-zA-Z0-9]{16,}$/.test(form.apiKey)) {
        errors.apiKey = 'Неверный формат API ключа (минимум 16 символов)';
      }
      if (form.apiSecret && !/^[a-zA-Z0-9]{16,}$/.test(form.apiSecret)) {
        errors.apiSecret = 'Неверный формат API Secret (минимум 16 символов)';
      }
    }

    if ((form.type === 'watch-only' || form.type === 'qr') && form.address) {
      const validation = validateWalletAddress(form.address, form.network);
      if (!validation.valid) {
        errors.address = validation.error || 'Неверный адрес кошелька';
      } else {
        // Дополнительно проверяем формат адреса
        if (
          form.network === 'ethereum' ||
          form.network === 'polygon' ||
          form.network === 'bsc' ||
          form.network === 'arbitrum' ||
          form.network === 'optimism' ||
          form.network === 'avalanche' ||
          form.network === 'base'
        ) {
          if (!/^0x[a-fA-F0-9]{40}$/.test(form.address)) {
            errors.address =
              'Неверный EVM адрес (должен начинаться с 0x и содержать 40 шестнадцатеричных символов)';
          }
        } else if (form.network === 'solana') {
          if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(form.address)) {
            errors.address = 'Неверный адрес Solana (32-44 символа)';
          }
        }
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form]);

  const handleSelectType = (type: WalletType) => {
    setForm({ ...INITIAL_FORM, type });
    setStep('details');
    setValidationErrors({});
  };

  const handleVerify = async () => {
    if (!validateForm()) return;

    setVerifying(true);
    try {
      // Вызываем Edge Function для тестирования подключения
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      console.log(
        '[WalletConnect] Calling Edge Function:',
        `${supabaseUrl}/functions/v1/test-exchange-connection`
      );
      console.log('[WalletConnect] Payload:', {
        exchange: form.cexProvider,
        api_key: form.apiKey.slice(0, 4) + '...' + form.apiKey.slice(-4),
        api_secret: form.apiSecret.slice(0, 4) + '...' + form.apiSecret.slice(-4),
      });

      const response = await fetch(`${supabaseUrl}/functions/v1/test-exchange-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          exchange: form.cexProvider,
          api_key: form.apiKey,
          api_secret: form.apiSecret,
        }),
      });

      console.log('[WalletConnect] Response status:', response.status);
      console.log(
        '[WalletConnect] Response headers:',
        Object.fromEntries(response.headers.entries())
      );

      // Проверяем статус ответа
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[WalletConnect] Response error:', response.status, errorText);

        // Если функция не развернута
        if (response.status === 404) {
          throw new Error(
            'Edge Function "test-exchange-connection" не развёрнута. Пожалуйста, разверните её через Supabase Dashboard (https://app.supabase.com/functions).'
          );
        }

        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || result.message || `Ошибка сервера: ${response.status}`);
      }

      const result = await response.json();
      console.log('[WalletConnect] Success:', result);

      toast.success(
        `${result.message || 'Подключение успешно!'} Найдено активов: ${Object.keys(result.balances || {}).length}`
      );
    } catch (e: any) {
      console.error('[WalletConnect] Verify error:', e);

      // Более подробное сообщение об ошибке
      let errorMsg = e.message;

      if (e.message.includes('Failed to fetch')) {
        errorMsg = `Не удалось подключиться к Edge Function. Проверьте:
1) Функция развернута: https://app.supabase.com/project/TradeumD/functions
2) URL Supabase в .env: ${import.meta.env.VITE_SUPABASE_URL}
3) CORS заголовки в функции`;
      } else if (e.message.includes('NetworkError')) {
        errorMsg = 'Сетевая ошибка. Проверьте подключение к интернету.';
      } else if (e.message.includes('404')) {
        errorMsg = 'Edge Function не найдена. Разверните её через Supabase Dashboard.';
      }

      toast.error('Ошибка подключения: ' + errorMsg);
    }
    setVerifying(false);
  };

  const handleAdd = async () => {
    if (!validateForm()) return;

    const uid = await getUserIdFromCacheAsync();
    if (!uid) {
      toast.error('Не авторизован. Пожалуйста, войдите в систему.');
      return;
    }

    setAdding(true);
    try {
      let encryptedData = null;
      if (form.type === 'cex' && form.apiKey && form.apiSecret) {
        encryptedData = await encryptApiCredentials(form.apiKey, form.apiSecret);
      }

      const walletData = {
        user_id: uid,
        address:
          form.type === 'web3'
            ? `${form.web3Provider}:connected`
            : form.type === 'cex'
              ? `${form.cexProvider}:${form.apiKey.slice(0, 4)}...${form.apiKey.slice(-4)}`
              : form.address || 'manual',
        chain: form.network,
        label: form.label || form.web3Provider || form.cexProvider || form.type || 'Кошелёк',
        encrypted_credentials: encryptedData?.encrypted_data || null,
        credentials_iv: encryptedData?.iv ? atob(encryptedData.iv) : null,
        credentials_tag: encryptedData?.tag ? atob(encryptedData.tag) : null,
        web3_provider: form.web3Provider || null,
        cex_provider: form.cexProvider || null,
        processing_status: 'pending',
        settings: JSON.stringify({
          startDate: form.startDate,
          autoSync: form.autoSync,
          syncInterval: form.syncInterval,
          ...(form.apiPassphrase && { passphrase: form.apiPassphrase }),
        }),
      };

      const { error } = await supabase.from('wallets').insert(walletData);
      if (error) {
        toast.error('Ошибка: ' + error.message);
        setAdding(false);
        return;
      }

      toast.success('Кошелёк добавлен! Начинаем синхронизацию...');

      // Запускаем синхронизацию
      const { data: wallets } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', uid)
        .order('added_at', { ascending: false })
        .limit(1);

      if (wallets?.[0]?.id) {
        // Запускаем синхронизацию в фоне
        await supabase.functions.invoke('sync-wallet-trades', {
          body: {
            walletId: wallets[0].id,
            forceFullSync: true,
            startDate: form.startDate,
          },
        });
      }

      setForm(INITIAL_FORM);
      setStep('select');
      setValidationErrors({});
      await loadWallets();
      queryClient.invalidateQueries({ queryKey: ['trades'] });
    } catch (error: any) {
      console.error('[WalletConnect] Add wallet error:', error);
      const errorMsg = error?.message || 'Сетевая ошибка при добавлении кошелька';
      toast.error(errorMsg);
    }
    setAdding(false);
  };

  const handleManualSync = async (walletId: string) => {
    toast.success('Запуск синхронизации...');

    // Пробуем вызвать Edge Function
    try {
      await supabase.functions.invoke('sync-wallet-trades', {
        body: {
          walletId,
          forceFullSync: true,
        },
      });
      toast.success('Синхронизация запущена!');
    } catch (error: any) {
      console.error('[handleManualSync] Error:', error);
      toast.error('Edge Function недоступна. Синхронизация будет выполнена позже.');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      'Удалить кошелёк и все связанные сделки? Это действие нельзя отменить.'
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('wallets').delete().eq('id', id);
      if (error) {
        console.error('[handleDelete] Error:', error);
        toast.error('Ошибка удаления: ' + error.message);
        return;
      }
      await loadWallets();
      toast.success('Кошелёк удалён');
    } catch (error: any) {
      console.error('[handleDelete] Exception:', error);
      toast.error('Ошибка удаления: ' + (error.message || 'Неизвестная ошибка'));
    }
  };

  const getWalletIcon = (
    w: any
  ): 'metamask' | 'trustwallet' | 'binance' | 'coinbase' | 'wallet' => {
    const lbl = (w.label || '').toLowerCase();
    if (lbl.includes('meta')) return 'metamask';
    if (lbl.includes('trust')) return 'trustwallet';
    if (
      lbl.includes('binance') ||
      lbl.includes('bybit') ||
      lbl.includes('okx') ||
      lbl.includes('kucoin')
    )
      return 'binance';
    if (lbl.includes('coinbase')) return 'coinbase';
    return 'wallet';
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {databaseAwaking && (
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            <div>
              <p className="text-yellow-500 font-semibold text-sm">База данных "просыпается"</p>
              <p className="text-yellow-500/70 text-xs">
                Подождите 30-60 секунд и обновите страницу
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Кошельки и биржи</h1>
          <p className="text-sm text-text-muted mt-1">
            {wallets.length
              ? `Подключено: ${wallets.length}`
              : 'Подключите источник для импорта сделок'}
          </p>
        </div>
        <button
          onClick={() => {
            setStep('select');
            setForm(INITIAL_FORM);
            setValidationErrors({});
          }}
          className="px-4 py-2 bg-accent-green text-white rounded-xl text-sm font-semibold hover:bg-accent-green-dim transition-all duration-200 active:scale-[0.98] inline-flex items-center gap-1.5"
        >
          <Icon name="wallet-add" size={16} /> Подключить
        </button>
      </div>

      {step === 'select' && (
        <Card padding="lg" className="space-y-4">
          <h3 className="text-base font-semibold">Выберите тип подключения</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                type: 'web3' as WalletType,
                label: 'Web3 Кошелёк',
                desc: 'MetaMask, WalletConnect',
                icon: 'metamask' as const,
              },
              {
                type: 'cex' as WalletType,
                label: 'Биржа (CEX)',
                desc: 'Binance, Bybit, OKX',
                icon: 'binance' as const,
              },
              {
                type: 'watch-only' as WalletType,
                label: 'Наблюдение',
                desc: 'Только адрес',
                icon: 'shield' as const,
              },
              {
                type: 'import' as WalletType,
                label: 'Импорт',
                desc: 'CSV, JSON, Excel',
                icon: 'import' as const,
              },
              {
                type: 'hardware' as WalletType,
                label: 'Аппаратный',
                desc: 'Ledger, Trezor',
                icon: 'risk' as const,
              },
              {
                type: 'qr' as WalletType,
                label: 'QR-код',
                desc: 'Сканировать адрес',
                icon: 'export-csv' as const,
              },
            ].map((item) => (
              <button
                key={item.type}
                onClick={() => handleSelectType(item.type)}
                className="p-4 rounded-xl border border-surface-border bg-surface-elevated hover:bg-surface-overlay hover:border-accent-green/30 transition-all duration-200 text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-accent-green/10 flex items-center justify-center mb-3 group-hover:bg-accent-green/20 transition-colors">
                  <Icon name={item.icon} size={22} className="text-accent-green" />
                </div>
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-xs text-text-muted mt-1">{item.desc}</p>
              </button>
            ))}
          </div>
        </Card>
      )}

      {(step === 'details' || step === 'verify') && (
        <Card padding="lg" className="space-y-5">
          <button
            onClick={() => {
              setStep('select');
              setValidationErrors({});
            }}
            className="text-text-muted hover:text-text-primary text-sm inline-flex items-center gap-1.5 transition-colors mb-1"
          >
            <Icon name="back" size={14} /> Назад
          </button>

          {form.type === 'web3' && (
            <div className="grid grid-cols-2 gap-3">
              {WEB3_PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => {
                    setForm({ ...form, web3Provider: p.value });
                    setValidationErrors({});
                  }}
                  className={cn(
                    'p-4 rounded-xl border transition-all text-left',
                    form.web3Provider === p.value
                      ? 'border-accent-green bg-accent-green/5'
                      : 'border-surface-border bg-surface-elevated hover:border-accent-green/30'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-accent-green/10 flex items-center justify-center shrink-0">
                      <Icon
                        name={p.icon}
                        size={20}
                        className={
                          form.web3Provider === p.value
                            ? 'text-accent-green'
                            : 'text-text-secondary'
                        }
                      />
                    </div>
                    <span className="text-sm font-medium">{p.label}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {form.type === 'cex' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {CEX_PROVIDERS_TYPED.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => {
                      setForm({ ...form, cexProvider: p.value });
                      setValidationErrors({});
                    }}
                    className={cn(
                      'p-4 rounded-xl border transition-all text-left',
                      form.cexProvider === p.value
                        ? 'border-accent-green bg-accent-green/5'
                        : 'border-surface-border bg-surface-elevated hover:border-accent-green/30'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-accent-green/10 flex items-center justify-center shrink-0">
                        <Icon
                          name={p.icon}
                          size={20}
                          className={
                            form.cexProvider === p.value
                              ? 'text-accent-green'
                              : 'text-text-secondary'
                          }
                        />
                      </div>
                      <span className="text-sm font-medium">{p.label}</span>
                    </div>
                  </button>
                ))}
              </div>
              {form.cexProvider && (
                <div className="space-y-4 pt-2">
                  {/* Инструкция по созданию API ключа */}
                  <div className="p-4 rounded-xl bg-accent-green/5 border border-accent-green/20">
                    <p className="text-accent-green font-semibold text-sm inline-flex items-center gap-1.5 mb-2">
                      <Icon name="wallet" size={14} /> Только чтение (Read-only)
                    </p>
                    <p className="text-text-secondary text-xs leading-relaxed mb-3">
                      Создайте API ключ с правами только на чтение. Ваши средства в безопасности.
                      Никогда не давайте права на торговлю или вывод средств!
                    </p>
                    {CEX_PROVIDERS_TYPED.find((p) => p.value === form.cexProvider)?.guideUrl && (
                      <a
                        href={
                          CEX_PROVIDERS_TYPED.find((p) => p.value === form.cexProvider)!.guideUrl!
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent-green hover:underline"
                      >
                        Инструкция для{' '}
                        {CEX_PROVIDERS_TYPED.find((p) => p.value === form.cexProvider)?.label}
                      </a>
                    )}
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

                  {/* Passphrase для OKX */}
                  {form.cexProvider === 'okx' && (
                    <div className="space-y-1">
                      <label className="text-xs text-text-muted font-medium">
                        API Passphrase <span className="text-accent-green">*</span>
                      </label>
                      <input
                        type="password"
                        placeholder="Введите Passphrase"
                        value={form.apiPassphrase}
                        onChange={(e) => setForm({ ...form, apiPassphrase: e.target.value })}
                        className={cn(
                          'w-full px-4 py-3 bg-surface-elevated border rounded-xl text-sm text-white font-mono focus:outline-none focus:ring-2 transition-all',
                          validationErrors.apiPassphrase
                            ? 'border-accent-red focus:ring-accent-red/30'
                            : 'border-surface-border focus:ring-accent-green/30'
                        )}
                      />
                      {validationErrors.apiPassphrase && (
                        <p className="text-xs text-accent-red mt-1">
                          {validationErrors.apiPassphrase}
                        </p>
                      )}
                      <p className="text-xs text-text-muted mt-1">
                        Требуется для OKX. Указывался при создании API ключа.
                      </p>
                    </div>
                  )}

                  {/* Настройки импорта */}
                  <div className="p-4 rounded-xl bg-surface-elevated border border-surface-border space-y-3">
                    <p className="text-sm font-semibold">Настройки импорта</p>

                    <div className="space-y-1">
                      <label className="text-xs text-text-muted font-medium">
                        Импортировать сделки с
                      </label>
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
                        <label className="text-xs text-text-muted font-medium">
                          Интервал синхронизации
                        </label>
                        <select
                          value={form.syncInterval}
                          onChange={(e) =>
                            setForm({ ...form, syncInterval: parseInt(e.target.value) })
                          }
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

                  <button
                    onClick={handleVerify}
                    disabled={verifying}
                    className="w-full py-3 border-2 border-accent-green/70 text-accent-green rounded-xl text-sm font-semibold hover:bg-accent-green/10 hover:border-accent-green transition-all disabled:opacity-50"
                  >
                    {verifying ? 'Проверка...' : 'Проверить подключение'}
                  </button>
                </div>
              )}
            </div>
          )}

          {(form.type === 'watch-only' || form.type === 'qr') && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-text-muted font-medium">Сеть</label>
                <select
                  value={form.network}
                  onChange={(e) => setForm({ ...form, network: e.target.value as Network })}
                  className="w-full px-4 py-3 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-green/30 transition-all"
                >
                  {NETWORKS.map((n) => (
                    <option key={n.value} value={n.value}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-text-muted font-medium">Адрес кошелька</label>
                <input
                  ref={addressInputRef}
                  type="text"
                  placeholder={form.network === 'solana' ? 'Solana адрес...' : '0x...'}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className={cn(
                    'w-full px-4 py-3 bg-surface-elevated border rounded-xl text-sm text-white font-mono focus:outline-none focus:ring-2 transition-all',
                    validationErrors.address
                      ? 'border-accent-red focus:ring-accent-red/30'
                      : 'border-surface-border focus:ring-accent-green/30'
                  )}
                />
                {validationErrors.address && (
                  <p className="text-xs text-accent-red mt-1">{validationErrors.address}</p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-text-muted font-medium">Название</label>
            <input
              type="text"
              placeholder="Например, Основной кошелёк"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="w-full px-4 py-3 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-green/30 transition-all"
            />
          </div>

          <button
            onClick={handleAdd}
            disabled={adding}
            className="w-full py-3.5 bg-accent-green text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-accent-green-dim transition-all active:scale-[0.98]"
          >
            {adding ? 'Добавление...' : 'Добавить кошелёк'}
          </button>
        </Card>
      )}

      {step === 'select' && wallets.length === 0 && (
        <Card padding="lg">
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-green/10 flex items-center justify-center mb-4">
              <Icon name="wallet" size={28} className="text-accent-green" />
            </div>
            <h3 className="text-lg font-semibold">Нет подключений</h3>
            <p className="text-sm text-text-muted mt-1">
              Нажмите «Подключить» чтобы добавить кошелёк или биржу
            </p>
          </div>
        </Card>
      )}

      {step === 'select' && wallets.length > 0 && (
        <div className="space-y-3">
          {wallets.map((w: any) => (
            <Card key={w.id} padding="md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-green/10 flex items-center justify-center">
                    <Icon name={getWalletIcon(w)} size={20} className="text-accent-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{w.label || shortenAddress(w.address, 8)}</p>
                    <p className="text-xs text-text-muted font-mono truncate">{w.address}</p>
                    {w.cex_provider && (
                      <p className="text-xs text-accent-green mt-0.5 font-semibold">
                        {w.cex_provider.toUpperCase()}
                      </p>
                    )}
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
                          ? 'Ожидает синхронизации'
                          : 'Обработка'}
                    </span>
                    {w.processing_status === 'pending' && (
                      <button
                        onClick={() => handleManualSync(w.id)}
                        className="text-xs text-accent-green hover:underline"
                      >
                        Запустить
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(w.id)}
                    className="text-text-muted hover:text-accent-red transition-colors p-1 rounded-lg hover:bg-accent-red/5"
                    title="Удалить кошелёк"
                  >
                    <Icon name="delete" size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
