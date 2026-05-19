/**
 * RoyalLoader — Branded loading screen for Royalty Coffee
 * Animated cup fills up with a wave, then steam appears
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import RoyaltyCup from './RoyaltyCup';

interface RoyalLoaderProps {
  text?: string;
  /** true (default) = fixed fullscreen overlay; false = inline compact loader */
  fullScreen?: boolean;
}

export const RoyalLoader: React.FC<RoyalLoaderProps> = ({ fullScreen = true }) => {
  const [fillPercent, setFillPercent] = useState(0);
  const lastVal = useRef(0);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    let raf: number;
    let start: number | null = null;
    const duration = 2400;

    const waveFill = (t: number): number => {
      const base = 1 - Math.pow(1 - t, 2.5);
      const wobble = Math.sin(t * Math.PI * 5) * 0.06 * (1 - t);
      return Math.min(Math.max(base + wobble, 0), 1);
    };

    const animate = (ts: number) => {
      if (!activeRef.current) return; // stop when unmounted
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      const newVal = Math.round(waveFill(progress) * 200) / 2;

      if (newVal !== lastVal.current) {
        lastVal.current = newVal;
        setFillPercent(newVal);
      }

      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      } else {
        const t = setTimeout(() => {
          if (!activeRef.current) return;
          start = null;
          lastVal.current = 0;
          setFillPercent(0);
          raf = requestAnimationFrame(animate);
        }, 1200);
        // store timeout id so cleanup can clear it
        (animate as any)._t = t;
      }
    };

    raf = requestAnimationFrame(animate);
    return () => {
      activeRef.current = false;
      cancelAnimationFrame(raf);
      clearTimeout((animate as any)._t);
    };
  }, []);

  if (!fullScreen) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <RoyaltyCup percent={fillPercent} size={300} />
        {/* <p className="text-[13px] text-[#3D0A11]/30 font-medium animate-pulse">Загружаем…</p> */}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center overflow-hidden bg-[#F4EDE4]">
      <div className="relative z-10 flex flex-col items-center gap-5">
        {/* Стакан + оверлей с logo внутри */}
        <motion.div
          className="relative"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <RoyaltyCup percent={fillPercent} size={480} />
          {/* logo_home.png — повёрнут 90° по часовой: буквы горизонтальны, низ смотрит вправо */}
          <motion.img
            src="/images/logo_home.png"
            alt="Royalty Coffee"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: '50%',
              top: '73%',
              transform: 'translate(-50%, -50%) rotate(-90deg)',
              width: '55%',
              height: 'auto',
              objectFit: 'contain',
              pointerEvents: 'none',
              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
            }}
          />
        </motion.div>
      </div>
    </div>
  );
};

export default RoyalLoader;
