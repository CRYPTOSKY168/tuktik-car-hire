import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tuktik.app',
  appName: 'TukTik',
  webDir: 'out', // สำหรับ static export (ถ้าใช้)
  server: {
    // ใช้ WebView URL เพื่อรองรับ API routes ของ Next.js
    url: 'https://car-rental-phi-lime.vercel.app',
    cleartext: true, // สำหรับ development
  },
  plugins: {
    PushNotifications: {
      // Firebase Cloud Messaging
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    FirebaseAuthentication: {
      // Enable phone and Google authentication
      skipNativeAuth: false,
      providers: ['phone', 'google.com'],
    },
  },
  android: {
    // Android-specific settings
    buildOptions: {
      keystorePath: undefined, // จะตั้งค่าตอน build release
      keystoreAlias: undefined,
    },
  },
};

export default config;
