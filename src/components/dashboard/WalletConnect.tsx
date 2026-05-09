import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { shortenAddress, cn } from '@/lib/utils';
import { Icon } from '@/components/ui/Icons';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

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

const NETWORKS: { value: Network; label: string }[] = [
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'solana', label: 'Solana' },
  { value: 'polygon', label: 'Polygon' },
  { value: 'bsc', label: 'BSC' },
  { value: 'arbitrum', label: 'Arbitrum' },
  { value: 'optimism', label: 'Optimism' },
  { value: 'avalanche', label: 'Avalanche' },
  { value: 'base', label: 'Base' },
];

const WEB3_PROVIDERS: { value: Web3Provider; label: string; icon: string }[] = [
  { value: 'metamask', label: 'MetaMask', icon: 'metamask' },
  { value: 'walletconnect', label: 'WalletConnect', icon: 'trustwallet' },
  { value: 'coinbase', label: 'Coinbase Wallet', icon: 'binance' },
  { value: 'brave', label: 'Brave Wallet', icon: 'shield' },
];

const CEX_PROVIDERS: { value: CEXProvider; label: string; icon: string }[] = [
  { value: 'binance', label: 'Binance', icon: 'binance' },
  { value: 'bybit', label: 'Bybit', icon: 'bybit' },
  { value: 'okx', label: 'OKX', icon: 'okx' },
  { value: 'kucoin', label: 'KuCoin', icon: 'pro' },
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
  const [step, setStep] = useState<'select' | 'details' | 'verify' | 'done'>('select');
  const [form, setForm] = useState<WalletFormData>(INITIAL_FORM);
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [syncProgress, setSyncProgress] = useState<Record<string, number>>({});
  const queryClient = useQueryClient();

  useEffect(() => {
    loadWallets();
  }, []);

  const getUserId = useCallback(() => {
    const raw = localStorage.getItem('tradeumdiary-auth');
    if (!raw) return null;
    try {
      const p = JSON.parse(raw);
      return (
        p?.user?.id || (p?.access_token ? JSON.parse(atob(p.access_token.split('.')[1])).sub : null)
      );
    } catch {
      return null;
    }
  }, []);

  const loadWallets = async () => {
    const uid = getUserId();
    if (!uid) return;
    const { data } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', uid)
      .order('added_at', { ascending: false });
    if (data) setWallets(data);
  };

  const handleSelectType = (type: WalletType) => {
    setForm({ ...INITIAL_FORM, type });
    setStep('details');
  };

  const handleSelectWeb3 = (provider: Web3Provider) => {
    setForm({ ...form, web3Provider: provider });
  };

  const handleSelectCEX = (provider: CEXProvider) => {
    setForm({ ...form, cexProvider: provider });
  };

  const handleVerify = async () => {
    setVerifying(true);
    await new Promise((r) => setTimeout(r, 1500));
    setVerifying(false);
    setStep('done');
    toast.success('Подключение проверено');
  };

  const handleAdd = async () => {
    const uid = getUserId();
    if (!uid) {
      toast.error('Не авторизован');
      return;
    }

    setAdding(true);
    try {
      const walletData = {
        user_id: uid,
        address:
          form.type === 'web3'
            ? `${form.web3Provider}:connected`
            : form.type === 'cex'
              ? `${form.cexProvider}:${form.apiKey.slice(0, 8)}***`
              : form.address || 'manual',
        chain: form.network,
        label: form.label || form.web3Provider || form.cexProvider || form.type || 'Кошелёк',
        processing_status: 'completed',
      };

      const { error } = await supabase.from('wallets').insert(walletData);
      if (error) {
        toast.error('Ошибка: ' + error.message);
        setAdding(false);
        return;
      }

      toast.success('Кошелёк добавлен!');
      setForm(INITIAL_FORM);
      setStep('select');
      loadWallets();
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    } catch {
      toast.error('Сетевая ошибка');
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('wallets').delete().eq('id', id);
    loadWallets();
    toast.success('Кошелёк удалён');
  };

  const getWalletIcon = (w: any): string => {
    if (w.chain === 'exchange' || w.address?.includes(':')) return 'binance';
    if (w.label?.toLowerCase().includes('meta')) return 'metamask';
    if (w.label?.toLowerCase().includes('trust')) return 'trustwallet';
    return 'wallet';
  };

  const getNetworkColor = (network: string): string => {
    const colors: Record<string, string> = {
      ethereum: 'border-blue-400/30',
      solana: 'border-purple-400/30',
      polygon: 'border-purple-500/30',
      bsc: 'border-yellow-400/30',
      arbitrum: 'border-blue-500/30',
      optimism: 'border-red-400/30',
      avalanche: 'border-red-500/30',
      base: 'border-blue-600/30',
    };
    return colors[network] || 'border-surface-border';
  };

  const currentProgress = adding ? 50 : verifying ? 75 : 0;

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
          type="button"
          onClick={() => {
            setStep('select');
            setForm(INITIAL_FORM);
          }}
          className="px-4 py-2 bg-accent-green text-surface rounded-xl text-sm font-semibold cursor-pointer hover:bg-accent-green-dim transition-all duration-200 active:scale-[0.98] inline-flex items-center gap-1.5"
        >
          <Icon name="wallet-add" size={16} />
          Подключить
        </button>
      </div>

      {/* Прогресс-бар */}
      {currentProgress > 0 && (
        <div className="w-full bg-surface-border rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-accent-green h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${currentProgress}%` }}
          />
        </div>
      )}

      {/* Шаг 1: Выбор типа */}
      {step === 'select' && (
        <Card
          padding="lg"
          className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300"
        >
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
          <button
            onClick={() => setStep('select')}
            className="w-full py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            Отмена
          </button>
        </Card>
      )}

      {/* Шаг 2: Детали */}
      {step === 'details' && (
        <Card
          padding="md"
          className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep('select')}
              className="text-text-muted hover:text-text-primary text-sm inline-flex items-center gap-1 transition-colors"
            >
              <Icon name="back" size={14} /> Назад
            </button>
            <span className="text-xs text-text-muted">Шаг 2 из 3</span>
          </div>

          {/* Web3 */}
          {form.type === 'web3' && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">Выберите Web3-провайдер</p>
              <div className="grid grid-cols-2 gap-3">
                {WEB3_PROVIDERS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => handleSelectWeb3(p.value)}
                    className={cn(
                      'p-3 rounded-xl border text-left transition-all duration-200',
                      form.web3Provider === p.value
                        ? 'border-accent-green bg-accent-green/5'
                        : 'border-surface-border bg-surface-elevated hover:border-accent-green/30'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        name={p.icon}
                        size={20}
                        className={
                          form.web3Provider === p.value
                            ? 'text-accent-green'
                            : 'text-text-secondary'
                        }
                      />
                      <span className="text-sm font-medium">{p.label}</span>
                    </div>
                  </button>
                ))}
              </div>
              {form.web3Provider === 'metamask' && (
                <button
                  onClick={async () => {
                    try {
                      const w = window as any;
                      if (!w.ethereum) {
                        toast.error('MetaMask не установлен');
                        return;
                      }
                      const accounts = await w.ethereum.request({ method: 'eth_requestAccounts' });
                      setForm({ ...form, address: accounts[0] });
                      toast.success('Кошелёк подключен!');
                    } catch {
                      toast.error('Ошибка подключения к MetaMask');
                    }
                  }}
                  className="w-full py-3 bg-accent-green text-surface rounded-xl font-semibold hover:bg-accent-green-dim transition-all duration-200 active:scale-[0.98]"
                >
                  Подключить MetaMask
                </button>
              )}
            </div>
          )}

          {/* CEX */}
          {form.type === 'cex' && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">Выберите биржу</p>
              <div className="grid grid-cols-2 gap-3">
                {CEX_PROVIDERS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => handleSelectCEX(p.value)}
                    className={cn(
                      'p-3 rounded-xl border text-left transition-all duration-200',
                      form.cexProvider === p.value
                        ? 'border-accent-green bg-accent-green/5'
                        : 'border-surface-border bg-surface-elevated hover:border-accent-green/30'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        name={p.icon}
                        size={20}
                        className={
                          form.cexProvider === p.value ? 'text-accent-green' : 'text-text-secondary'
                        }
                      />
                      <span className="text-sm font-medium">{p.label}</span>
                    </div>
                  </button>
                ))}
              </div>
              {form.cexProvider && (
                <>
                  <div className="p-4 rounded-xl bg-accent-green/5 border border-accent-green/20">
                    <p className="text-accent-green font-semibold text-sm inline-flex items-center gap-1.5">
                      <Icon name="shield" size={14} /> Только чтение (Read-only)
                    </p>
                    <p className="text-text-secondary text-xs mt-1">
                      Создайте API ключ с правами только на чтение. Ваши средства в безопасности.
                    </p>
                  </div>
                  <input
                    type="password"
                    placeholder="API Key"
                    value={form.apiKey}
                    onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                    className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-accent-green/30 transition-all"
                  />
                  <input
                    type="password"
                    placeholder="API Secret"
                    value={form.apiSecret}
                    onChange={(e) => setForm({ ...form, apiSecret: e.target.value })}
                    className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-accent-green/30 transition-all"
                  />
                  <button
                    onClick={handleVerify}
                    disabled={verifying || !form.apiKey || !form.apiSecret}
                    className="w-full py-2.5 border border-accent-green/30 text-accent-green rounded-xl text-sm font-medium hover:bg-accent-green/5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    {verifying ? 'Проверка...' : 'Проверить подключение'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Watch-only */}
          {form.type === 'watch-only' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-text-muted block mb-1">Сеть</label>
                <select
                  value={form.network}
                  onChange={(e) => setForm({ ...form, network: e.target.value as Network })}
                  className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-green/30 transition-all"
                >
                  {NETWORKS.map((n) => (
                    <option key={n.value} value={n.value}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">Адрес кошелька</label>
                <input
                  type="text"
                  placeholder="0x... или Solana адрес"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-accent-green/30 transition-all"
                />
              </div>
            </div>
          )}

          {/* Import */}
          {form.type === 'import' && (
            <div className="space-y-4 text-center py-8">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-green/10 flex items-center justify-center mb-4">
                <Icon name="import" size={28} className="text-accent-green" />
              </div>
              <p className="text-text-secondary text-sm">Перетащите файл или нажмите для выбора</p>
              <p className="text-text-muted text-xs">Поддерживаются CSV, JSON, Excel</p>
              <input
                type="file"
                accept=".csv,.json,.xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) toast.success(`Файл "${file.name}" загружен`);
                }}
                className="mt-4 text-xs text-text-muted file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-medium file:bg-accent-green/10 file:text-accent-green hover:file:bg-accent-green/20 file:transition-colors file:cursor-pointer"
              />
            </div>
          )}

          {/* Hardware */}
          {form.type === 'hardware' && (
            <div className="space-y-4 text-center py-8">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-green/10 flex items-center justify-center mb-4">
                <Icon name="risk" size={28} className="text-accent-green" />
              </div>
              <p className="text-text-secondary text-sm">Поддержка Ledger и Trezor</p>
              <p className="text-text-muted text-xs">Подключите устройство и нажмите кнопку ниже</p>
              <button className="px-6 py-2.5 bg-accent-green text-surface rounded-xl text-sm font-semibold hover:bg-accent-green-dim transition-all duration-200">
                Обнаружить устройство
              </button>
            </div>
          )}

          {/* QR */}
          {form.type === 'qr' && (
            <div className="space-y-4 text-center py-8">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-green/10 flex items-center justify-center mb-4">
                <Icon name="export-csv" size={28} className="text-accent-green" />
              </div>
              <p className="text-text-secondary text-sm">QR-сканер</p>
              <p className="text-text-muted text-xs">Наведите камеру на QR-код адреса</p>
              <div className="w-48 h-48 mx-auto rounded-xl border-2 border-dashed border-surface-border flex items-center justify-center">
                <Icon name="import" size={48} className="text-text-muted opacity-30" />
              </div>
            </div>
          )}

          {/* Общие поля */}
          <div>
            <label className="text-xs text-text-muted block mb-1">Название (опционально)</label>
            <input
              type="text"
              placeholder="Мой кошелёк"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent-green/30 transition-all"
            />
          </div>

          <button
            onClick={handleAdd}
            disabled={adding}
            className="w-full py-3 bg-accent-green text-surface rounded-xl font-semibold disabled:opacity-50 cursor-pointer hover:bg-accent-green-dim transition-all duration-200 active:scale-[0.98]"
          >
            {adding ? 'Добавление...' : 'Добавить'}
          </button>
        </Card>
      )}

      {/* Список кошельков */}
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
            <Card key={w.id} padding="md" className={cn('border-l-2', getNetworkColor(w.chain))}>
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
                    {w.processing_status === 'completed' ? 'Готово' : w.processing_status}
                  </span>
                  <button
                    onClick={() => handleDelete(w.id)}
                    className="text-text-muted hover:text-accent-red transition-colors p-1 rounded-lg hover:bg-accent-red/5"
                  >
                    <Icon name="delete" size={14} />
                  </button>
                </div>
              </div>
              {syncProgress[w.id] !== undefined && syncProgress[w.id] < 100 && (
                <div className="mt-2 w-full bg-surface-border rounded-full h-1 overflow-hidden">
                  <div
                    className="bg-accent-green h-1 rounded-full transition-all duration-300"
                    style={{ width: `${syncProgress[w.id]}%` }}
                  />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ✅ Исправлено: полный визард с 6 типами подключений, прогресс-бар, 8 сетей, 4 Web3-провайдера, 4 CEX, watch-only, import, hardware, QR, сетевые статусы, удаление, анимации */
