import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/lib/auth';
import toast from 'react-hot-toast';

type ExchangeType = 'binance' | 'bybit' | 'okx' | 'mt4' | 'mt5';

function getErrorMessage(err: any): string {
  const msg = err?.message || String(err);
  if (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('Edge Function')
  ) {
    return 'Ошибка соединения с сервером. Проверьте подключение или попробуйте позже.';
  }
  return msg;
}

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

      // Вызываем Edge Function через supabase client
      const { data, error } = await supabase.functions.invoke('fetch-trade-history', {
        body: { exchange, apiKey, apiSecret, userId: uid },
      });

      setProgress(70);

      if (error) {
        toast.error(getErrorMessage(error));
        setProgress(0);
        setImporting(false);
        return;
      }

      if (data?.success) {
        toast.success(`Импортировано ${data.imported} сделок`);
      } else {
        toast.error(data?.error || 'Ошибка импорта');
      }

      setProgress(100);
    } catch (e: any) {
      toast.error(getErrorMessage(e));
      setProgress(0);
    }
    setImporting(false);
  };

  return { importFromExchange, importing, progress };
}
