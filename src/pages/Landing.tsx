import { useState } from 'react';
import { NewHeroSection } from '@/components/landing/NewHeroSection';
import { NewFeaturesSection } from '@/components/landing/NewFeaturesSection';
import { ContactModal } from '@/components/landing/ContactModal';

export function Landing() {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const openContacts = () => {
    console.log('[Landing] Opening contacts modal');
    setIsContactModalOpen(true);
  };

  const closeContacts = () => {
    console.log('[Landing] Closing contacts modal');
    setIsContactModalOpen(false);
  };

  return (
    <div className="min-h-screen">
      <NewHeroSection onOpenContacts={openContacts} />
      <NewFeaturesSection />
      <ContactModal isOpen={isContactModalOpen} onClose={closeContacts} />
    </div>
  );
}
