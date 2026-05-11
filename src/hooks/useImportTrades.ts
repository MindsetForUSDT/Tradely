import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/lib/auth';
import toast from 'react-hot-toast';

type ExchangeType = 'binance' | 'bybit' | 'okx' | 'mt4' | 'mt5';

export function useImportTrades() {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const importFromExchange = async (exchange: ExchangeType, apiKey: string, apiSecret: string) => {
    const uid = getUserId();
    if (!uid) {
      toast.error('Не авторизован');
      return;
    }

    setImporting(true);
    setProgress(10);

    try {
      // Сохраняем источник
      await supabase.from('import_sources').insert({
        user_id: uid,
        source_type: exchange,
        api_key_encrypted: apiKey.slice(0, 8) + '***',
        api_secret_encrypted: apiSecret.slice(0, 8) + '***',
      });

      setProgress(30);

      // Вызываем Edge Function
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-trade-history`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ exchange, apiKey, apiSecret, userId: uid }),
        }
      );

      setProgress(70);

      const data = await res.json();
      if (data.success) {
        toast.success(`Импортировано ${data.imported} сделок`);
      } else {
        toast.error(data.error || 'Ошибка импорта');
      }

      setProgress(100);
    } catch (e: any) {
      toast.error('Сетевая ошибка: ' + e.message);
    }
    setImporting(false);
  };

  return { importFromExchange, importing, progress };
}
