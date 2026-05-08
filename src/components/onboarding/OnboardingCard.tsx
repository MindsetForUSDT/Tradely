import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';

export function OnboardingCard() {
  const [address, setAddress] = useState('');
  const [chain, setChain] = useState('ethereum');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleConnect = async () => {
    if (!address.trim()) {
      setError('Введите адрес кошелька');
      return;
    }

    setLoading(true);
    setError('');

    const { error: insertError } = await supabase.from('wallets').insert({
      user_id: '77629667-dd24-487b-90ac-a2dbea8b994a',
      address: address.trim(),
      chain,
      processing_status: 'pending',
    });

    if (insertError) {
      setError('Ошибка подключения кошелька. Проверьте адрес.');
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Card padding="lg">
          <div className="text-center space-y-6">
            <div className="text-6xl">🎉</div>
            <h2 className="text-2xl font-bold">Кошелёк подключен!</h2>
            <p className="text-text-muted text-lg">
              Мы начали импорт ваших сделок. Данные появятся в течение нескольких минут.
            </p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Обновить страницу
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Card padding="lg">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-3">👋 Добро пожаловать в TradeumDiary</h2>
          <p className="text-text-muted text-lg">
            Подключите ваш кошелёк для автоматического импорта сделок и аналитики
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Адрес кошелька</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-3 bg-surface-elevated border border-surface-border rounded-xl text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Блокчейн</label>
            <select
              value={chain}
              onChange={(e) => setChain(e.target.value)}
              className="w-full px-4 py-3 bg-surface-elevated border border-surface-border rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-accent-green/30"
            >
              <option value="ethereum">Ethereum</option>
              <option value="bsc">BSC</option>
              <option value="polygon">Polygon</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="optimism">Optimism</option>
              <option value="solana">Solana</option>
            </select>
          </div>

          {error && (
            <p className="text-accent-red text-sm bg-accent-red/10 p-3 rounded-lg">{error}</p>
          )}

          <Button onClick={handleConnect} disabled={loading} className="w-full text-base py-3">
            {loading ? 'Подключение...' : '🔗 Подключить кошелёк'}
          </Button>

          <p className="text-xs text-text-muted text-center">
            Поддерживаются Ethereum, BSC, Polygon, Arbitrum, Optimism, Solana
          </p>
        </div>
      </Card>
    </div>
  );
}
