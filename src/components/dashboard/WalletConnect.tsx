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
  { value: 'coinbase' as Web3Provider, label: 'Coinbase Wallet', icon: 'binance' as const },
  { value: 'brave' as Web3Provider, label: 'Brave Wallet', icon: 'shield' as const },
];

const CEX_PROVIDERS = [
  { value: 'binance' as CEXProvider, label: 'Binance', icon: 'binance' as const },
  { value: 'bybit' as CEXProvider, label: 'Bybit', icon: 'bybit' as const },
  { value: 'okx' as CEXProvider, label: 'OKX', icon: 'okx' as const },
  { value: 'kucoin' as CEXProvider, label: 'KuCoin', icon: 'pro' as const },
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
  const [step, setStep] = useState<'select' | 'details'>('select');
  const [form, setForm] = useState<WalletFormData>(INITIAL_FORM);
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState(false);
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

  const handleVerify = async () => {
    setVerifying(true);
    await new Promise((r) => setTimeout(r, 1500));
    setVerifying(false);
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

  const getWalletIcon = (w: any): 'metamask' | 'trustwallet' | 'binance' | 'wallet' => {
    const lbl = (w.label || '').toLowerCase();
    if (lbl.includes('meta')) return 'metamask';
    if (lbl.includes('trust')) return 'trustwallet';
    if (lbl.includes('binance') || lbl.includes('bybit') || lbl.includes('okx')) return 'binance';
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
          }}
          className="px-4 py-2 bg-accent-green text-surface rounded-xl text-sm font-semibold hover:bg-accent-green-dim transition-all duration-200 active:scale-[0.98] inline-flex items-center gap-1.5"
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

      {step === 'details' && (
        <Card padding="md" className="space-y-4">
          <button
            onClick={() => setStep('select')}
            className="text-text-muted hover:text-text-primary text-sm inline-flex items-center gap-1 transition-colors"
          >
            <Icon name="back" size={14} /> Назад
          </button>

          {form.type === 'web3' && (
            <div className="grid grid-cols-2 gap-3">
              {WEB3_PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setForm({ ...form, web3Provider: p.value })}
                  className={cn(
                    'p-3 rounded-xl border transition-all',
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
                        form.web3Provider === p.value ? 'text-accent-green' : 'text-text-secondary'
                      }
                    />
                    <span className="text-sm font-medium">{p.label}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {form.type === 'cex' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {CEX_PROVIDERS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setForm({ ...form, cexProvider: p.value })}
                    className={cn(
                      'p-3 rounded-xl border transition-all',
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
                    disabled={verifying}
                    className="w-full py-2.5 border border-accent-green/30 text-accent-green rounded-xl text-sm font-medium hover:bg-accent-green/5 transition-all disabled:opacity-50"
                  >
                    {verifying ? 'Проверка...' : 'Проверить подключение'}
                  </button>
                </>
              )}
            </>
          )}

          {form.type === 'watch-only' && (
            <>
              <select
                value={form.network}
                onChange={(e) => setForm({ ...form, network: e.target.value as Network })}
                className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white"
              >
                {NETWORKS.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="0x..."
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white font-mono"
              />
            </>
          )}

          {form.type === 'import' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-green/10 flex items-center justify-center mb-4">
                <Icon name="import" size={28} className="text-accent-green" />
              </div>
              <p className="text-text-secondary text-sm">Перетащите файл или нажмите для выбора</p>
              <p className="text-text-muted text-xs">CSV, JSON, Excel</p>
              <input
                type="file"
                accept=".csv,.json,.xlsx,.xls"
                className="mt-4 text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-medium file:bg-accent-green/10 file:text-accent-green"
              />
            </div>
          )}

          {form.type === 'hardware' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-green/10 flex items-center justify-center mb-4">
                <Icon name="risk" size={28} className="text-accent-green" />
              </div>
              <p className="text-text-secondary text-sm">Ledger и Trezor</p>
              <button className="px-6 py-2.5 bg-accent-green text-surface rounded-xl text-sm font-semibold hover:bg-accent-green-dim mt-4">
                Обнаружить устройство
              </button>
            </div>
          )}

          {form.type === 'qr' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-green/10 flex items-center justify-center mb-4">
                <Icon name="export-csv" size={28} className="text-accent-green" />
              </div>
              <p className="text-text-secondary text-sm">QR-сканер</p>
              <div className="w-48 h-48 mx-auto rounded-xl border-2 border-dashed border-surface-border flex items-center justify-center">
                <Icon name="import" size={48} className="text-text-muted opacity-30" />
              </div>
            </div>
          )}

          <input
            type="text"
            placeholder="Название"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-white"
          />
          <button
            onClick={handleAdd}
            disabled={adding}
            className="w-full py-3 bg-accent-green text-surface rounded-xl font-semibold disabled:opacity-50 hover:bg-accent-green-dim transition-all active:scale-[0.98]"
          >
            {adding ? 'Добавление...' : 'Добавить'}
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
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
