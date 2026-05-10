import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { FAQSection } from '@/components/landing/FAQSection';

export function Landing() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <FAQSection />
    </div>
  );
}
