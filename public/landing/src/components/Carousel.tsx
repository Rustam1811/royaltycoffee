import { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface CarouselItem {
  url: string;
  alt: string;
}

interface CarouselProps {
  items: CarouselItem[];
  placeholderSrc: string;
}

export function Carousel({ items, placeholderSrc }: CarouselProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % items.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [items.length]);

  const goToPrevious = () => {
    setCurrent((prev) => (prev - 1 + items.length) % items.length);
  };

  const goToNext = () => {
    setCurrent((prev) => (prev + 1) % items.length);
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative aspect-[9/16] overflow-hidden rounded-3xl border border-black/10 bg-gray-100 shadow-2xl">
        <img
          src={items[current]?.url || placeholderSrc}
          alt={items[current]?.alt || 'Скриншот приложения'}
          className="h-full w-full object-contain transition-opacity duration-500"
          loading="lazy"
        />
        
        {/* Navigation Buttons */}
        <button
          onClick={goToPrevious}
          aria-label="Предыдущий слайд"
          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg transition-all duration-200 hover:bg-white hover:scale-110 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <ChevronLeftIcon className="h-6 w-6 text-black" />
        </button>
        <button
          onClick={goToNext}
          aria-label="Следующий слайд"
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg transition-all duration-200 hover:bg-white hover:scale-110 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <ChevronRightIcon className="h-6 w-6 text-black" />
        </button>
      </div>

      {/* Dots Indicator */}
      <div className="mt-6 flex justify-center gap-2">
        {items.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            aria-label={`Перейти к слайду ${index + 1}`}
            className={clsx(
              'h-2 rounded-full transition-all duration-300',
              current === index
                ? 'w-8 bg-orange-600'
                : 'w-2 bg-black/20 hover:bg-black/40'
            )}
          />
        ))}
      </div>
    </div>
  );
}
