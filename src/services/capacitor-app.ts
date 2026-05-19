/**
 * Capacitor App Bridge
 *
 * Handles native app lifecycle: status bar, keyboard, back button,
 * safe area, splash screen, and deep links.
 *
 * Import and call `initCapacitorApp()` once in main.tsx or App.tsx.
 */

import { Capacitor } from '@capacitor/core';

/**
 * Initialize all native Capacitor plugins.
 * No-op on web — all plugins gracefully degrade.
 */
export async function initCapacitorApp(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return; // nothing to do on web
  }

  await Promise.all([
    initStatusBar(),
    initKeyboard(),
    initAppListeners(),
  ]);
}

/**
 * Status bar: dark text, translucent overlay
 */
async function initStatusBar(): Promise<void> {
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');

    // Light icons for dark hero on Home
    await StatusBar.setStyle({ style: Style.Light });

    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#00000000' });
      await StatusBar.setOverlaysWebView({ overlay: true });
    }
    // iOS: status bar overlay is handled via viewport-fit=cover + safe-area-inset-top
  } catch (e) {
    console.warn('[Capacitor] StatusBar init failed:', e);
  }
}

/**
 * Keyboard: auto-scroll inputs into view
 */
async function initKeyboard(): Promise<void> {
  try {
    const { Keyboard } = await import('@capacitor/keyboard');

    Keyboard.addListener('keyboardWillShow', (info) => {
      document.documentElement.style.setProperty(
        '--keyboard-height',
        `${info.keyboardHeight}px`
      );
      document.body.classList.add('keyboard-open');
    });

    Keyboard.addListener('keyboardWillHide', () => {
      document.documentElement.style.setProperty('--keyboard-height', '0px');
      document.body.classList.remove('keyboard-open');
    });
  } catch (e) {
    console.warn('[Capacitor] Keyboard init failed:', e);
  }
}

/**
 * App lifecycle: back button handler, deep links, app state
 */
async function initAppListeners(): Promise<void> {
  try {
    const { App } = await import('@capacitor/app');

    // Handle hardware back button (Android)
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.minimizeApp();
      }
    });

    // Handle deep links (e.g., royalcoffee://app/menu)
    App.addListener('appUrlOpen', (event) => {
      const url = new URL(event.url);
      const path = url.pathname;
      if (path) {
        window.location.href = path;
      }
    });

    // Handle app state changes (resume/pause)
    App.addListener('appStateChange', (state) => {
      if (state.isActive) {
        // App came to foreground — refresh data if needed
        console.log('[Capacitor] App resumed');
      }
    });
  } catch (e) {
    console.warn('[Capacitor] App listeners init failed:', e);
  }
}
