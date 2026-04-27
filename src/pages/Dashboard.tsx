import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TradeList } from '@/components/dashboard/TradeList';
import { WalletConnect } from '@/components/dashboard/WalletConnect';
import { RequireWallet } from '@/components/dashboard/RequireWallet';

export function Dashboard() {
  return (
    <Routes>
      <Route index element={<DashboardLayout />} />
      <Route path="trades" element={<TradeList trades={[]} />} />
      <Route path="wallets" element={<WalletConnect />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}