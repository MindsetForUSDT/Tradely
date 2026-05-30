import { useState, useRef, useEffect } from 'react';
import { NewHeroSection } from '@/components/landing/NewHeroSection';
import { NewFeaturesSection } from '@/components/landing/NewFeaturesSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { ContactModal } from '@/components/landing/ContactModal';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

export function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const featuresRef = useRef<HTMLDivElement>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  // Перенаправляем авторизованных пользователей на дашборд
  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-10 h-10 rounded-full border-2 border-neon-cyan border-t-transparent animate-spin" />
      </div>
    );
  }

  const openContacts = () => {
    setIsContactModalOpen(true);
  };

  const closeContacts = () => {
    setIsContactModalOpen(false);
  };

  const scrollToFeatures = () => {
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
