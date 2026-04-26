// ============================================================
// TradeumDiary — Корневой компонент приложения
// Настройка маршрутизации с защищёнными роутами
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from '@/components/layout/Layout';
import { Landing } from '@/pages/Landing';
import { Subscribe } from '@/pages/Subscribe';
import { Payment } from '@/pages/Payment';
import { Dashboard } from '@/pages/Dashboard';
import { NotFound } from '@/pages/NotFound';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ProGuard } from '@/components/auth/ProGuard';

// Ленивая загрузка страниц для улучшения производительности
// (в MVP используем прямые импорты, в проде — React.lazy)

export default function App() {
  return (
    <BrowserRouter>
      {/* Система уведомлений */}
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
          success: {
            iconTheme: {
              primary: '#00FFA3',
              secondary: '#0A0A0A',
            },
          },
          error: {
            iconTheme: {
              primary: '#FF3B5C',
              secondary: '#0A0A0A',
            },
          },
        }}
      />

      <Routes>
        {/* Публичные маршруты */}
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/subscribe" element={<Subscribe />} />

          {/* Защищённые маршруты (требуется авторизация) */}
          <Route
            path="/payment"
            element={
              <AuthGuard>
                <Payment />
              </AuthGuard>
            }
          />

          {/* Дашборд (требуется PRO-подписка) */}
          <Route
            path="/dashboard/*"
            element={
              <AuthGuard>
                <ProGuard>
                  <Dashboard />
                </ProGuard>
              </AuthGuard>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}