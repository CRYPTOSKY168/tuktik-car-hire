'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, getDoc, query, collection, where, getDocs, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';

interface DriverData {
    id: string;
    name: string;
    phone: string;
    email?: string;
    vehiclePlate?: string;
    vehicleModel?: string;
    vehicleColor?: string;
    status: 'available' | 'busy' | 'offline';
}

export default function DriverLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [driver, setDriver] = useState<DriverData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth) {
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            // Skip auth check for login page
            if (pathname === '/driver/login') {
                setLoading(false);
                return;
            }

            if (!currentUser) {
                router.push('/driver/login');
                return;
            }

            setUser(currentUser);

            try {
                // Get user data from Firestore
                const userDoc = await getDoc(doc(db!, 'users', currentUser.uid));
                const userData = userDoc.data();

                // Check if approved driver
                if (!userData?.isApprovedDriver) {
                    router.push('/driver/login');
                    return;
                }

                // Check if has driver profile with vehicle info
                if (userData.driverId) {
                    const driverDoc = await getDoc(doc(db!, 'drivers', userData.driverId));
                    if (driverDoc.exists()) {
                        const driverData = driverDoc.data();

                        // Check if driver setup is approved
                        if (driverData.setupStatus === 'pending_review') {
                            router.push('/driver/pending');
                            return;
                        }

                        // If rejected, redirect to setup for re-submission
                        if (driverData.setupStatus === 'rejected') {
                            router.push('/driver/setup');
                            return;
                        }

                        setDriver({
                            id: driverDoc.id,
                            name: driverData.name,
                            phone: driverData.phone,
                            email: driverData.email,
                            vehiclePlate: driverData.vehiclePlate,
                            vehicleModel: driverData.vehicleModel,
                            vehicleColor: driverData.vehicleColor,
                            status: driverData.status || 'offline',
                        });
                        setLoading(false);
                        return;
                    }
                }

                // Check by userId in drivers collection
                const driversQuery = query(
                    collection(db!, 'drivers'),
                    where('userId', '==', currentUser.uid)
                );
                const driversSnap = await getDocs(driversQuery);

                if (!driversSnap.empty) {
                    const driverDoc = driversSnap.docs[0];
                    const driverData = driverDoc.data();

                    // Check if driver setup is approved
                    if (driverData.setupStatus === 'pending_review') {
                        router.push('/driver/pending');
                        return;
                    }

                    // If rejected, redirect to setup for re-submission
                    if (driverData.setupStatus === 'rejected') {
                        router.push('/driver/setup');
                        return;
                    }

                    setDriver({
                        id: driverDoc.id,
                        name: driverData.name,
                        phone: driverData.phone,
                        email: driverData.email,
                        vehiclePlate: driverData.vehiclePlate,
                        vehicleModel: driverData.vehicleModel,
                        vehicleColor: driverData.vehicleColor,
                        status: driverData.status || 'offline',
                    });
                    setLoading(false);
                } else if (pathname !== '/driver/setup') {
                    // No driver profile, redirect to setup (unless already on setup page)
                    router.push('/driver/setup');
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error('Error loading driver data:', err);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [pathname, router]);

    const handleLogout = async () => {
        if (auth) {
            await signOut(auth);
        }
        router.push('/driver/login');
    };

    // Skip layout for login, setup, and pending pages
    if (pathname === '/driver/login' || pathname === '/driver/setup' || pathname === '/driver/pending') {
        return <>{children}</>;
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-white/20 rounded-full"></div>
                        <div className="w-16 h-16 border-4 border-white rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
                    </div>
                    <p className="text-white font-medium">กำลังโหลด...</p>
                </div>
            </div>
        );
    }

    if (!driver) {
        return null; // Will redirect
    }

    const navItems = [
        { id: 'home', icon: 'home', label: 'หน้าหลัก', href: '/driver' },
        { id: 'history', icon: 'history', label: 'ประวัติ', href: '/driver/history' },
        { id: 'profile', icon: 'person', label: 'โปรไฟล์', href: '/driver/profile' },
    ];

    return (
        <div className="min-h-screen bg-gray-100 pb-20">
            {/* Top Header */}
            <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-4 sticky top-0 z-40">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined">local_taxi</span>
                        </div>
                        <div>
                            <h1 className="font-bold">TukTik Driver</h1>
                            <p className="text-xs text-white/70">{driver.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Status indicator */}
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            driver.status === 'available' ? 'bg-green-500/20 text-green-200' :
                            driver.status === 'busy' ? 'bg-yellow-500/20 text-yellow-200' :
                            'bg-gray-500/20 text-gray-300'
                        }`}>
                            {driver.status === 'available' ? 'ว่าง' :
                             driver.status === 'busy' ? 'กำลังทำงาน' : 'ออฟไลน์'}
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                        >
                            <span className="material-symbols-outlined text-xl">logout</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="p-4">
                {children}
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
                <div className="flex justify-around py-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/driver' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                className={`flex flex-col items-center py-2 px-4 rounded-xl transition-colors ${
                                    isActive
                                        ? 'text-indigo-600'
                                        : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                <span className={`material-symbols-outlined text-2xl ${isActive ? 'font-bold' : ''}`}>
                                    {item.icon}
                                </span>
                                <span className="text-xs font-medium mt-1">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
