import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Landing } from '@/pages/Landing';
import { Features } from '@/pages/Features';
import { NewSubscribe as Subscribe } from '@/pages/NewSubscribe';
import { Payment } from '@/pages/Payment';
import { Dashboard } from '@/pages/Dashboard';
import { ProAnalytics } from '@/pages/ProAnalytics';
import { Terms } from '@/pages/Terms';
import { Privacy } from '@/pages/Privacy';
import { Register } from '@/pages/Register';
import { Login } from '@/pages/Login';
import { ForgotPassword } from '@/pages/ForgotPassword';
import { UpdatePassword } from '@/pages/UpdatePassword';
import { NotFound } from '@/pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/features" element={<Features />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/subscribe" element={<Subscribe />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/dashboard/*" element={<Dashboard />} />
        <Route path="/pro/*" element={<ProAnalytics />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
