import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from '@/components/layout/Layout';
import { Landing } from '@/pages/Landing';
import { Subscribe } from '@/pages/Subscribe';
import { Payment } from '@/pages/Payment';
import { Dashboard } from '@/pages/Dashboard';
import { ProAnalytics } from '@/pages/ProAnalytics';
import { NotFound } from '@/pages/NotFound';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ProGuard } from '@/components/auth/ProGuard';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1A1A1A',
            color: '#FFFFFF',
            border: '1px solid #2A2A2A',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#00FFA3', secondary: '#0A0A0A' } },
          error: { iconTheme: { primary: '#FF3B5C', secondary: '#0A0A0A' } },
        }}
      />

      <Routes>
        <Route element={<Layout />}>
          {/* Публичные */}
          <Route path="/" element={<Landing />} />
          <Route path="/subscribe" element={<Subscribe />} />

          {/* Защищённые (только авторизованные) */}
          <Route path="/payment" element={<AuthGuard><Payment /></AuthGuard>} />

          {/* Дашборд (только с кошельком или триалом) */}
          <Route path="/dashboard/*" element={
            <AuthGuard><ProGuard><Dashboard /></ProGuard></AuthGuard>
          } />

          {/* PRO-аналитика (только PRO) */}
          <Route path="/pro/*" element={
            <AuthGuard><ProGuard requirePro><ProAnalytics /></ProGuard></AuthGuard>
          } />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}