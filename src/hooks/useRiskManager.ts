import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
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

const defaultLimits: RiskLimits = {
  daily_loss_limit: 0,
  weekly_loss_limit: 0,
  position_size_percent: 2,
  max_leverage: 1,
  alert_enabled: true,
  alert_email: '',
};

export function useRiskManager() {
  const [limits, setLimits] = useState<RiskLimits>(defaultLimits);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadLimits();
  }, []);

  const loadLimits = async () => {
    try {
      const response = await api.get<RiskLimits>('/risk-limits');
      setLimits({
        ...defaultLimits,
        ...response,
        daily_loss_limit: Number(response.daily_loss_limit ?? defaultLimits.daily_loss_limit),
        weekly_loss_limit: Number(response.weekly_loss_limit ?? defaultLimits.weekly_loss_limit),
        position_size_percent: Number(
          response.position_size_percent ?? defaultLimits.position_size_percent
        ),
        max_leverage: Number(response.max_leverage ?? defaultLimits.max_leverage),
        alert_enabled: response.alert_enabled ?? defaultLimits.alert_enabled,
        alert_email: response.alert_email ?? defaultLimits.alert_email,
      });
    } catch (error) {
      console.error('[useRiskManager] Error loading limits:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveLimits = async (newLimits: RiskLimits) => {
    try {
      const saved = await api.post<RiskLimits>('/risk-limits', newLimits);
      toast.success('Лимиты сохранены');
      setLimits(saved);
    } catch {
      toast.error('Ошибка сохранения');
    }
  };

  return { limits, loading, saveLimits };
}
