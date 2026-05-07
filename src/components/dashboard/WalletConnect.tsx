import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { useWallets } from '@/hooks/useWallets';
import { shortenAddress, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export function WalletConnect() {
  const { wallets, refresh } = useWallets();
  const [showForm, setShowForm] = useState(false);
  const [address, setAddress] = useState('');
  const [label, setLabel] = useState('');
  const [adding, setAdding] = useState(false);

  const addWallet = async () => {
    if (!address.trim()) {
      toast.error('Введите адрес');
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Не авторизован');
      return;
    }

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

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between relative" style={{ zIndex: 50 }}>
        <div>
          <h1 className="text-2xl font-bold">Кошельки</h1>
          <p className="text-sm text-text-muted mt-1">Подключите кошелёк для импорта сделок</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-accent-green text-surface rounded-xl text-sm font-semibold hover:bg-accent-green-dim transition-colors cursor-pointer"
          style={{ zIndex: 100, position: 'relative', pointerEvents: 'auto' }}
        >
          {showForm ? 'Отмена' : '+ Кошелёк'}
        </button>
      </div>

      {showForm && (
        <Card padding="md" className="space-y-4" style={{ position: 'relative', zIndex: 50 }}>
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
          <button
            onClick={addWallet}
            disabled={adding}
            className="w-full py-3 bg-accent-green text-surface rounded-xl font-semibold hover:bg-accent-green-dim transition-colors disabled:opacity-50 cursor-pointer"
            style={{ pointerEvents: 'auto' }}
          >
            {adding ? 'Добавление...' : 'Добавить кошелёк'}
          </button>
        </Card>
      )}

      {wallets.length === 0 && !showForm ? (
        <Card padding="lg">
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-green/10 flex items-center justify-center mb-4">
              <span className="text-2xl">💳</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Нет кошельков</h3>
            <p className="text-sm text-text-muted">Добавьте кошелёк для импорта сделок</p>
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
