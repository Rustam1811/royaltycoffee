import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.royalcoffee.app',
  appName: 'Royal Coffee',
  webDir: 'dist/app',
  // Server config: load from deployed Firebase Hosting in production,
  // or from local dev server during development.
  server: {
    // For production builds, comment out url so the app loads from webDir.
    // For development, uncomment the url below:
    // url: 'http://10.0.2.2:5173/app/',  // Android emulator
    // url: 'http://localhost:5173/app/',   // iOS simulator
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resize: 'body' as unknown as undefined,
      style: 'dark' as unknown as undefined,
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1E3A5F',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1E3A5F',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
  // iOS specific
  ios: {
    contentInset: 'automatic',
    scheme: 'Royal Coffee',
    backgroundColor: '#1E3A5F',
  },
  // Android specific
  android: {
    backgroundColor: '#1E3A5F',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // set true for dev
  },
};

export default config;
