// ============================================================
// TradeumDiary — Корневая страница дашборда
// Отвечает за роутинг внутри дашборда
// ============================================================

import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TradeList } from '@/components/dashboard/TradeList';
import { WalletConnect } from '@/components/dashboard/WalletConnect';

export function Dashboard() {
  return (
    <Routes>
      <Route index element={<DashboardLayout />} />
      <Route path="trades" element={<TradeList />} />
      <Route path="wallets" element={<WalletConnect />} />
      <Route path="profile" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}