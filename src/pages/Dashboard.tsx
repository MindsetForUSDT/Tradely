// pages/Dashboard.tsx — ОПТИМИЗИРОВАННЫЙ РОУТИНГ
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { WalletConnect } from '@/components/dashboard/WalletConnect';
import { AlertSettings } from '@/components/dashboard/AlertSettings';
import { TaxReport } from '@/components/dashboard/TaxReport';
import { TradeJournal } from '@/components/dashboard/TradeJournal';
import { ProFeature } from '@/components/guards/ProFeature';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { TradeList } from '@/components/dashboard/TradeList';

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
  const { trades, isLoading } = useTradesOptimized({ limit: 200, daysAgo: 90 });
  return <TradeList trades={trades} isLoading={isLoading} />;
}

function ManualJournalPage() {
  try {
    const settings = JSON.parse(
      localStorage.getItem('tradeumdiary_workspace_settings_v1') || '{}'
    ) as { manualTrades?: boolean };
    return settings.manualTrades ? <TradeJournal /> : <Navigate to="/dashboard/trades" replace />;
  } catch {
    return <Navigate to="/dashboard/trades" replace />;
  }
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
      <Route path="journal" element={<ManualJournalPage />} />
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
