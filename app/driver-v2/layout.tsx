'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function DriverV2Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    // Pages that should hide bottom nav (login, setup, etc.)
    const hideNav = pathname?.includes('/login') || pathname?.includes('/setup');

    const navItems = [
        { href: '/driver-v2', icon: 'home', label: 'Home', labelTh: 'หน้าหลัก' },
        { href: '/driver-v2/history', icon: 'assignment', label: 'History', labelTh: 'ประวัติ' },
        { href: '/driver-v2/profile', icon: 'person', label: 'Profile', labelTh: 'โปรไฟล์' },
    ];

    return (
        <div className="h-screen flex flex-col bg-[#f5f8f7] dark:bg-[#0f2318] overflow-hidden">
            <div className="flex-1 overflow-hidden">
                {children}
            </div>

            {/* Bottom Navigation */}
            {!hideNav && (
                <nav className="shrink-0 bg-white dark:bg-[#1a2e22] border-t border-gray-100 dark:border-gray-800 z-50 pb-safe">
                    <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href ||
                                (item.href !== '/driver-v2' && pathname?.startsWith(item.href));

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                                        isActive
                                            ? 'text-[#00b250]'
                                            : 'text-gray-400 hover:text-[#00b250]'
                                    }`}
                                >
                                    <span
                                        className="material-symbols-outlined text-[26px]"
                                        style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                                    >
                                        {item.icon}
                                    </span>
                                    <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>
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
