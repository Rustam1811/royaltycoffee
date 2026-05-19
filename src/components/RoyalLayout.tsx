import React from 'react';

interface RoyalLayoutProps {
  children: React.ReactNode;
  showOverlay?: boolean;
  overlayOpacity?: 'light' | 'medium' | 'dark';
}

export const RoyalLayout: React.FC<RoyalLayoutProps> = ({ 
  children,
}) => {
  return (
    <div className="min-h-screen relative" style={{ backgroundColor: '#F4EDE4' }}>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default RoyalLayout;
