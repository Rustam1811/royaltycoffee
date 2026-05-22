import React, { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';

const Cup3D = lazy(() => import('./Cup3D'));

/** Tiny gold-ring placeholder shown while the Cup3D chunk is downloading */
const ThermosFallback: React.FC<{ size: number }> = ({ size }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      border: '2px solid rgba(212,175,55,0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <div
      style={{
        width: size / 3,
        height: size / 3,
        borderRadius: '50%',
        background: 'rgba(212,175,55,0.15)',
      }}
    />
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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '64px 0',
          gap: 20,
        }}
      >
        <div
          style={{
            width: 112,
            height: 112,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '2px solid rgba(90,13,23,0.2)',
          }}
        >
          <Suspense fallback={<ThermosFallback size={112} />}>
            <Cup3D className="w-full h-full" />
          </Suspense>
        </div>
        <p
          style={{
            fontSize: 14,
            color: '#94a3b8',
            fontWeight: 500,
          }}
        >
          {text}
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #fff8f0 0%, #fff 50%, #fffbeb 100%)',
      }}
    >
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
        }}
      >
        {/* Ring + Cup */}
        <div style={{ position: 'relative', width: 160, height: 160 }}>
          {/* Animated SVG ring */}
          <svg
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              animation: 'spin 3s linear infinite',
            }}
            viewBox="0 0 160 160"
            fill="none"
          >
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            <circle
              cx="80"
              cy="80"
              r="76"
              stroke="rgba(238,123,17,0.15)"
              strokeWidth="3"
            />
            <circle
              cx="80"
              cy="80"
              r="76"
              stroke="#EE7B11"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 76 * 0.3} ${2 * Math.PI * 76 * 0.7}`}
            />
          </svg>
          {/* Cup inside */}
          <div
            style={{
              position: 'absolute',
              inset: 12,
              borderRadius: '50%',
              overflow: 'hidden',
            }}
          >
            <Suspense fallback={<ThermosFallback size={136} />}>
              <Cup3D className="w-full h-full" />
            </Suspense>
          </div>
        </div>

        {/* Pulsing dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#5A0D17',
              }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
            />
          ))}
        </div>

        <p
          style={{
            color: '#64748b',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {text}
        </p>
      </div>
    </div>
  );
};

export default WorkshopLoader;
