import { useState, useEffect } from 'react';
import { useI18n } from '@/i18n';
import { Container } from '@/components/Container';
import { SectionHeader } from '@/components/SectionHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

type ViewMode = 'admin' | 'client';

const adminShots = [
  { 
    url: '/screenshots/admin-orders.png',
    placeholder: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 768"%3E%3Crect width="1024" height="768" fill="%23f9fafb"/%3E%3Ctext x="50%25" y="50%25" font-family="system-ui" font-size="18" fill="%239ca3af" text-anchor="middle" dominant-baseline="middle"%3EOrders%3C/text%3E%3C/svg%3E',
  },
  { 
    url: '/screenshots/admin-menu.png',
    placeholder: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 768"%3E%3Crect width="1024" height="768" fill="%23f9fafb"/%3E%3Ctext x="50%25" y="50%25" font-family="system-ui" font-size="18" fill="%239ca3af" text-anchor="middle" dominant-baseline="middle"%3EMenu POS%3C/text%3E%3C/svg%3E',
  },
  { 
    url: '/screenshots/admin-analytics.png',
    placeholder: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 768"%3E%3Crect width="1024" height="768" fill="%23f9fafb"/%3E%3Ctext x="50%25" y="50%25" font-family="system-ui" font-size="18" fill="%239ca3af" text-anchor="middle" dominant-baseline="middle"%3EAnalytics%3C/text%3E%3C/svg%3E',
  },
];

const clientShots = [
  { 
    url: '/screenshots/client-home.png',
    placeholder: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 844"%3E%3Crect width="390" height="844" fill="%23f9fafb"/%3E%3Ctext x="50%25" y="50%25" font-family="system-ui" font-size="16" fill="%239ca3af" text-anchor="middle" dominant-baseline="middle"%3EHome%3C/text%3E%3C/svg%3E',
  },
  { 
    url: '/screenshots/client-menu.png',
    placeholder: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 844"%3E%3Crect width="390" height="844" fill="%23f9fafb"/%3E%3Ctext x="50%25" y="50%25" font-family="system-ui" font-size="16" fill="%239ca3af" text-anchor="middle" dominant-baseline="middle"%3EMenu%3C/text%3E%3C/svg%3E',
  },
  { 
    url: '/screenshots/client-order.png',
    placeholder: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 844"%3E%3Crect width="390" height="844" fill="%23f9fafb"/%3E%3Ctext x="50%25" y="50%25" font-family="system-ui" font-size="16" fill="%239ca3af" text-anchor="middle" dominant-baseline="middle"%3EOrder%3C/text%3E%3C/svg%3E',
  },
  { 
    url: '/screenshots/client-profile.png',
    placeholder: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 844"%3E%3Crect width="390" height="844" fill="%23f9fafb"/%3E%3Ctext x="50%25" y="50%25" font-family="system-ui" font-size="16" fill="%239ca3af" text-anchor="middle" dominant-baseline="middle"%3EProfile%3C/text%3E%3C/svg%3E',
  },
];

type ShowcaseProps = {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
};

export function Showcase({ viewMode, setViewMode }: ShowcaseProps) {
  const { t } = useI18n();
  const [current, setCurrent] = useState(0);
  const shotsData = viewMode === 'admin' ? adminShots : clientShots;
  const titles = viewMode === 'admin' ? t.showcase.adminShots : t.showcase.clientShots;
  const shots = shotsData.map((shot, i) => ({ ...shot, title: titles[i] || '' }));

  useEffect(() => {
    setCurrent(0);
  }, [viewMode]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % shots.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [shots.length]);

  const goToPrevious = () => {
    setCurrent((prev) => (prev - 1 + shots.length) % shots.length);
  };

  const goToNext = () => {
    setCurrent((prev) => (prev + 1) % shots.length);
  };

  return (
    <section id="showcase" className="bg-[#FFF8F0] py-24 sm:py-32">
      <Container>
        <SectionHeader
          eyebrow={t.showcase.eyebrow}
          title={t.showcase.title}
          description={t.showcase.description}
          align="center"
        />
        <div className="mt-12 flex justify-center">
          <SegmentedControl
            value={viewMode}
            onChange={(value) => setViewMode(value as ViewMode)}
            options={[
              { value: 'admin', label: t.showcase.tabs.admin },
              { value: 'client', label: t.showcase.tabs.client },
            ]}
          />
        </div>
        
        {/* Circular Carousel */}
        <div className="relative mt-12 h-[500px] flex items-center justify-center">
          <div className="relative w-full max-w-6xl h-full flex items-center justify-center">
            {shots.map((shot, index) => {
              const totalSlides = shots.length;
              const offset = (index - current + totalSlides) % totalSlides;
              const normalizedOffset = offset > totalSlides / 2 ? offset - totalSlides : offset;
              
              const isCurrent = normalizedOffset === 0;
              const isVisible = Math.abs(normalizedOffset) <= 1;
              
              const baseWidth = viewMode === 'admin' ? 600 : 280;
              const scale = isCurrent ? 1 : 0.7;
              const opacity = isCurrent ? 1 : isVisible ? 0.5 : 0;
              const zIndex = isCurrent ? 30 : isVisible ? 20 : 10;
              const translateX = normalizedOffset * (baseWidth * 0.85);
              
              return (
                <button
                  key={index}
                  onClick={() => setCurrent(index)}
                  className="absolute transition-all duration-700 ease-out"
                  style={{
                    transform: `translateX(${translateX}px) scale(${scale})`,
                    opacity,
                    zIndex,
                    width: `${baseWidth}px`,
                  }}
                >
                  <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br from-gray-50 to-gray-100 shadow-lg transition-all duration-700 ${
                    isCurrent ? 'shadow-2xl border-orange-600/30' : 'border-black/10'
                  } ${viewMode === 'admin' ? 'aspect-[4/3]' : 'aspect-[9/16]'}`}>
                    <img
                      src={shot.url}
                      alt={shot.title}
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.src = shot.placeholder;
                      }}
                    />
                  </div>
                  {isCurrent && (
                    <p className="mt-4 text-center text-sm font-semibold text-black">
                      {shot.title}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Navigation Buttons */}
          <button
            onClick={goToPrevious}
            aria-label="Предыдущий слайд"
            className="absolute left-8 top-1/2 -translate-y-1/2 rounded-full bg-white p-3 shadow-xl transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-orange-500 z-40"
          >
            <ChevronLeftIcon className="h-6 w-6 text-black" />
          </button>
          <button
            onClick={goToNext}
            aria-label="Следующий слайд"
            className="absolute right-8 top-1/2 -translate-y-1/2 rounded-full bg-white p-3 shadow-xl transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-orange-500 z-40"
          >
            <ChevronRightIcon className="h-6 w-6 text-black" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-2">
            {shots.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrent(index)}
                aria-label={`Перейти к слайду ${index + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  current === index
                    ? 'w-8 bg-orange-600'
                    : 'w-1.5 bg-black/20 hover:bg-black/40'
                }`}
              />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

