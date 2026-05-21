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
      const { error: insertError } = await supabase.from('import_sources').insert({
        user_id: uid,
        source_type: exchange,
        api_key_encrypted: apiKey.slice(0, 8) + '***',
        api_secret_encrypted: apiSecret.slice(0, 8) + '***',
      });

      if (insertError) {
        console.error('[useImportTrades] Failed to save import source:', insertError);
        // Не прерываем, продолжаем импорт
      }

      setProgress(30);

      // Вызываем Edge Function через supabase client
      const { data, error } = await supabase.functions.invoke('fetch-trade-history', {
        body: { exchange, apiKey, apiSecret, userId: uid },
      });

      setProgress(70);

      if (error) {
        console.error('[useImportTrades] Edge Function error:', error);
        toast.error(getErrorMessage(error));
        setProgress(0);
        setImporting(false);
        return;
      }

      if (data?.success) {
        toast.success(`Импортировано ${data.imported} сделок`);
        setProgress(100);
      } else {
        console.error('[useImportTrades] Import failed:', data?.error);
        toast.error(data?.error || 'Ошибка импорта');
        setProgress(0);
      }
    } catch (e: any) {
      console.error('[useImportTrades] Exception:', e);
      toast.error(getErrorMessage(e));
      setProgress(0);
    } finally {
      setImporting(false);
    }
  };

  return { importFromExchange, importing, progress };
}
