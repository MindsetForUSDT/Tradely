import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TradeList } from '@/components/dashboard/TradeList';
import { WalletConnect } from '@/components/dashboard/WalletConnect';
import { AlertSettings } from '@/components/dashboard/AlertSettings';
import { TaxReport } from '@/components/dashboard/TaxReport';
import { TradeJournal } from '@/components/dashboard/TradeJournal';
import { RiskManager } from '@/components/dashboard/RiskManager';
import { StrategyComparison } from '@/components/dashboard/StrategyComparison';
import { MultiAccountView } from '@/components/dashboard/MultiAccountView';
import { ProFeature } from '@/components/guards/ProFeature';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';

function TradesPage() {
  const { trades } = useTradesOptimized({ limit: 200, daysAgo: 90 });
  return <TradeList trades={trades} />;
}

export function Dashboard() {
  return (
    <Routes>
      <Route index element={<DashboardLayout />} />
      <Route path="trades" element={<TradesPage />} />
      <Route path="journal" element={<TradeJournal />} />
      <Route path="wallets" element={<WalletConnect />} />
      <Route path="alerts" element={<AlertSettings />} />
      <Route path="tax" element={<TaxReport />} />
      <Route
        path="risk"
        element={
          <ProFeature>
            <RiskManager />
          </ProFeature>
        }
      />
      <Route
        path="strategies"
        element={
          <ProFeature>
            <StrategyComparison />
          </ProFeature>
        }
      />
      <Route
        path="accounts"
        element={
          <ProFeature>
            <MultiAccountView />
          </ProFeature>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
