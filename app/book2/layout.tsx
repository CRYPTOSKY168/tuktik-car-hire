'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/lib/contexts/LanguageContext';

export default function Book2Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { t } = useLanguage();

    // Pages that should hide bottom nav
    // Hide on: login, booking tracking, and main booking page (has its own bottom sheet)
    const hideNav = pathname?.includes('/login') || pathname?.includes('/booking/') || pathname === '/book2';

    const navItems = [
        { href: '/book2', icon: 'home', label: t.book2.nav.home },
        { href: '/book2/history', icon: 'assignment', label: t.book2.nav.history },
        { href: '/book2/profile', icon: 'person', label: t.book2.nav.profile },
    ];

    return (
        <div className="min-h-screen bg-[#f5f8f7] dark:bg-[#0f2318]">
            {children}

            {/* Bottom Navigation - Stitch Style */}
            {!hideNav && (
                <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#162e21] border-t border-[#dae7e0] dark:border-[#2a4a38] z-50 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                    <div className="flex justify-around items-center h-20 pb-4">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href ||
                                (item.href !== '/book2' && pathname?.startsWith(item.href));

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex flex-col items-center justify-center w-full h-full gap-0.5 transition-colors ${
                                        isActive
                                            ? 'text-primary'
                                            : 'text-[#5e8d73] hover:text-primary'
                                    }`}
                                >
                                    <span
                                        className="material-symbols-outlined text-[26px]"
                                        style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                                    >
                                        {item.icon}
                                    </span>
                                    <span className={`text-[11px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            )}

            {/* Safe area padding styles */}
            <style jsx global>{`
                .pb-safe {
                    padding-bottom: env(safe-area-inset-bottom, 20px);
                }
                .pt-safe {
                    padding-top: env(safe-area-inset-top, 0px);
                }
            `}</style>
        </div>
    );
}
