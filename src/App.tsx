import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from '@/components/layout/Layout';

// Ленивая загрузка страниц
const Landing = lazy(() => import('@/pages/Landing'));
const Subscribe = lazy(() => import('@/pages/Subscribe'));
const Payment = lazy(() => import('@/pages/Payment'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const ProAnalytics = lazy(() => import('@/pages/ProAnalytics'));
const NotFound = lazy(() => import('@/pages/NotFound'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface" role="status">
      <div className="w-10 h-10 rounded-full border-2 border-accent-green border-t-transparent animate-spin" />
      <span className="sr-only">Загрузка страницы...</span>
    </div>
  );
}

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
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/subscribe" element={<Subscribe />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/dashboard/*" element={<Dashboard />} />
            <Route path="/pro/*" element={<ProAnalytics />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
