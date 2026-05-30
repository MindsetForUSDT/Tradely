// components/dashboard/DashboardLayout.tsx
import { useEffect, useMemo, useState } from 'react';
import { StatsOverview } from './StatsOverview';
import { PnLChart } from './PnLChart';
import { VolumeByTokenChart } from './VolumeByTokenChart';
import { TradesModal } from './TradesModal';
import { RequireWallet } from './RequireWallet';
import { SlideIn } from '@/components/ui/SlideIn';
import { useWallets } from '@/hooks/useWallets';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useStore } from '@/store/useStore';
import { Icon } from '@/components/ui/Icons';

export function DashboardLayout() {
  const { wallets, isLoading: walletsLoading, error: walletsError } = useWallets();

  // Если данные ещё не загрузились
  if (walletsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0a0f] to-[#111318]">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-10 h-10 rounded-full border-2 border-neon-cyan border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-text-muted text-sm mb-2">Загрузка дашборда...</p>
        </div>
      </div>
    );
  }

  // Показываем ошибку только если это критическая ошибка (не 404 Profile not found)
  if (walletsError && walletsError.includes('Profile not found')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0a0f] to-[#111318]">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-accent-red/10 flex items-center justify-center mx-auto mb-4">
            <Icon name="alert" size={28} className="text-accent-red" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Профиль не найден</h2>
          <p className="text-text-muted text-sm mb-4">Пожалуйста, зарегистрируйтесь заново</p>
          <button
            onClick={() => (window.location.href = '/register')}
            className="px-4 py-2 bg-accent-green text-white rounded-lg text-sm font-semibold hover:bg-accent-green-dim transition-all"
          >
            Зарегистрироваться
          </button>
        </div>
      </div>
    );
  }

  // Игнорируем ошибки API и показываем экран без кошельков
  if (!wallets?.length) return <RequireWallet />;
  return <DashboardContent />;
}

function DashboardContent() {
  const { wallets } = useWallets();
  const {
    trades,
    pnlData,
    tokenVolumes,
    totalVolume,
    totalTrades,
    isLoading: tradesLoading,
  } = useTradesOptimized({ limit: 1000 }); // Увеличили limit для графиков

  // Общий баланс = сумма балансов всех кошельков из settings.initialBalance
  const totalBalance = useMemo(() => {
    if (!wallets || wallets.length === 0) return 0;

    let balance = 0;
    wallets.forEach((w) => {
      try {
        const settings = typeof w.settings === 'string' ? JSON.parse(w.settings) : w.settings;
        if (settings && typeof settings === 'object' && 'initialBalance' in settings) {
          const initialBalance = (settings as Record<string, unknown>).initialBalance;
          if (typeof initialBalance === 'string') {
            balance += parseFloat(initialBalance);
          }
        }
      } catch {
        // Ignore parse error
      }
    });

    return balance;
  }, [wallets]);

  // P&L за последние 24 часа
  const dailyPnl = useMemo(() => {
    if (!trades || trades.length === 0) return 0;

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const todayPnl = trades
      .filter((t) => new Date(t.timestamp) >= yesterday)
      .reduce((sum, t) => {
        const pnl =
          typeof t.pnl_realized === 'number'
            ? t.pnl_realized
            : parseFloat(String(t.pnl_realized ?? '0'));
        return sum + (isNaN(pnl) ? 0 : pnl);
      }, 0);

    return todayPnl;
  }, [trades]);

  // P&L за ВСЕ время (если нет сделок за сегодня, показываем общий P&L)
  const totalPnl = useMemo(() => {
    if (!trades || trades.length === 0) return 0;
    return trades.reduce((sum, t) => {
      const pnl =
        typeof t.pnl_realized === 'number'
          ? t.pnl_realized
          : parseFloat(String(t.pnl_realized ?? '0'));
      return sum + (isNaN(pnl) ? 0 : pnl);
    }, 0);
  }, [trades]);

  // Win rate
  const winRate = useMemo(() => {
    if (!trades || trades.length === 0) return 0;
    const profitableTrades = trades.filter((t) => {
      const pnl =
        typeof t.pnl_realized === 'number'
          ? t.pnl_realized
          : parseFloat(String(t.pnl_realized ?? '0'));
      return pnl > 0;
    }).length;
    return (profitableTrades / trades.length) * 100;
  }, [trades]);

  // Общая прибыль/убыток
  // totalPnLFormatted используется для отображения

  // Если сделок за сегодня нет, показываем 0, а не общий P&L
  const displayDailyPnl = dailyPnl;

  const { isLoading: analyticsLoading } = useAnalytics();
  const setStats = useStore((s) => s.setStats);

  // State для модального окна сделок
  const [showTradesModal, setShowTradesModal] = useState(false);

  const statsUpdate = useMemo(
    () => ({
      totalBalance: totalBalance,
      dailyPnl: displayDailyPnl,
      totalTrades: totalTrades,
      isLoading: tradesLoading || analyticsLoading,
    }),
    [totalBalance, displayDailyPnl, totalTrades, tradesLoading, analyticsLoading]
  );

  useEffect(() => {
    setStats(statsUpdate);
  }, [statsUpdate, setStats]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8 relative">
      {/* Градиентные пятна для глубины */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-neon-cyan/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-neon-magenta/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10">
        <SlideIn direction="down" delay={0.1}>
          <StatsOverview
            balance={totalBalance}
            pnl={displayDailyPnl}
            trades={totalTrades}
            totalPnl={totalPnl}
            winRate={winRate}
            totalVolume={totalVolume}
            isLoading={tradesLoading || analyticsLoading}
            onTradesClick={() => setShowTradesModal(true)}
          />
        </SlideIn>

        <div className="grid lg:grid-cols-2 gap-6 mt-8">
          <SlideIn direction="left" delay={0.2}>
            <PnLChart data={pnlData} isLoading={tradesLoading} />
          </SlideIn>
          <SlideIn direction="right" delay={0.3}>
            <VolumeByTokenChart data={tokenVolumes} isLoading={tradesLoading} />
          </SlideIn>
        </div>

        {/* Modal со всеми сделками */}
        {showTradesModal && (
          <TradesModal trades={trades} onClose={() => setShowTradesModal(false)} />
        )}
      </div>
    </div>
  );
}
