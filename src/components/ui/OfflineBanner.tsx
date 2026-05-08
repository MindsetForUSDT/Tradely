import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function OfflineBanner() {
  const isOnline = useNetworkStatus();
  if (isOnline) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-accent-red text-white text-center text-xs py-2 px-4">
      Отсутствует подключение к интернету. Некоторые функции недоступны.
    </div>
  );
}
