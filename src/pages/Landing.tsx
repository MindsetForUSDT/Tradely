import { useState } from 'react';
import { NewHeroSection } from '@/components/landing/NewHeroSection';
import { NewFeaturesSection } from '@/components/landing/NewFeaturesSection';
import { ContactModal } from '@/components/landing/ContactModal';

export function Landing() {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <NewHeroSection onOpenContacts={() => setIsContactModalOpen(true)} />
      <NewFeaturesSection />
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
}
