import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.royalcoffee.app',
  appName: 'Royalty Coffee',
  webDir: 'dist/app',
  // Server config: load from deployed Firebase Hosting in production,
  // or from local dev server during development.
  server: {
    // For production builds, comment out url so the app loads from webDir.
    // For development, uncomment the url below:
    // url: 'http://10.0.2.2:5173/app/',  // Android emulator
    // url: 'http://localhost:5173/app/',   // iOS simulator

    // NOTE: iosScheme/androidScheme "https" is silently rejected by Capacitor 8
    // because WKWebView/WebView natively handle https. The default scheme
    // (capacitor:// on iOS, http:// on Android) is correct and expected.
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ['google.com', 'apple.com'],
    },
    Keyboard: {
      resize: 'body' as unknown as undefined,
      style: 'dark' as unknown as undefined,
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'light' as unknown as undefined,
      backgroundColor: '#00000000',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#F4EDE4',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
  // iOS specific
  ios: {
    // 'never' = let CSS env(safe-area-inset-*) handle all spacing.
    // 'automatic' causes DOUBLE top inset (native + CSS).
    contentInset: 'never',
    scheme: 'Royalty Coffee',
    backgroundColor: '#F4EDE4',
  },
  // Android specific
  android: {
    backgroundColor: '#F4EDE4',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
};

export default config;
