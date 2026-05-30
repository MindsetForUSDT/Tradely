import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface AnalyticsResponse {
  analytics?: unknown[];
}

export function useAnalytics(days = 30) {
  const {
    data: analytics = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['analytics', days],
    queryFn: async (): Promise<unknown[]> => {
      const response = await api.get<AnalyticsResponse>(`/analytics?days=${days}`);
      return response.analytics || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: true,
  });
  return { analytics, todayAnalytics: analytics[0] || null, isLoading, error, refetch };
}
