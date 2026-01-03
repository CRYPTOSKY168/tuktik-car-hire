'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase/config';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { BookingStatus } from '@/lib/types';

interface TripData {
    id: string;
    pickupLocation: string;
    dropoffLocation: string;
    totalCost: number;
    status: string;
    createdAt: any;
}

type FilterType = 'all' | 'completed' | 'cancelled';

export default function Book2HistoryPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [trips, setTrips] = useState<TripData[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>('all');

    // Auth check
    useEffect(() => {
        if (!auth) {
            router.replace('/login?redirect=/book2/history');
            return;
        }

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (!firebaseUser) {
                router.replace('/login?redirect=/book2/history');
                return;
            }
            setUser(firebaseUser);
        });

        return () => unsubscribeAuth();
    }, [router]);

    // Fetch trips
    useEffect(() => {
        if (!user || !db) return;

        const fetchTrips = async () => {
            setLoading(true);
            try {
                const q = query(
                    collection(db!, 'bookings'),
                    where('userId', '==', user.uid),
                    orderBy('createdAt', 'desc'),
                    limit(50)
                );

                const snapshot = await getDocs(q);
                const tripsData: TripData[] = [];

                snapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    tripsData.push({
                        id: docSnap.id,
                        pickupLocation: data.pickupLocation || 'Unknown',
                        dropoffLocation: data.dropoffLocation || 'Unknown',
                        totalCost: data.totalCost || 0,
                        status: data.status,
                        createdAt: data.createdAt,
                    });
                });

                setTrips(tripsData);
            } catch (error) {
                console.error('Error fetching trips:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTrips();
    }, [user]);

    // Filter trips
    const filteredTrips = trips.filter((trip) => {
        if (filter === 'all') return true;
        if (filter === 'completed') return trip.status === BookingStatus.COMPLETED;
        if (filter === 'cancelled') return trip.status === BookingStatus.CANCELLED;
        return true;
    });

    // Format date
    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate?.() || new Date(timestamp);
        return date.toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }) + ', ' + date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    };

    if (loading && trips.length === 0) {
        return (
            <div className="min-h-screen bg-[#f5f8f7] dark:bg-[#0f2318] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00b250]"></div>
            </div>
        );
    }

    return (
        <div className="w-full relative min-h-screen flex flex-col bg-[#f5f8f7] dark:bg-[#0f2318]">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-[#f5f8f7]/95 dark:bg-[#0f2318]/95 backdrop-blur-md border-b border-[#dae7e0] dark:border-[#2a4a38] px-4 pt-4 pb-2">
                <div className="flex items-center justify-between h-12">
                    <Link
                        href="/book2"
                        className="flex items-center justify-center size-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[#101814] dark:text-white">arrow_back</span>
                    </Link>
                    <h1 className="text-lg font-bold flex-1 text-center text-[#101814] dark:text-white">ประวัติการเดินทาง</h1>
                    <button className="flex items-center justify-center px-2 py-1 rounded-full hover:bg-[#00b250]/10 transition-colors">
                        <span className="text-[#00b250] text-sm font-bold">ช่วยเหลือ</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="mt-2 flex gap-4 px-2">
                    <button
                        onClick={() => setFilter('all')}
                        className="flex-1 relative pb-3 group"
                    >
                        <span className={`text-sm block text-center ${
                            filter === 'all' ? 'text-[#00b250] font-bold' : 'text-[#5e8d73] font-medium group-hover:text-[#00b250]'
                        } transition-colors`}>
                            ทั้งหมด
                        </span>
                        <div className={`absolute bottom-0 left-0 w-full h-[3px] rounded-t-full transition-colors ${
                            filter === 'all' ? 'bg-[#00b250]' : 'bg-transparent group-hover:bg-[#00b250]/30'
                        }`} />
                    </button>
                    <button
                        onClick={() => setFilter('completed')}
                        className="flex-1 relative pb-3 group"
                    >
                        <span className={`text-sm block text-center ${
                            filter === 'completed' ? 'text-[#00b250] font-bold' : 'text-[#5e8d73] font-medium group-hover:text-[#00b250]'
                        } transition-colors`}>
                            สำเร็จ
                        </span>
                        <div className={`absolute bottom-0 left-0 w-full h-[3px] rounded-t-full transition-colors ${
                            filter === 'completed' ? 'bg-[#00b250]' : 'bg-transparent group-hover:bg-[#00b250]/30'
                        }`} />
                    </button>
                    <button
                        onClick={() => setFilter('cancelled')}
                        className="flex-1 relative pb-3 group"
                    >
                        <span className={`text-sm block text-center ${
                            filter === 'cancelled' ? 'text-[#00b250] font-bold' : 'text-[#5e8d73] font-medium group-hover:text-[#00b250]'
                        } transition-colors`}>
                            ยกเลิก
                        </span>
                        <div className={`absolute bottom-0 left-0 w-full h-[3px] rounded-t-full transition-colors ${
                            filter === 'cancelled' ? 'bg-[#00b250]' : 'bg-transparent group-hover:bg-[#00b250]/30'
                        }`} />
                    </button>
                </div>
            </header>

            {/* Content List */}
            <main className="flex-1 px-4 py-6 space-y-4 pb-24">
                {loading && (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00b250]"></div>
                    </div>
                )}

                {!loading && filteredTrips.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="size-32 bg-[#dae7e0] rounded-full mb-4 flex items-center justify-center">
                            <span className="material-symbols-outlined text-6xl text-[#5e8d73]">commute</span>
                        </div>
                        <h3 className="text-lg font-bold text-[#101814] mb-1">ยังไม่มีประวัติการเดินทาง</h3>
                        <p className="text-sm text-[#5e8d73]">เมื่อคุณเริ่มใช้บริการ ประวัติการเดินทางจะปรากฏที่นี่</p>
                    </div>
                )}

                {filteredTrips.map((trip) => {
                    const isCompleted = trip.status === BookingStatus.COMPLETED;
                    const isCancelled = trip.status === BookingStatus.CANCELLED;

                    return (
                        <article
                            key={trip.id}
                            className={`bg-white rounded-xl border border-[#dae7e0] shadow-sm overflow-hidden group cursor-pointer hover:shadow-md transition-shadow ${
                                isCancelled ? 'opacity-90' : ''
                            }`}
                        >
                            {/* Card Header */}
                            <div className="px-4 py-3 border-b border-[#dae7e0]/50 flex justify-between items-center bg-gray-50/50">
                                <div className="flex items-center gap-2 text-[#5e8d73] text-xs font-medium">
                                    <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                                    {formatDate(trip.createdAt)}
                                </div>
                                {isCompleted && (
                                    <div className="bg-[#00b250]/10 text-[#00b250] px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                        สำเร็จ
                                    </div>
                                )}
                                {isCancelled && (
                                    <div className="bg-[#FFB300]/10 text-[#FFB300] px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
                                        ยกเลิก
                                    </div>
                                )}
                                {!isCompleted && !isCancelled && (
                                    <div className="bg-blue-500/10 text-blue-600 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                                        กำลังดำเนินการ
                                    </div>
                                )}
                            </div>

                            {/* Card Body */}
                            <div className="p-4 grid grid-cols-[24px_1fr] gap-x-3">
                                {/* Route Visual */}
                                <div className="flex flex-col items-center pt-1.5 h-full">
                                    <div className={`size-3 rounded-full border-2 border-white shadow-sm z-10 ${
                                        isCancelled ? 'bg-gray-400' : 'bg-[#00b250]'
                                    }`} />
                                    <div className="w-0.5 border-l-2 border-dashed border-[#dae7e0] grow my-1 min-h-[24px]" />
                                    <div className={`size-3 rounded-full border-2 border-white shadow-sm z-10 ${
                                        isCancelled ? 'bg-gray-400' : 'bg-red-500'
                                    }`} />
                                </div>

                                {/* Route Text */}
                                <div className="flex flex-col gap-4 pb-1">
                                    <div>
                                        <p className="text-xs text-[#5e8d73] mb-0.5">รับที่</p>
                                        <p className={`text-sm font-medium leading-tight line-clamp-1 ${
                                            isCancelled ? 'text-[#101814]/70' : 'text-[#101814]'
                                        }`}>
                                            {trip.pickupLocation}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[#5e8d73] mb-0.5">ส่งที่</p>
                                        <p className={`text-sm font-medium leading-tight line-clamp-1 ${
                                            isCancelled ? 'text-[#101814]/70' : 'text-[#101814]'
                                        }`}>
                                            {trip.dropoffLocation}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Card Footer */}
                            <div className="px-4 pb-4 pt-0 flex justify-between items-end">
                                <button className="text-xs font-semibold text-[#5e8d73] flex items-center hover:text-[#00b250] transition-colors group/btn">
                                    ดูรายละเอียด
                                    <span className="material-symbols-outlined text-[16px] group-hover/btn:translate-x-0.5 transition-transform">chevron_right</span>
                                </button>
                                <p className={`text-lg font-bold ${
                                    isCancelled
                                        ? 'text-[#5e8d73] line-through decoration-2'
                                        : 'text-[#00b250]'
                                }`}>
                                    ฿{trip.totalCost.toLocaleString()}
                                </p>
                            </div>
                        </article>
                    );
                })}
            </main>
        </div>
    );
}
