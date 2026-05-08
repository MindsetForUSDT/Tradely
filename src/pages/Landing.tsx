import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { AuthPage } from '@/components/auth/AuthPage';

export function Landing() {
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
