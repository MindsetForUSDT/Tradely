import { useState, useRef } from 'react';
import { NewHeroSection } from '@/components/landing/NewHeroSection';
import { NewFeaturesSection } from '@/components/landing/NewFeaturesSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { ContactModal } from '@/components/landing/ContactModal';

export function Landing() {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const featuresRef = useRef<HTMLDivElement>(null);

  const openContacts = () => {
    console.log('[Landing] Opening contacts modal');
    setIsContactModalOpen(true);
  };

  const closeContacts = () => {
    console.log('[Landing] Closing contacts modal');
    setIsContactModalOpen(false);
  };

  const scrollToFeatures = () => {
    console.log('[Landing] Scrolling to features');
    featuresRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen">
      <NewHeroSection onOpenContacts={openContacts} />
      <div ref={featuresRef}>
        <NewFeaturesSection />
      </div>
      <FAQSection />
      <ContactModal isOpen={isContactModalOpen} onClose={closeContacts} />
    </div>
  );
}
