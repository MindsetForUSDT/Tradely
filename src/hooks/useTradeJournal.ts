import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export function useTradeJournal() {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const response: any = await api.get('/trades?limit=200&orderBy=timestamp&ascending=false');
      const manualTrades = (response.trades || []).filter((t: any) => t.import_source === 'manual');
      setTrades(manualTrades);
    } catch (error) {
      console.error('[useTradeJournal] Error loading trades:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addTrade = async (trade: any) => {
    try {
      await api.post('/trades', { ...trade, import_source: 'manual', status: 'closed' });
      toast.success('Сделка добавлена');
      load();
    } catch (error) {
      toast.error('Ошибка добавления');
    }
  };

  const updateTrade = async (trade: any) => {
    try {
      await api.patch(`/trades/${trade.id}`, trade);
      toast.success('Сделка обновлена');
      load();
    } catch (error) {
      toast.error('Ошибка обновления');
    }
  };

  const deleteTrade = async (id: string) => {
    try {
      await api.delete(`/trades/${id}`);
      toast.success('Сделка удалена');
      load();
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  return { trades, loading, addTrade, updateTrade, deleteTrade };
}
