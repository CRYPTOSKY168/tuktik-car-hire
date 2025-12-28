'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { FirestoreService } from '@/lib/firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import NotificationBell from '@/components/notifications/NotificationBell';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const { t } = useLanguage();
    const router = useRouter();
    const pathname = usePathname();
    const [isAdmin, setIsAdmin] = useState(false);
    const [checkingRole, setCheckingRole] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const checkAdmin = async () => {
            if (!loading) {
                if (!user) {
                    router.push('/login');
                    return;
                }

                try {
                    const userData = await FirestoreService.getUser(user.uid);
                    if (userData?.role === 'admin') {
                        setIsAdmin(true);
                    } else {
                        router.push('/dashboard');
                    }
                } catch (error) {
                    console.error("Admin check failed", error);
                    router.push('/dashboard');
                } finally {
                    setCheckingRole(false);
                }
            }
        };

        checkAdmin();
    }, [user, loading, router]);

    // Close mobile sidebar when route changes
    useEffect(() => {
        setSidebarOpen(false);
        setProfileDropdownOpen(false);
    }, [pathname]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setProfileDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            if (auth) {
                await signOut(auth);
                router.push('/login');
            }
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    if (loading || checkingRole) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
                        <div className="w-16 h-16 border-4 border-blue-600 rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
                    </div>
                    <p className="text-blue-600 font-semibold">Verifying Access...</p>
                </div>
            </div>
        );
    }

    if (!isAdmin) return null;

    const menuItems = [
        { id: 'dashboard', label: t.admin.menu.dashboard, icon: 'dashboard', href: '/admin' },
        { id: 'bookings', label: t.admin.menu.bookings, icon: 'receipt_long', href: '/admin/bookings' },
        { id: 'drivers', label: 'Drivers', icon: 'badge', href: '/admin/drivers' },
        { id: 'customers', label: 'Customers', icon: 'group', href: '/admin/customers' },
        { id: 'members', label: 'Members', icon: 'person', href: '/admin/members' },
        { id: 'vehicles', label: t.admin.menu.vehicles, icon: 'directions_car', href: '/admin/vehicles' },
        { id: 'locations', label: 'Locations', icon: 'location_on', href: '/admin/locations' },
        { id: 'routes', label: 'Route Pricing', icon: 'route', href: '/admin/routes' },
    ];

    const secondaryMenuItems = [
        { id: 'settings', label: 'Settings', icon: 'settings', href: '/admin/settings' },
    ];

    return (
        <div className="min-h-screen bg-[#f0f4f8]">
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed top-0 left-0 h-full z-50 bg-white shadow-2xl
                transition-all duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:translate-x-0
                ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-72'}
                w-72
            `}>
                {/* Sidebar Header */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
                    <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'lg:justify-center lg:w-full' : ''}`}>
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <span className="material-symbols-outlined text-white text-xl">account_balance</span>
                        </div>
                        {!sidebarCollapsed && (
                            <div className="lg:block">
                                <h1 className="text-lg font-bold text-gray-800">TukTik</h1>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Admin Portal</p>
                            </div>
                        )}
                    </div>
                    {/* Collapse Button - Desktop Only */}
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">
                            {sidebarCollapsed ? 'chevron_right' : 'chevron_left'}
                        </span>
                    </button>
                    {/* Close Button - Mobile Only */}
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Main Navigation */}
                <nav className="p-3 space-y-1">
                    <p className={`text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3 ${sidebarCollapsed ? 'lg:text-center' : 'px-3'}`}>
                        {sidebarCollapsed ? '•••' : 'Main Menu'}
                    </p>
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                className={`
                                    flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                                    ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}
                                    ${isActive
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                                        : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                                    }
                                `}
                                title={sidebarCollapsed ? item.label : undefined}
                            >
                                <span className={`material-symbols-outlined ${isActive ? 'text-white' : ''}`}>
                                    {item.icon}
                                </span>
                                {!sidebarCollapsed && (
                                    <span className="font-medium text-sm">{item.label}</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Secondary Navigation */}
                <nav className="p-3 space-y-1 mt-4">
                    <p className={`text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3 ${sidebarCollapsed ? 'lg:text-center' : 'px-3'}`}>
                        {sidebarCollapsed ? '•••' : 'System'}
                    </p>
                    {secondaryMenuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                className={`
                                    flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                                    ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}
                                    ${isActive
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                                    }
                                `}
                                title={sidebarCollapsed ? item.label : undefined}
                            >
                                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                                {!sidebarCollapsed && (
                                    <span className="font-medium text-sm">{item.label}</span>
                                )}
                            </Link>
                        );
                    })}

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className={`
                            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                            text-red-500 hover:bg-red-50 hover:text-red-600
                            ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}
                        `}
                        title={sidebarCollapsed ? 'Logout' : undefined}
                    >
                        <span className="material-symbols-outlined text-xl">logout</span>
                        {!sidebarCollapsed && (
                            <span className="font-medium text-sm">Logout</span>
                        )}
                    </button>
                </nav>

                {/* User Profile Section */}
                <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-100 bg-gray-50/50">
                    <div className={`
                        flex items-center gap-3 p-2 rounded-xl hover:bg-white transition-colors
                        ${sidebarCollapsed ? 'lg:justify-center' : ''}
                    `}>
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                {user?.displayName?.charAt(0) || 'A'}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                        {!sidebarCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{user?.displayName || 'Admin'}</p>
                                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Top Header Bar */}
            <header className={`
                fixed top-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 z-30
                transition-all duration-300
                ${sidebarCollapsed ? 'lg:left-20' : 'lg:left-72'}
                left-0
            `}>
                <div className="h-full flex items-center justify-between px-4 lg:px-6">
                    {/* Left: Mobile Menu Button + Page Title */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                        <div className="hidden sm:block">
                            <p className="text-xs text-gray-400">Welcome back,</p>
                            <h2 className="text-sm font-semibold text-gray-800">{user?.displayName || 'Administrator'}</h2>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                        {/* Notifications */}
                        <NotificationBell isAdmin={true} />

                        {/* Divider */}
                        <div className="hidden md:block w-px h-8 bg-gray-200 mx-2"></div>

                        {/* Profile Quick Access with Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs">
                                    {user?.displayName?.charAt(0) || 'A'}
                                </div>
                                <span className="hidden md:block text-sm font-medium text-gray-700">{user?.displayName?.split(' ')[0] || 'Admin'}</span>
                                <span className={`material-symbols-outlined text-gray-400 text-lg transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`}>
                                    expand_more
                                </span>
                            </button>

                            {/* Dropdown Menu */}
                            {profileDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                                    <div className="px-4 py-3 border-b border-gray-100">
                                        <p className="text-sm font-semibold text-gray-800">{user?.displayName || 'Admin'}</p>
                                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                    </div>

                                    <div className="py-1">
                                        <Link
                                            href="/admin/settings"
                                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-lg text-gray-400">settings</span>
                                            Settings
                                        </Link>
                                        <Link
                                            href="/dashboard"
                                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-lg text-gray-400">swap_horiz</span>
                                            Switch to Customer
                                        </Link>
                                    </div>

                                    <div className="border-t border-gray-100 pt-1">
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-lg">logout</span>
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className={`
                transition-all duration-300 pt-16
                ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'}
            `}>
                <div className="p-4 lg:p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
