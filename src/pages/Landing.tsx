import { NewHeroSection } from '@/components/landing/NewHeroSection';
import { NewFeaturesSection } from '@/components/landing/NewFeaturesSection';

export function Landing() {
  return (
    <div className="min-h-screen">
      <NewHeroSection />
      <NewFeaturesSection />
    </div>
  );
}
