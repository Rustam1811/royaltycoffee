/**
 * RoyalLoader — Branded loading screen for Royalty Coffee
 * Shows the 3D rotating thermos on dark royal gradient
 */
import React, { lazy, Suspense } from 'react';

const Cup3D = lazy(() => import('./Cup3D'));

interface RoyalLoaderProps {
  text?: string;
  fullScreen?: boolean;
}

export const RoyalLoader: React.FC<RoyalLoaderProps> = ({
  fullScreen = true,
}) => (
  <div
    className={`${
      fullScreen
        ? 'fixed inset-0 z-[9998] bg-gradient-to-br from-[#1A0A10] via-[#2D0F1A] to-[#4A1A2C]'
        : 'w-full min-h-screen bg-gradient-to-br from-[#1A0A10] via-[#2D0F1A] to-[#4A1A2C]'
    } flex items-center justify-center`}
  >
    {/* 3D Thermos — big and centered */}
    <div className="w-72 h-72 drop-shadow-[0_0_60px_rgba(212,175,55,0.4)]">
      <Suspense fallback={<div />}>
        <Cup3D className="w-full h-full" />
      </Suspense>
    </div>
  </div>
);

export default RoyalLoader;
