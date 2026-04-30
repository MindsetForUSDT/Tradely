import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { AuthPage } from '@/components/auth/AuthPage';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

export function Landing() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-10 h-10 rounded-full border-2 border-accent-green border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen">
      <HeroSection>
        <AuthPage />
      </HeroSection>
      <FeaturesSection />
      <FAQSection />
    </div>
  );
}