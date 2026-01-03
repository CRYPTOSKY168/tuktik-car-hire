'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase/config';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { BookingStatus } from '@/lib/types';

interface TripData {
    id: string;
    pickupLocation: string;
    dropoffLocation: string;
    totalCost: number;
    status: string;
    createdAt: any;
    pickupCoordinates?: { lat: number; lng: number };
    dropoffCoordinates?: { lat: number; lng: number };
}

type FilterType = 'today' | 'week' | 'month' | 'all';

export default function DriverV2HistoryPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [driverId, setDriverId] = useState<string | null>(null);
    const [trips, setTrips] = useState<TripData[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>('today');
    const [totalEarnings, setTotalEarnings] = useState(0);

    // Auth check
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

            const dId = userData?.driverId;
            if (!dId) {
                router.replace('/driver/setup');
                return;
            }

            setDriverId(dId);
        });

        return () => unsubscribeAuth();
    }, [router]);

    // Fetch trips when driverId or filter changes
    useEffect(() => {
        if (!driverId || !db) return;

        const fetchTrips = async () => {
            setLoading(true);

            try {
                // Calculate date filter
                const now = new Date();
                let startDate: Date | null = null;

                switch (filter) {
                    case 'today':
                        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        break;
                    case 'week':
                        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        break;
                    case 'month':
                        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                        break;
                    case 'all':
                        startDate = null;
                        break;
                }

                // Query bookings
                let q;
                if (startDate) {
                    q = query(
                        collection(db!, 'bookings'),
                        where('driver.driverId', '==', driverId),
                        where('createdAt', '>=', startDate),
                        orderBy('createdAt', 'desc'),
                        limit(50)
                    );
                } else {
                    q = query(
                        collection(db!, 'bookings'),
                        where('driver.driverId', '==', driverId),
                        orderBy('createdAt', 'desc'),
                        limit(50)
                    );
                }

                const snapshot = await getDocs(q);
                const tripsData: TripData[] = [];
                let earnings = 0;

                snapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    tripsData.push({
                        id: docSnap.id,
                        pickupLocation: data.pickupLocation || 'Unknown',
                        dropoffLocation: data.dropoffLocation || 'Unknown',
                        totalCost: data.totalCost || 0,
                        status: data.status,
                        createdAt: data.createdAt,
                        pickupCoordinates: data.pickupCoordinates,
                        dropoffCoordinates: data.dropoffCoordinates,
                    });

                    // Calculate earnings for completed trips only
                    if (data.status === BookingStatus.COMPLETED) {
                        earnings += data.totalCost || 0;
                    }
                });

                setTrips(tripsData);
                setTotalEarnings(earnings);
            } catch (error) {
                console.error('Error fetching trips:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTrips();
    }, [driverId, filter]);

    // Format date
    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate?.() || new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const isYesterday = date.toDateString() === new Date(now.getTime() - 86400000).toDateString();

        if (isToday) {
            return `Today, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
        } else if (isYesterday) {
            return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
                ', ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }
    };

    // Get short location name
    const getShortLocation = (location: string) => {
        // Extract first part before comma or limit length
        const parts = location.split(',');
        return parts[0].length > 25 ? parts[0].substring(0, 25) + '...' : parts[0];
    };

    // Get status badge
    const getStatusBadge = (status: string) => {
        switch (status) {
            case BookingStatus.COMPLETED:
                return (
                    <div className="flex items-center gap-1.5 bg-[#00b250]/10 dark:bg-[#00b250]/20 px-3 py-1.5 rounded-full">
                        <span className="material-symbols-outlined text-[#00b250] text-[16px] font-bold">check</span>
                        <span className="text-[#00b250] text-xs font-bold uppercase tracking-wide">Completed</span>
                    </div>
                );
            case BookingStatus.CANCELLED:
                return (
                    <div className="flex items-center gap-1.5 bg-[#FFB300]/10 px-3 py-1.5 rounded-full">
                        <span className="material-symbols-outlined text-[#FFB300] text-[16px] font-bold">close</span>
                        <span className="text-[#FFB300] text-xs font-bold uppercase tracking-wide">Cancelled</span>
                    </div>
                );
            case BookingStatus.IN_PROGRESS:
                return (
                    <div className="flex items-center gap-1.5 bg-blue-500/10 px-3 py-1.5 rounded-full">
                        <span className="material-symbols-outlined text-blue-500 text-[16px] font-bold">directions_car</span>
                        <span className="text-blue-500 text-xs font-bold uppercase tracking-wide">In Progress</span>
                    </div>
                );
            default:
                return (
                    <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full">
                        <span className="material-symbols-outlined text-gray-500 text-[16px]">schedule</span>
                        <span className="text-gray-500 text-xs font-bold uppercase tracking-wide">{status.replace('_', ' ')}</span>
                    </div>
                );
        }
    };

    if (loading && trips.length === 0) {
        return (
            <div className="min-h-screen bg-[#f5f8f7] dark:bg-[#0f2318] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00b250]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f5f8f7] dark:bg-[#0f2318] text-[#101814] dark:text-gray-100 flex flex-col pb-24">
            {/* Top App Bar */}
            <header className="flex items-center justify-center bg-white dark:bg-[#1a2e22] p-4 pb-2 pt-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] z-20">
                <h2 className="text-[#101814] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">
                    Trip History
                </h2>
            </header>

            {/* Sticky Header: Earnings & Filters */}
            <div className="sticky top-0 z-10 bg-[#f5f8f7]/95 dark:bg-[#0f2318]/95 backdrop-blur-md transition-colors duration-200">
                {/* Total Earnings */}
                <div className="px-5 py-4">
                    <p className="text-[#5e8d73] dark:text-gray-400 text-sm font-medium leading-normal mb-1">
                        Total Earnings
                    </p>
                    <h2 className="text-[#101814] dark:text-white tracking-tight text-[32px] font-bold leading-tight">
                        ฿{totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h2>
                </div>

                {/* Filter Chips */}
                <div className="flex gap-3 px-5 pb-4 overflow-x-auto no-scrollbar items-center">
                    {(['today', 'week', 'month', 'all'] as FilterType[]).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full pl-5 pr-5 transition-all active:scale-95 ${
                                filter === f
                                    ? 'bg-[#00b250] shadow-lg shadow-[#00b250]/20'
                                    : 'bg-white dark:bg-[#1a2e22] border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#233b2e]'
                            }`}
                        >
                            <p className={`text-sm font-${filter === f ? 'semibold' : 'medium'} leading-normal ${
                                filter === f ? 'text-white' : 'text-[#101814] dark:text-gray-300'
                            }`}>
                                {f === 'today' ? 'Today' : f === 'week' ? 'This Week' : f === 'month' ? 'This Month' : 'All'}
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Trip List */}
            <div className="flex flex-col gap-4 px-4 pb-28 pt-2">
                {loading && (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00b250]"></div>
                    </div>
                )}

                {!loading && trips.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 px-4">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-gray-400 text-4xl">history</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">No trips yet</h3>
                        <p className="text-sm text-gray-400 dark:text-gray-500 text-center">
                            Your completed trips will appear here
                        </p>
                    </div>
                )}

                {trips.map((trip) => (
                    <div
                        key={trip.id}
                        className={`flex flex-col gap-3 rounded-[1.5rem] bg-white dark:bg-[#1a2e22] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-[0.99] transition-transform duration-200 ${
                            trip.status === BookingStatus.CANCELLED ? 'opacity-90' : ''
                        }`}
                    >
                        {/* Header Row */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 tracking-wide">
                                ID: #{trip.id.slice(-6).toUpperCase()}
                            </span>
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                {formatDate(trip.createdAt)}
                            </span>
                        </div>

                        {/* Route Visual */}
                        <div className="flex gap-4">
                            {/* Timeline */}
                            <div className="flex flex-col items-center pt-1.5 w-5 shrink-0">
                                <div className={`h-3 w-3 rounded-full border-2 ${
                                    trip.status === BookingStatus.CANCELLED
                                        ? 'border-gray-300 dark:border-gray-600'
                                        : 'border-[#00b250]'
                                } bg-white dark:bg-[#1a2e22] z-10`}></div>
                                <div className="w-[2px] h-full bg-gray-100 dark:bg-gray-700 -my-1"></div>
                                <span className={`material-symbols-outlined ${
                                    trip.status === BookingStatus.CANCELLED
                                        ? 'text-gray-300 dark:text-gray-600'
                                        : 'text-[#00b250]'
                                } text-[20px] z-10 bg-white dark:bg-[#1a2e22] rounded-full`}>
                                    location_on
                                </span>
                            </div>

                            {/* Addresses */}
                            <div className="flex flex-col gap-5 flex-1 pt-0.5">
                                <div className="flex flex-col gap-0.5">
                                    <p className={`text-sm font-medium leading-tight ${
                                        trip.status === BookingStatus.CANCELLED
                                            ? 'text-gray-500 dark:text-gray-400'
                                            : 'text-[#101814] dark:text-white'
                                    }`}>
                                        {getShortLocation(trip.pickupLocation)}
                                    </p>
                                    <p className="text-gray-400 dark:text-gray-500 text-xs">Pickup</p>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <p className={`text-sm font-medium leading-tight ${
                                        trip.status === BookingStatus.CANCELLED
                                            ? 'text-gray-500 dark:text-gray-400'
                                            : 'text-[#101814] dark:text-white'
                                    }`}>
                                        {getShortLocation(trip.dropoffLocation)}
                                    </p>
                                    <p className="text-gray-400 dark:text-gray-500 text-xs">Dropoff</p>
                                </div>
                            </div>
                        </div>

                        <div className="w-full h-px bg-gray-50 dark:bg-gray-800 my-1"></div>

                        {/* Footer Row */}
                        <div className="flex items-center justify-between">
                            {getStatusBadge(trip.status)}
                            <p className={`text-xl font-bold leading-tight ${
                                trip.status === BookingStatus.CANCELLED
                                    ? 'text-gray-400 dark:text-gray-600 line-through'
                                    : 'text-[#00b250]'
                            }`}>
                                ฿{trip.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Custom styles */}
            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
