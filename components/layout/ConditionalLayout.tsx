'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import { Breadcrumb, BookingProgress } from '@/components/navigation';

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Don't show Header/Footer on admin, driver, and demo/test pages - they have their own layouts
    const isAdminPage = pathname?.startsWith('/admin');
    const isDriverPage = pathname?.startsWith('/driver');
    const isDemoPage = pathname?.startsWith('/vehicles-test');
    const isTestMapsPage = pathname?.startsWith('/test-maps');
    const isDemoDriverPage = pathname?.startsWith('/demo-driver');
    const isBookPage = pathname === '/book'; // Mobile app style - no header/footer

    if (isAdminPage || isDriverPage || isDemoPage || isTestMapsPage || isDemoDriverPage || isBookPage) {
        return <>{children}</>;
    }

    // Check if we're on a booking flow page (exclude success pages - they have their own layout)
    const isBookingFlow = ['/vehicles', '/payment', '/confirmation'].some(
        path => pathname?.startsWith(path)
    ) && !pathname?.includes('/success') && !pathname?.includes('/cancel');

    // Pages that should not show breadcrumb or have their own full layout
    const noBreadcrumb = ['/', '/login', '/register', '/payment/success', '/payment/cancel'].includes(pathname || '');

    return (
        <>
            <Header />
            <main className="min-h-screen">
                {/* Breadcrumb - shows on most pages except home, login, register */}
                {!noBreadcrumb && <Breadcrumb />}

                {/* Booking Progress - shows only on booking flow pages */}
                {isBookingFlow && <BookingProgress />}

                {/* Main Content */}
                <div className={noBreadcrumb ? 'pt-20 lg:pt-24' : ''}>
                    {children}
                </div>
            </main>
            <Footer />
        </>
    );
}
