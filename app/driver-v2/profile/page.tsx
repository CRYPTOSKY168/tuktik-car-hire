'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase/config';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

interface DriverData {
    id: string;
    name: string;
    phone: string;
    vehiclePlate?: string;
    vehicleModel?: string;
    vehicleColor?: string;
    status: string;
    photo?: string;
    rating?: number;
    ratingCount?: number;
    totalTrips?: number;
    totalEarnings?: number;
    createdAt?: any;
}

export default function DriverV2ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [driver, setDriver] = useState<DriverData | null>(null);
    const [loading, setLoading] = useState(true);

    // Auth + Driver data
    useEffect(() => {
        if (!auth) {
            router.replace('/driver-v2/login');
            return;
        }

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (!firebaseUser) {
                router.replace('/driver-v2/login');
                return;
            }
            setUser(firebaseUser);

            // Get user doc to find driverId
            const userDoc = await getDoc(doc(db!, 'users', firebaseUser.uid));
            const userData = userDoc.data();

            if (!userData?.isApprovedDriver) {
                router.replace('/driver/pending');
                return;
            }

            const driverId = userData?.driverId;
            if (!driverId) {
                router.replace('/driver/setup');
                return;
            }

            // Subscribe to driver doc for real-time updates
            const unsubscribeDriver = onSnapshot(
                doc(db!, 'drivers', driverId),
                (docSnap) => {
                    if (docSnap.exists()) {
                        setDriver({ id: docSnap.id, ...docSnap.data() } as DriverData);
                    }
                    setLoading(false);
                }
            );

            return () => unsubscribeDriver();
        });

        return () => unsubscribeAuth();
    }, [router]);

    const handleLogout = async () => {
        if (!auth) return;
        try {
            await signOut(auth);
            router.replace('/driver-v2/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    // Calculate member since
    const getMemberSince = () => {
        if (!driver?.createdAt) return '-';
        const createdAt = driver.createdAt.toDate?.() || new Date(driver.createdAt);
        const now = new Date();
        const years = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 365));
        const months = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30));
        if (years >= 1) return `${years} Year${years > 1 ? 's' : ''}`;
        if (months >= 1) return `${months} Month${months > 1 ? 's' : ''}`;
        return 'New';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f5f8f7] dark:bg-[#0f2318] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00b250]"></div>
            </div>
        );
    }

    const photoURL = driver?.photo || user?.photoURL || null;

    return (
        <div className="relative flex min-h-screen w-full flex-col pb-24 overflow-x-hidden">
            {/* Top App Bar */}
            <header className="sticky top-0 z-50 bg-[#f5f8f7]/95 dark:bg-[#0f2318]/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
                <Link
                    href="/driver-v2"
                    className="flex size-10 items-center justify-center rounded-full active:bg-black/5 dark:active:bg-white/10 transition-colors cursor-pointer"
                >
                    <span className="material-symbols-outlined text-[#101814] dark:text-white">arrow_back</span>
                </Link>
                <h1 className="text-lg font-bold tracking-tight text-center flex-1">Profile</h1>
                <div className="size-10"></div>
            </header>

            {/* Profile Header */}
            <section className="flex flex-col items-center pt-2 pb-6 px-4">
                <div className="relative group cursor-pointer">
                    {photoURL ? (
                        <div
                            className="w-24 h-24 rounded-full bg-cover bg-center border-4 border-white dark:border-[#1a2e24] shadow-lg mb-4"
                            style={{ backgroundImage: `url('${photoURL}')` }}
                        />
                    ) : (
                        <div className="w-24 h-24 rounded-full bg-[#00b250]/20 border-4 border-white dark:border-[#1a2e24] shadow-lg mb-4 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#00b250] text-4xl">person</span>
                        </div>
                    )}
                    {/* Verified Badge */}
                    <div className="absolute bottom-4 right-0 bg-white dark:bg-[#1a2e24] rounded-full p-1 shadow-sm">
                        <span
                            className="material-symbols-outlined text-[#00b250] text-[20px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                            verified
                        </span>
                    </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <h2 className="text-2xl font-bold text-[#101814] dark:text-white">
                        {driver?.name || user?.displayName || 'Driver'}
                    </h2>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-[#1a2e24] rounded-full border border-[#dae7e0] dark:border-[#2a4e3b] shadow-sm">
                        <span
                            className="material-symbols-outlined text-[#FFB300] text-[16px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                            star
                        </span>
                        <span className="text-sm font-semibold">{driver?.rating?.toFixed(1) || '-'}</span>
                        <span className="text-xs text-[#5e8d73] dark:text-[#a0cbb5]">
                            ({driver?.ratingCount || 0} trips)
                        </span>
                    </div>
                </div>
            </section>

            {/* Stats Grid */}
            <section className="px-4 pb-6">
                <div className="grid grid-cols-2 gap-3">
                    {/* Total Trips */}
                    <div className="bg-white dark:bg-[#1a2e24] p-4 rounded-xl shadow-sm border border-[#dae7e0] dark:border-[#2a4e3b] flex flex-col gap-1">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 rounded-full bg-[#00b250]/10 dark:bg-[#00b250]/20 text-[#00b250]">
                                <span className="material-symbols-outlined text-[20px]">directions_car</span>
                            </div>
                            <span className="text-xs font-medium text-[#5e8d73] dark:text-[#a0cbb5]">Total Trips</span>
                        </div>
                        <p className="text-xl font-bold">{driver?.totalTrips?.toLocaleString() || '0'}</p>
                    </div>

                    {/* Earnings */}
                    <div className="bg-white dark:bg-[#1a2e24] p-4 rounded-xl shadow-sm border border-[#dae7e0] dark:border-[#2a4e3b] flex flex-col gap-1">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 rounded-full bg-[#FFB300]/10 dark:bg-[#FFB300]/20 text-[#FFB300]">
                                <span className="material-symbols-outlined text-[20px]">payments</span>
                            </div>
                            <span className="text-xs font-medium text-[#5e8d73] dark:text-[#a0cbb5]">Earnings</span>
                        </div>
                        <p className="text-xl font-bold text-[#00b250]">
                            ฿{driver?.totalEarnings?.toLocaleString() || '0'}
                        </p>
                    </div>

                    {/* Avg Rating */}
                    <div className="bg-white dark:bg-[#1a2e24] p-4 rounded-xl shadow-sm border border-[#dae7e0] dark:border-[#2a4e3b] flex flex-col gap-1">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                                <span className="material-symbols-outlined text-[20px]">thumb_up</span>
                            </div>
                            <span className="text-xs font-medium text-[#5e8d73] dark:text-[#a0cbb5]">Avg Rating</span>
                        </div>
                        <p className="text-xl font-bold">{driver?.rating?.toFixed(1) || '-'}</p>
                    </div>

                    {/* Member Since */}
                    <div className="bg-white dark:bg-[#1a2e24] p-4 rounded-xl shadow-sm border border-[#dae7e0] dark:border-[#2a4e3b] flex flex-col gap-1">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                <span className="material-symbols-outlined text-[20px]">badge</span>
                            </div>
                            <span className="text-xs font-medium text-[#5e8d73] dark:text-[#a0cbb5]">Experience</span>
                        </div>
                        <p className="text-xl font-bold">{getMemberSince()}</p>
                    </div>
                </div>
            </section>

            {/* Vehicle Info */}
            <section className="px-4 pb-6">
                <h3 className="text-lg font-bold mb-3 px-1">Vehicle Info</h3>
                <div className="bg-white dark:bg-[#1a2e24] p-4 rounded-xl shadow-sm border border-[#dae7e0] dark:border-[#2a4e3b] flex justify-between items-center gap-4">
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                        <div>
                            <p className="text-sm font-semibold text-[#00b250] mb-0.5">Active Vehicle</p>
                            <h4 className="text-base font-bold truncate">
                                {driver?.vehicleModel || 'Not set'}
                            </h4>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="px-2 py-1 rounded bg-[#f5f8f7] dark:bg-[#0f2318] border border-[#dae7e0] dark:border-[#2a4e3b]">
                                <p className="text-xs font-mono font-bold text-[#101814] dark:text-white">
                                    {driver?.vehiclePlate || '-'}
                                </p>
                            </div>
                            {driver?.vehicleColor && (
                                <div
                                    className="w-5 h-5 rounded-full border border-gray-300 shadow-inner"
                                    title={driver.vehicleColor}
                                    style={{
                                        backgroundColor:
                                            driver.vehicleColor.toLowerCase() === 'white' ? '#f5f5f5' :
                                            driver.vehicleColor.toLowerCase() === 'black' ? '#1a1a1a' :
                                            driver.vehicleColor.toLowerCase() === 'silver' ? '#c0c0c0' :
                                            driver.vehicleColor.toLowerCase() === 'red' ? '#dc2626' :
                                            driver.vehicleColor.toLowerCase() === 'blue' ? '#2563eb' :
                                            '#9ca3af'
                                    }}
                                />
                            )}
                        </div>
                    </div>
                    <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg flex-shrink-0 flex items-center justify-center">
                        <span className="material-symbols-outlined text-gray-400 text-4xl">directions_car</span>
                    </div>
                </div>
            </section>

            {/* Menu Items */}
            <section className="px-4 flex flex-col gap-3">
                {/* Trip History */}
                <Link
                    href="/driver-v2/history"
                    className="w-full bg-white dark:bg-[#1a2e24] p-4 rounded-xl shadow-sm border border-[#dae7e0] dark:border-[#2a4e3b] flex items-center justify-between active:scale-[0.99] transition-transform"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-[#00b250]/10 dark:bg-[#00b250]/20 text-[#00b250]">
                            <span className="material-symbols-outlined">history</span>
                        </div>
                        <span className="font-medium text-[#101814] dark:text-white">Trip History</span>
                    </div>
                    <span className="material-symbols-outlined text-[#5e8d73] dark:text-[#a0cbb5]">chevron_right</span>
                </Link>

                {/* Earnings Report */}
                <button className="w-full bg-white dark:bg-[#1a2e24] p-4 rounded-xl shadow-sm border border-[#dae7e0] dark:border-[#2a4e3b] flex items-center justify-between active:scale-[0.99] transition-transform">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-[#FFB300]/10 dark:bg-[#FFB300]/20 text-[#FFB300]">
                            <span className="material-symbols-outlined">analytics</span>
                        </div>
                        <span className="font-medium text-[#101814] dark:text-white">Earnings Report</span>
                    </div>
                    <span className="material-symbols-outlined text-[#5e8d73] dark:text-[#a0cbb5]">chevron_right</span>
                </button>

                {/* Documents */}
                <button className="w-full bg-white dark:bg-[#1a2e24] p-4 rounded-xl shadow-sm border border-[#dae7e0] dark:border-[#2a4e3b] flex items-center justify-between active:scale-[0.99] transition-transform">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                            <span className="material-symbols-outlined">folder_shared</span>
                        </div>
                        <span className="font-medium text-[#101814] dark:text-white">Documents</span>
                    </div>
                    <span className="material-symbols-outlined text-[#5e8d73] dark:text-[#a0cbb5]">chevron_right</span>
                </button>

                {/* Settings */}
                <button className="w-full bg-white dark:bg-[#1a2e24] p-4 rounded-xl shadow-sm border border-[#dae7e0] dark:border-[#2a4e3b] flex items-center justify-between active:scale-[0.99] transition-transform">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                            <span className="material-symbols-outlined">settings</span>
                        </div>
                        <span className="font-medium text-[#101814] dark:text-white">Settings</span>
                    </div>
                    <span className="material-symbols-outlined text-[#5e8d73] dark:text-[#a0cbb5]">chevron_right</span>
                </button>

                {/* Help Center */}
                <button className="w-full bg-white dark:bg-[#1a2e24] p-4 rounded-xl shadow-sm border border-[#dae7e0] dark:border-[#2a4e3b] flex items-center justify-between active:scale-[0.99] transition-transform">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                            <span className="material-symbols-outlined">help</span>
                        </div>
                        <span className="font-medium text-[#101814] dark:text-white">Help Center</span>
                    </div>
                    <span className="material-symbols-outlined text-[#5e8d73] dark:text-[#a0cbb5]">chevron_right</span>
                </button>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="w-full bg-white dark:bg-[#1a2e24] p-4 rounded-xl shadow-sm border border-red-200 dark:border-red-900/50 flex items-center justify-between active:scale-[0.99] transition-transform mt-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                            <span className="material-symbols-outlined">logout</span>
                        </div>
                        <span className="font-medium text-red-600 dark:text-red-400">Logout</span>
                    </div>
                    <span className="material-symbols-outlined text-red-400">chevron_right</span>
                </button>
            </section>
        </div>
    );
}
