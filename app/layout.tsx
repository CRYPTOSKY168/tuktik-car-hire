import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/contexts/LanguageContext";
import { BookingProvider } from "@/lib/contexts/BookingContext";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { CurrencyProvider } from '@/lib/contexts/CurrencyContext';
import { NotificationProvider } from '@/lib/contexts/NotificationContext';
import { ToastProvider } from '@/components/ui/Toast';
import { ConfigProvider } from '@/lib/contexts/ConfigContext';
import ConditionalLayout from "@/components/layout/ConditionalLayout";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import NotificationPermissionPrompt from "@/components/notifications/NotificationPermissionPrompt";
import CapacitorInit from "@/components/capacitor/CapacitorInit";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plus-jakarta",
});

// PWA Viewport configuration
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2563eb' },
    { media: '(prefers-color-scheme: dark)', color: '#1e3a8a' },
  ],
};

export const metadata: Metadata = {
  title: "TukTik - รถรับส่งสนามบิน",
  description: "บริการรถรับส่งสนามบินทั่วประเทศไทย จองง่าย ราคาคงที่ บริการ 24 ชม. Premium airport transfer service in Thailand.",

  // PWA Manifest
  manifest: '/manifest.json',

  // Apple PWA
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TukTik',
  },

  // Icons
  icons: {
    icon: [
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/icons/icon-512x512.svg', color: '#2563eb' },
    ],
  },

  // Open Graph
  openGraph: {
    title: 'TukTik - รถรับส่งสนามบิน',
    description: 'บริการรถรับส่งสนามบินทั่วประเทศไทย จองง่าย ราคาคงที่ บริการ 24 ชม.',
    url: 'https://car-rental-phi-lime.vercel.app',
    siteName: 'TukTik',
    locale: 'th_TH',
    type: 'website',
    images: [
      {
        url: '/icons/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'TukTik Logo',
      },
    ],
  },

  // Twitter
  twitter: {
    card: 'summary_large_image',
    title: 'TukTik - รถรับส่งสนามบิน',
    description: 'บริการรถรับส่งสนามบินทั่วประเทศไทย จองง่าย ราคาคงที่ บริการ 24 ชม.',
    images: ['/icons/icon-512x512.png'],
  },

  // Other
  applicationName: 'TukTik',
  keywords: ['รถรับส่งสนามบิน', 'airport transfer', 'taxi', 'thailand', 'travel', 'booking'],
  authors: [{ name: 'TukTik' }],
  creator: 'TukTik',
  publisher: 'TukTik',
  formatDetection: {
    telephone: true,
    email: true,
    address: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

        {/* Additional PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="TukTik" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-tap-highlight" content="no" />

        {/* Splash Screens for iOS */}
        <link rel="apple-touch-startup-image" href="/icons/icon-512x512.png" />
      </head>
      <body className={`${fontSans.className} antialiased bg-background-light`} suppressHydrationWarning>
        <AuthProvider>
          <ConfigProvider>
            <LanguageProvider>
              <CurrencyProvider>
                <BookingProvider>
                  <NotificationProvider>
                    <ToastProvider>
                    <ConditionalLayout>
                      {children}
                    </ConditionalLayout>

                    {/* PWA Components */}
                    <InstallPrompt />
                    <NotificationPermissionPrompt />

                    {/* Capacitor Native Push Notifications */}
                    <CapacitorInit />
                  </ToastProvider>
                  </NotificationProvider>
                </BookingProvider>
              </CurrencyProvider>
            </LanguageProvider>
          </ConfigProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
