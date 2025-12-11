import { useState, createContext, useContext } from 'react';
import { I18nProvider } from '@/i18n/I18nProvider';
import { useI18n } from '@/i18n';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { RequestModal } from '@/components/RequestModal';
import { Hero } from '@/sections/Hero';
import { Features } from '@/sections/Features';
import { Showcase } from '@/sections/Showcase';
import { Process } from '@/sections/Process';
import { WhyUs } from '@/sections/WhyUs';
import { Testimonials } from '@/sections/Testimonials';
import { Story } from '@/sections/Story';
import { Calculator } from '@/sections/Calculator';
import { Pricing } from '@/sections/Pricing';
import { FAQ } from '@/sections/FAQ';
import { CTA } from '@/sections/CTA';
import { Footer } from '@/sections/Footer';

// Modal context for global access
type Plan = 'subscription' | 'standard' | 'premium' | null;
interface ModalContextType {
  openModal: (plan?: Plan) => void;
}
export const ModalContext = createContext<ModalContextType | null>(null);
export const useModal = () => {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
};

function AppContent() {
  const [viewMode, setViewMode] = useState<'admin' | 'client'>('admin');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan>(null);
  const { t } = useI18n();

  const openModal = (plan?: Plan) => {
    setSelectedPlan(plan || null);
    setIsModalOpen(true);
  };

  const navLinks = [
    { label: t.nav.features, href: '#features' },
    { label: t.nav.calculator, href: '#calculator' },
    { label: t.nav.testimonials, href: '#testimonials' },
    { label: t.nav.pricing, href: '#pricing' },
    { label: t.nav.faq, href: '#faq' },
  ];

  return (
    <ModalContext.Provider value={{ openModal }}>
      <div className="min-h-screen bg-[#FFFBF7] text-[#2C1810]">
        <header className="sticky top-0 z-50 border-b border-[#E8DDD4] bg-[#FFFBF7]/90 backdrop-blur-xl">
          <Container as="nav" aria-label="Main navigation" className="flex flex-wrap items-center justify-between gap-4 py-4">
            <a href="#" className="flex items-center gap-2.5 text-xl font-bold text-[#2C1810]">
              <span className="text-2xl">☕</span>
              Brewly
            </a>
            <div className="hidden flex-wrap items-center gap-8 text-sm text-[#4A2C2A]/70 md:flex">
              {navLinks.map((link) => (
                <a 
                  key={link.href} 
                  href={link.href} 
                  className="transition-colors duration-200 hover:text-[#6B4423] font-medium focus:outline-none focus:ring-2 focus:ring-[#C68B59] focus:ring-offset-2 focus:ring-offset-[#FFFBF7] rounded px-2 py-1"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <Button onClick={() => openModal()} className="hidden text-xs uppercase sm:inline-flex">
                {t.nav.requestDemo}
              </Button>
            </div>
          </Container>
        </header>
        <main>
          <Hero />
          <Features />
          <Process />
          <Showcase viewMode={viewMode} setViewMode={setViewMode} />
          <WhyUs />
          <Testimonials />
          <Story />
          <Calculator />
          <Pricing />
          <FAQ />
          <CTA />
        </main>
        <Footer />
        
        {/* Request Modal */}
        <RequestModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)}
          selectedPlan={selectedPlan}
        />
      </div>
    </ModalContext.Provider>
  );
}

function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}

export default App;

