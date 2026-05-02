import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TradeList } from '@/components/dashboard/TradeList';
import { WalletConnect } from '@/components/dashboard/WalletConnect';
import { AlertSettings } from '@/components/dashboard/AlertSettings';
import { TaxReport } from '@/components/dashboard/TaxReport';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';

function TradesPage() {
  const { trades } = useTradesOptimized({ limit: 200, daysAgo: 90 });
  return <TradeList trades={trades as any} />;
}

export function Dashboard() {
  return (
    <Routes>
      <Route index element={<DashboardLayout />} />
      <Route path="trades" element={<TradesPage />} />
      <Route path="wallets" element={<WalletConnect />} />
      <Route path="alerts" element={<AlertSettings />} />
      <Route path="tax" element={<TaxReport />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
