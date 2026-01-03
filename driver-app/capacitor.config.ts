import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tuktik.driver',
  appName: 'TukTik Driver',
  webDir: 'www',

  // Load from production URL - Driver Dashboard
  server: {
    url: 'https://car-rental-phi-lime.vercel.app/driver',
    cleartext: true,
  },

  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },

  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['phone', 'google.com'],
    },
  },
};

export default config;
