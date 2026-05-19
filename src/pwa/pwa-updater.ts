export interface PWAUpdateOptions {
  onUpdateAvailable?: () => void;
  onUpdateInstalled?: () => void;
  autoReload?: boolean;
}

class PWAUpdater {
  private registration: ServiceWorkerRegistration | null = null;
  private options: PWAUpdateOptions;
  private updateCheckInterval: number | null = null;

  constructor(options: PWAUpdateOptions = {}) {
    this.options = {
      autoReload: true,
      ...options
    };
  }

  async init(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.ready;
      this.setupUpdateListener();
      this.setupStaleChunkListener();
      this.setupVisibilityCheck();
      this.startPeriodicCheck();
    } catch {
      // Silent fail
    }
  }

  private setupUpdateListener(): void {
    if (!this.registration) return;

    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration?.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          this.handleUpdate(newWorker);
        }
      });
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      
      if (this.options.onUpdateInstalled) {
        this.options.onUpdateInstalled();
      }

      if (this.options.autoReload) {
        window.location.reload();
      }
    });
  }

  private handleUpdate(worker: ServiceWorker): void {
    if (this.options.onUpdateAvailable) {
      this.options.onUpdateAvailable();
    }

    worker.postMessage({ type: 'SKIP_WAITING' });
  }

  /**
   * Listen for STALE_CHUNK messages from the SW.
   * This fires when a hashed JS/CSS chunk is missing after a new deploy
   * (Firebase returns HTML instead of JS). We hard-reload once to pick up
   * the fresh index.html with the new chunk URLs.
   */
  private setupStaleChunkListener(): void {
    // Use sessionStorage so the flag survives page reload and prevents infinite loops.
    // A local variable resets after every reload, causing STALE_CHUNK reload loops.
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'STALE_CHUNK') {
        const alreadyReloaded = sessionStorage.getItem('sw_stale_reload');
        if (!alreadyReloaded) {
          sessionStorage.setItem('sw_stale_reload', '1');
          window.location.reload();
        }
      }
    });
    // Clear the flag after 30s so a genuine future stale can reload once more
    setTimeout(() => sessionStorage.removeItem('sw_stale_reload'), 30_000);
  }

  private setupVisibilityCheck(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkForUpdate();
      }
    });
  }

  private startPeriodicCheck(): void {
    const HOUR_IN_MS = 60 * 60 * 1000;
    this.updateCheckInterval = window.setInterval(() => {
      this.checkForUpdate();
    }, HOUR_IN_MS);
  }

  private async checkForUpdate(): Promise<void> {
    if (!this.registration) return;

    try {
      await this.registration.update();
    } catch {
      // Silent fail
    }
  }

  destroy(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
    }
  }
}

export const createPWAUpdater = (options?: PWAUpdateOptions): PWAUpdater => {
  return new PWAUpdater(options);
};

export default PWAUpdater;
