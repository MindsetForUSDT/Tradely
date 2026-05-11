import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Landing } from '@/pages/Landing';
import { Subscribe } from '@/pages/Subscribe';
import { Payment } from '@/pages/Payment';
import { Dashboard } from '@/pages/Dashboard';
import { ProAnalytics } from '@/pages/ProAnalytics';
import { NotFound } from '@/pages/NotFound';

export default function App() {
  return (
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
  );
}
