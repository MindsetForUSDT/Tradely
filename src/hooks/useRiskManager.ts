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
    try {
      const response: any = await api.get('/profile');
      if (response.risk_limits) {
        setLimits(response.risk_limits);
      }
    } catch (error) {
      console.error('[useRiskManager] Error loading limits:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveLimits = async (newLimits: RiskLimits) => {
    try {
      await api.post('/profile/risk-limits', newLimits);
      toast.success('Лимиты сохранены');
      setLimits(newLimits);
    } catch (error) {
      toast.error('Ошибка сохранения');
    }
  };

  return { limits, loading, saveLimits };
}
