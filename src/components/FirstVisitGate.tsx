/**
 * FirstVisitGate — wraps a lazy-loaded page.
 * On first visit to a route, shows RoyalLoader for at least 3 s.
 * On subsequent visits within the session, renders immediately.
 */
import React, { Suspense, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useFirstVisit } from '../hooks/useFirstVisit';
import { RoyalLoader } from './RoyalLoader';

interface FirstVisitGateProps {
  children: React.ReactNode;
}

/**
 * Thin inner component rendered *inside* Suspense so we can detect
 * when the lazy chunk has resolved (children mount = ready).
 */
const ReadyProbe: React.FC<{ onReady: () => void; children: React.ReactNode }> = ({ onReady, children }) => {
  useEffect(() => { onReady(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <>{children}</>;
};

export const FirstVisitGate: React.FC<FirstVisitGateProps> = ({ children }) => {
  const { pathname } = useLocation();
  const [contentReady, setContentReady] = useState(false);
  const showLoader = useFirstVisit(pathname, contentReady);

  // Reset readiness when route changes
  useEffect(() => { setContentReady(false); }, [pathname]);

  return (
    <>
      {/* Always attempt to load the lazy chunk in the background */}
      <Suspense fallback={<RoyalLoader />}>
        <div style={showLoader ? { position: 'fixed', opacity: 0, pointerEvents: 'none' } : undefined}>
          <ReadyProbe key={pathname} onReady={() => setContentReady(true)}>
            {children}
          </ReadyProbe>
        </div>
      </Suspense>

      {/* Overlay loader — only on first visit, at least 3 s */}
      <AnimatePresence>
        {showLoader && (
          <motion.div
            key="royal-loader-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
          >
            <RoyalLoader />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FirstVisitGate;
