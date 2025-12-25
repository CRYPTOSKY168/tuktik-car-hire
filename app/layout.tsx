import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/contexts/LanguageContext";
import { BookingProvider } from "@/lib/contexts/BookingContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  title: "TukTik Car Rental - Explore Thailand Your Way",
  description: "Premium car rental service for Thai tourists. Book your perfect vehicle for an unforgettable journey across Thailand.",
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
      </head>
      <body className={`${fontSans.className} antialiased bg-background-light`} suppressHydrationWarning>
        <LanguageProvider>
          <BookingProvider>
            <Header />
            <main className="min-h-screen">{children}</main>
            <Footer />
          </BookingProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
