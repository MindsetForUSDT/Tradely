import { useQuery } from '@tanstack/react-query';
import { useApi } from './useApi';

export function useKelly(days = 90) {
  const { get } = useApi();
  return useQuery({
    queryKey: ['kelly', days],
    queryFn: () => get(`/analytics/kelly?days=${days}`),
    enabled: false, // Pro feature
  });
}

export function useSharpeRatio() {
  const { get } = useApi();
  return useQuery({
    queryKey: ['sharpe'],
    queryFn: () => get('/analytics/sharpe'),
    enabled: false,
  });
}

export function useDrawdown() {
  const { get } = useApi();
  return useQuery({
    queryKey: ['drawdown'],
    queryFn: () => get('/analytics/drawdown'),
    enabled: false,
  });
}

export function useTaxReport(year?: number) {
  const { get } = useApi();
  return useQuery({
    queryKey: ['tax', year],
    queryFn: () => get(`/tax/report?year=${year || new Date().getFullYear() - 1}`),
    enabled: false,
  });
}