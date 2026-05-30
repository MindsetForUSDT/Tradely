import { useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

type ExchangeType = 'binance' | 'bybit' | 'okx' | 'mt4' | 'mt5';

function getErrorMessage(err: any): string {
  const msg = err?.message || String(err);
  if (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('ERR_CONNECTION_REFUSED')
  ) {
    return 'Ошибка соединения с сервером. Проверьте подключение или попробуйте позже.';
  }
  if (msg.includes('Invalid API key')) {
    return 'Неверный API ключ';
  }
  return msg;
}

export function useImportTrades() {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const importFromExchange = async (exchange: ExchangeType, apiKey: string, apiSecret: string) => {
    setImporting(true);
    setProgress(10);

    try {
      setProgress(30);

      const response: any = await api.post('/wallets/sync', {
        exchange,
        apiKey,
        apiSecret,
      });

      setProgress(70);

      if (response.success) {
        toast.success(`Импортировано ${response.imported || 0} сделок`);
        setProgress(100);
      } else {
        console.error('[useImportTrades] Import failed:', response?.error);
        toast.error(response?.error || 'Ошибка импорта');
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
