/**
 * useFirstVisit — shows loader for MIN_DISPLAY_MS on first visit to a route,
 * then skips it on subsequent visits within the same session.
 */
import { useState, useEffect, useRef } from 'react';

const MIN_DISPLAY_MS = 1800;

/** Session-level set of routes that have already been shown the loader */
const visitedRoutes = new Set<string>();

/**
 * @param routeKey unique key for the route (e.g. pathname)
 * @param ready    true when async content (lazy chunk, auth, data) is resolved
 * @returns `true` while the loader should be displayed
 */
export function useFirstVisit(routeKey: string, ready: boolean): boolean {
  const [showLoader, setShowLoader] = useState(() => !visitedRoutes.has(routeKey));
  const timerDone = useRef(visitedRoutes.has(routeKey));
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Re-evaluate when route changes
  useEffect(() => {
    const alreadyVisited = visitedRoutes.has(routeKey);
    timerDone.current = alreadyVisited;

    if (alreadyVisited) {
      setShowLoader(false);
      return;
    }

    setShowLoader(true);

    // Start minimum display timer
    timeoutRef.current = setTimeout(() => {
      timerDone.current = true;
      // If content is already ready, hide immediately
      setShowLoader((prev) => {
        if (prev) {
          visitedRoutes.add(routeKey);
        }
        return false;
      });
    }, MIN_DISPLAY_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [routeKey]);

  // React to content becoming ready after timer
  useEffect(() => {
    if (visitedRoutes.has(routeKey)) return;

    if (ready && timerDone.current) {
      visitedRoutes.add(routeKey);
      setShowLoader(false);
    }
  }, [ready, routeKey]);

  return showLoader;
}
