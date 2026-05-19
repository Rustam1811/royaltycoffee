import React, { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';

const Cup3D = lazy(() => import('./Cup3D'));

/** Tiny gold-ring placeholder shown while the Cup3D chunk is downloading */
const ThermosFallback: React.FC<{ size: number }> = ({ size }) => (
  <div
    className="rounded-full border-2 border-[#D4AF37]/30 flex items-center justify-center"
    style={{ width: size, height: size }}
  >
    <div className="w-1/3 h-1/3 rounded-full bg-[#D4AF37]/15 animate-pulse" />
  </div>
);

interface WorkshopLoaderProps {
  text?: string;
  fullScreen?: boolean;
}

/**
 * Полноэкранный лоадер цеха с крутящимся 3D-термосом.
 * Показывается пока все данные не загрузятся.
 */
export const WorkshopLoader: React.FC<WorkshopLoaderProps> = ({
  text = 'Загрузка...',
  fullScreen = true,
}) => {
  if (!fullScreen) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-5">
        <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-workshop-500/20">
          <Suspense fallback={<ThermosFallback size={112} />}>
            <Cup3D className="w-full h-full" />
          </Suspense>
        </div>
        <p className="text-sm text-slate-400 font-medium animate-pulse">{text}</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center overflow-hidden bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Gold ring around thermos */}
        <div className="relative w-40 h-40">
          {/* Animated ring */}
          <svg className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: '3s' }}>
            <circle
              cx="80" cy="80" r="76" fill="none"
              stroke="rgba(238,123,17,0.15)" strokeWidth="3"
            />
            <circle
              cx="80" cy="80" r="76" fill="none"
              stroke="#EE7B11" strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 76 * 0.3} ${2 * Math.PI * 76 * 0.7}`}
            />
          </svg>
          {/* Cup3D inside */}
          <div className="absolute inset-3 rounded-full overflow-hidden">
            <Suspense fallback={<ThermosFallback size={136} />}>
              <Cup3D className="w-full h-full" />
            </Suspense>
          </div>
        </div>

        {/* Pulsing dots */}
        <div className="flex items-center gap-1.5 mb-1">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-workshop-500"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
            />
          ))}
        </div>

        {/* Text */}
        <p className="text-slate-500 text-sm font-medium">{text}</p>
      </div>
    </div>
  );
};

export default WorkshopLoader;
