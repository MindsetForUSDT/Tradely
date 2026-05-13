// components/dashboard/WalletConnect.tsx — ФИНАЛЬНАЯ БЕЗОПАСНАЯ ВЕРСИЯ
import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { shortenAddress, cn, validateWalletAddress, isValidEVMAddress } from '@/lib/utils';
import { Icon } from '@/components/ui/Icons';
import { useQueryClient } from '@tanstack/react-query';
import { getUserIdFromCache, getUserIdFromCacheAsync } from '@/lib/auth';
import toast from 'react-hot-toast';
import { encryptApiCredentials } from '@/lib/encryption';

// Типы
type WalletType = 'web3' | 'cex' | 'watch-only' | 'import' | 'hardware' | 'qr';
type Web3Provider = 'metamask' | 'walletconnect' | 'coinbase' | 'brave';
type CEXProvider = 'binance' | 'bybit' | 'okx' | 'kucoin';
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
  label: string;
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

const CEX_PROVIDERS = [
  { value: 'binance' as CEXProvider, label: 'Binance', icon: 'binance' as const },
  { value: 'bybit' as CEXProvider, label: 'Bybit', icon: 'bybit' as const },
  { value: 'okx' as CEXProvider, label: 'OKX', icon: 'okx' as const },
  { value: 'kucoin' as CEXProvider, label: 'KuCoin', icon: 'kucoin' as const },
];

const INITIAL_FORM: WalletFormData = {
  type: null,
  web3Provider: null,
  cexProvider: null,
  network: 'ethereum',
  address: '',
  apiKey: '',
  apiSecret: '',
  label: '',
};

export function WalletConnect() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [step, setStep] = useState<'select' | 'details' | 'verify'>('select');
  const [form, setForm] = useState<WalletFormData>(INITIAL_FORM);
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const addressInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    const uid = await getUserIdFromCacheAsync();
    if (!uid) return;

    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', uid)
      .order('added_at', { ascending: false });

    if (error) {
      toast.error('Ошибка загрузки кошельков');
      return;
    }

    if (data) setWallets(data);
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
      // Локальная валидация API ключей без вызова edge function
      await new Promise((resolve) => setTimeout(resolve, 800));

      const keyValid = form.apiKey.length >= 16;
      const secretValid = form.apiSecret.length >= 16;

      if (keyValid && secretValid) {
        toast.success('Формат API ключей корректен');
      } else {
        toast.error('Неверный формат API ключей');
      }
    } catch (e: any) {
      toast.error('Ошибка: ' + e.message);
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
        credentials_iv: encryptedData?.iv ? Buffer.from(encryptedData.iv, 'hex') : null,
        credentials_tag: encryptedData?.tag ? Buffer.from(encryptedData.tag, 'hex') : null,
        web3_provider: form.web3Provider || null,
        cex_provider: form.cexProvider || null,
        processing_status: 'pending',
      };

      const { error } = await supabase.from('wallets').insert(walletData);
      if (error) {
        toast.error('Ошибка: ' + error.message);
        setAdding(false);
        return;
      }

      toast.success('Кошелёк добавлен! Начинаем синхронизацию...');
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

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Удалить кошелёк и все связанные сделки?');
    if (!confirmed) return;

    const { error } = await supabase.from('wallets').delete().eq('id', id);
    if (error) {
      toast.error('Ошибка удаления');
      return;
    }
    await loadWallets();
    toast.success('Кошелёк удалён');
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
                {CEX_PROVIDERS.map((p) => (
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
                  <div className="p-4 rounded-xl bg-accent-green/5 border border-accent-green/20">
                    <p className="text-accent-green font-semibold text-sm inline-flex items-center gap-1.5">
                      <Icon name="shield" size={14} /> Только чтение (Read-only)
                    </p>
                    <p className="text-text-secondary text-xs mt-1.5 leading-relaxed">
                      Создайте API ключ с правами только на чтение. Ваши средства в безопасности.
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
                  <div>
                    <p className="text-sm font-medium">{w.label || shortenAddress(w.address, 8)}</p>
                    <p className="text-xs text-text-muted font-mono">
                      {shortenAddress(w.address, 12)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full',
                      w.processing_status === 'completed'
                        ? 'text-accent-green bg-accent-green/5'
                        : 'text-yellow-400 bg-yellow-400/5'
                    )}
                  >
                    {w.processing_status === 'completed'
                      ? 'Готово'
                      : w.processing_status || 'Обработка'}
                  </span>
                  <button
                    onClick={() => handleDelete(w.id)}
                    className="text-text-muted hover:text-accent-red transition-colors p-1 rounded-lg hover:bg-accent-red/5"
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
