import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/contexts/LanguageContext";
import { BookingProvider } from "@/lib/contexts/BookingContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
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
      <body className={`${inter.className} antialiased`}>
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
