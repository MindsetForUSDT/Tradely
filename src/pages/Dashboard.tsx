// pages/Dashboard.tsx — ОПТИМИЗИРОВАННЫЙ РОУТИНГ
import { lazy, Suspense, useMemo, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { WalletConnect } from '@/components/dashboard/WalletConnect';
import { AlertSettings } from '@/components/dashboard/AlertSettings';
import { TaxReport } from '@/components/dashboard/TaxReport';
import { ManualTradeForm, type ManualTradeInput } from '@/components/dashboard/ManualTradeForm';
import { ProFeature } from '@/components/guards/ProFeature';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { TradeList } from '@/components/dashboard/TradeList';
import { api } from '@/lib/api';
import { getCalendarRangeStart, type ProductRangeDays } from '@/lib/productExperience';
import toast from 'react-hot-toast';

// ✅ Ленивая загрузка тяжелых компонентов
const RiskManager = lazy(() =>
  import('@/components/dashboard/RiskManager').then((m) => ({ default: m.RiskManager }))
);
const StrategyComparison = lazy(() =>
  import('@/components/dashboard/StrategyComparison').then((m) => ({
    default: m.StrategyComparison,
  }))
);
const MultiAccountView = lazy(() =>
  import('@/components/dashboard/MultiAccountView').then((m) => ({ default: m.MultiAccountView }))
);

// ✅ Мемоизированный компонент загрузки
const LoadingFallback = () => (
  <div className="dashboard-route-loading">
    <span />
    Загружаем раздел…
  </div>
);

function TradesPage() {
  const [rangeDays, setRangeDays] = useState<ProductRangeDays>(30);
  const dateFrom = useMemo(() => getCalendarRangeStart(rangeDays).toISOString(), [rangeDays]);
  const {
    trades,
    totalCount,
    isLoading,
    isFetchingMore,
    hasMore,
    loadMore,
    refresh,
    optimisticUpdate,
  } = useTradesOptimized({
    limit: 5000,
    filters: { dateFrom },
  });
  const [manualOpen, setManualOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  let manualEnabled = false;
  try {
    const settings = JSON.parse(
      localStorage.getItem('tradeumdiary_workspace_settings_v1') || '{}'
    ) as { manualTrades?: boolean };
    manualEnabled = Boolean(settings.manualTrades);
  } catch {
    manualEnabled = false;
  }

  const addManualTrade = async (trade: ManualTradeInput) => {
    setSaving(true);
    try {
      await api.post('/trades', trade);
      await refresh();
      setManualOpen(false);
      toast.success('Сделка добавлена');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить сделку');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TradeList
        trades={trades}
        totalCount={totalCount}
        hasMore={hasMore}
        isLoading={isLoading}
        isFetchingMore={isFetchingMore}
        loadMore={loadMore}
        rangeDays={rangeDays}
        onRangeChange={setRangeDays}
        manualEnabled={manualEnabled}
        onAddManual={() => setManualOpen(true)}
        onTradeUpdate={(trade) => optimisticUpdate(trade.id, trade)}
      />
      {manualOpen ? (
        <div
          className="manual-trade-layer"
          role="dialog"
          aria-modal="true"
          aria-label="Ручная сделка"
        >
          <button
            type="button"
            className="manual-trade-backdrop"
            aria-label="Закрыть форму"
            onClick={() => setManualOpen(false)}
          />
          <ManualTradeForm
            isSubmitting={saving}
            onSave={addManualTrade}
            onCancel={() => setManualOpen(false)}
          />
        </div>
      ) : null}
    </>
  );
}

// ✅ Мемоизированные компоненты Pro-фич
const MemoizedRiskManager = () => (
  <ProFeature>
    <Suspense fallback={<LoadingFallback />}>
      <RiskManager />
    </Suspense>
  </ProFeature>
);

const MemoizedStrategies = () => (
  <ProFeature>
    <Suspense fallback={<LoadingFallback />}>
      <StrategyComparison />
    </Suspense>
  </ProFeature>
);

const MemoizedAccounts = () => (
  <ProFeature>
    <Suspense fallback={<LoadingFallback />}>
      <MultiAccountView />
    </Suspense>
  </ProFeature>
);

export function Dashboard() {
  return (
    <Routes>
      <Route index element={<DashboardLayout />} />
      <Route path="trades" element={<TradesPage />} />
      <Route path="journal" element={<Navigate to="/dashboard/trades" replace />} />
      <Route path="wallets" element={<WalletConnect />} />
      <Route path="alerts" element={<AlertSettings />} />
      <Route path="tax" element={<TaxReport />} />
      <Route path="risk" element={<MemoizedRiskManager />} />
      <Route path="strategies" element={<MemoizedStrategies />} />
      <Route path="accounts" element={<MemoizedAccounts />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
