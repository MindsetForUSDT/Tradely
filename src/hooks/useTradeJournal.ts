import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/lib/auth';
import toast from 'react-hot-toast';

export function useTradeJournal() {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const uid = getUserId();
    if (!uid) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', uid)
      .eq('import_source', 'manual')
      .order('timestamp', { ascending: false })
      .limit(200);
    setTrades(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const addTrade = async (trade: any) => {
    const uid = getUserId();
    if (!uid) return;
    const { error } = await supabase
      .from('trades')
      .insert({ ...trade, user_id: uid, import_source: 'manual', status: 'closed' });
    if (error) {
      toast.error('Ошибка добавления');
    } else {
      toast.success('Сделка добавлена');
      load();
    }
  };

  const updateTrade = async (trade: any) => {
    const { error } = await supabase.from('trades').update(trade).eq('id', trade.id);
    if (error) {
      toast.error('Ошибка обновления');
    } else {
      toast.success('Сделка обновлена');
      load();
    }
  };

  const deleteTrade = async (id: string) => {
    const { error } = await supabase.from('trades').delete().eq('id', id);
    if (error) {
      toast.error('Ошибка удаления');
    } else {
      toast.success('Сделка удалена');
      load();
    }
  };

  return { trades, loading, addTrade, updateTrade, deleteTrade };
}
