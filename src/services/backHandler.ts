/**
 * Global back-button handler stack.
 *
 * Overlays and in-page sub-screens (story viewer, menu category/detail, modals)
 * are NOT separate router routes, so the Android hardware back button — handled
 * in `capacitor-app.ts` — would otherwise navigate the router (or exit the app)
 * instead of closing the open overlay.
 *
 * Any component that renders an overlay registers a handler while it is open.
 * The hardware back button (and, on web, the browser back gesture) consults this
 * stack first: if a handler exists, it runs the top one (closing one layer) and
 * stops. Only when the stack is empty does normal navigation / app-exit happen.
 *
 * Usage (inside a component, while the overlay is open):
 *
 *   useEffect(() => pushBackHandler(() => setOpen(false)), []);
 *
 * `pushBackHandler` returns an unregister function, so returning it directly from
 * `useEffect` cleans up automatically on unmount / dependency change.
 */

type BackHandler = () => void;

const stack: BackHandler[] = [];

/**
 * Register a handler to be invoked on the next back action.
 * Returns an unregister function.
 */
export function pushBackHandler(handler: BackHandler): () => void {
  stack.push(handler);
  return () => {
    const idx = stack.lastIndexOf(handler);
    if (idx !== -1) stack.splice(idx, 1);
  };
}

/**
 * Run the top-most back handler, if any.
 * @returns true if a handler consumed the back action, false if the stack is empty.
 */
export function handleBack(): boolean {
  const handler = stack[stack.length - 1];
  if (!handler) return false;
  try {
    handler();
  } catch (e) {
    console.warn('[backHandler] handler threw:', e);
  }
  return true;
}

/** Whether any overlay back handler is currently registered. */
export function hasBackHandler(): boolean {
  return stack.length > 0;
}
