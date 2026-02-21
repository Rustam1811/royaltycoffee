import React from 'react';

const ROYAL_BG = '/images/royal-bg.jpg';

interface RoyalLayoutProps {
  children: React.ReactNode;
  showOverlay?: boolean;
  overlayOpacity?: 'light' | 'medium' | 'dark';
}

export const RoyalLayout: React.FC<RoyalLayoutProps> = ({ 
  children, 
  showOverlay = true,
  overlayOpacity = 'medium' 
}) => {
  const overlayClasses = {
    light: 'from-black/20 via-black/10 to-black/30',
    medium: 'from-black/40 via-black/20 to-black/60',
    dark: 'from-black/60 via-black/40 to-black/70'
  };

  return (
    <div className="min-h-screen relative">
      {/* Фоновое изображение Royalty Coffee */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${ROYAL_BG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        {showOverlay && (
          <div className={`absolute inset-0 bg-gradient-to-b ${overlayClasses[overlayOpacity]}`} />
        )}
      </div>

      {/* Контент */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default RoyalLayout;
