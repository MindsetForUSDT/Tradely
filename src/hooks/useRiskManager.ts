import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/lib/auth';
import toast from 'react-hot-toast';

interface RiskLimits {
  id?: string;
  daily_loss_limit: number;
  weekly_loss_limit: number;
  position_size_percent: number;
  max_leverage: number;
  alert_enabled: boolean;
  alert_email: string;
}

export function useRiskManager() {
  const [limits, setLimits] = useState<RiskLimits>({
    daily_loss_limit: 0,
    weekly_loss_limit: 0,
    position_size_percent: 2,
    max_leverage: 1,
    alert_enabled: true,
    alert_email: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLimits();
  }, []);

  const loadLimits = async () => {
    const uid = getUserId();
    if (!uid) {
      setLoading(false);
      return;
    }
    const { data } = await supabase.from('risk_limits').select('*').eq('user_id', uid).single();
    if (data) setLimits(data);
    setLoading(false);
  };

  const saveLimits = async (newLimits: RiskLimits) => {
    const uid = getUserId();
    if (!uid) return;
    const { error } = await supabase.from('risk_limits').upsert({
      ...newLimits,
      user_id: uid,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      toast.error('Ошибка сохранения');
    } else {
      toast.success('Лимиты сохранены');
      setLimits(newLimits);
    }
  };

  return { limits, loading, saveLimits };
}
