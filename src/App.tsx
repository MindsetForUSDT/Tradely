import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from '@/components/layout/Layout';
import { Landing } from '@/pages/Landing';
import { Subscribe } from '@/pages/Subscribe';
import { Payment } from '@/pages/Payment';
import { NotFound } from '@/pages/NotFound';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ProGuard } from '@/components/auth/ProGuard';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const ProAnalytics = lazy(() => import('@/pages/ProAnalytics'));

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
          <Route path="/" element={<Landing />} />
          <Route path="/subscribe" element={<Subscribe />} />
          <Route
            path="/payment"
            element={
              <AuthGuard>
                <Payment />
              </AuthGuard>
            }
          />
          <Route
            path="/dashboard/*"
            element={
              <AuthGuard>
                <ProGuard>
                  <Suspense fallback={null}>
                    <Dashboard />
                  </Suspense>
                </ProGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/pro/*"
            element={
              <AuthGuard>
                <ProGuard requirePro>
                  <Suspense fallback={null}>
                    <ProAnalytics />
                  </Suspense>
                </ProGuard>
              </AuthGuard>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
