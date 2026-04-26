// ============================================================
// TradeumDiary — Страница лендинга
// Корневая страница с анимированным хиро-блоком и формой входа
// ============================================================

import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { AuthPage } from '@/components/auth/AuthPage';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

export function Landing() {
  const { isAuthenticated, isLoading } = useAuth();

  // Если пользователь уже авторизован — редирект в дашборд
  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen">
      {/* Хиро-секция с анимацией и формой входа */}
      <HeroSection>
        <AuthPage />
      </HeroSection>

      {/* Возможности продукта */}
      <FeaturesSection />

      {/* FAQ с аккордеоном */}
      <FAQSection />
    </div>
  );
}