'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FirestoreService } from '@/lib/firebase/firestore';

interface Booking {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    pickupLocation: string;
    dropoffLocation: string;
    pickupDate: string;
    pickupTime: string;
    vehicleName: string;
    totalCost: number;
    status: string;
    createdAt: any;
    updatedAt?: any;
}

export default function DriverHistoryPage() {
    const router = useRouter();
    const [driverId, setDriverId] = useState<string | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

    useEffect(() => {
        const storedDriver = localStorage.getItem('driver_session');
        if (!storedDriver) {
            router.push('/driver/login');
            return;
        }

        try {
            const driverData = JSON.parse(storedDriver);
            setDriverId(driverData.id);
            loadHistory(driverData.id);
        } catch (e) {
            router.push('/driver/login');
        }
    }, [router]);

    const loadHistory = async (id: string) => {
        try {
            const allBookings = await FirestoreService.getDriverBookings(id);
            // Get completed and cancelled bookings
            const historyBookings = allBookings.filter(
                b => ['completed', 'cancelled'].includes(b.status)
            );
            setBookings(historyBookings);
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-700';
            case 'cancelled': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'completed': return 'เสร็จสิ้น';
            case 'cancelled': return 'ยกเลิก';
            default: return status;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const options: Intl.DateTimeFormatOptions = {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        };
        return date.toLocaleDateString('th-TH', options);
    };

    const filteredBookings = bookings.filter(b => {
        if (filter === 'all') return true;
        return b.status === filter;
    });

    // Group by month
    const groupedByMonth: { [key: string]: Booking[] } = {};
    filteredBookings.forEach(booking => {
        const date = new Date(booking.pickupDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

        if (!groupedByMonth[monthName]) {
            groupedByMonth[monthName] = [];
        }
        groupedByMonth[monthName].push(booking);
    });

    // Calculate total earnings
    const totalEarnings = bookings
        .filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + b.totalCost, 0);

    const completedCount = bookings.filter(b => b.status === 'completed').length;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-gray-500">กำลังโหลด...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined">payments</span>
                        <span className="text-sm opacity-80">รายได้รวม</span>
                    </div>
                    <p className="text-2xl font-bold">฿{totalEarnings.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined">check_circle</span>
                        <span className="text-sm opacity-80">ทริปสำเร็จ</span>
                    </div>
                    <p className="text-2xl font-bold">{completedCount}</p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex bg-gray-100 rounded-xl p-1">
                {[
                    { key: 'all', label: 'ทั้งหมด' },
                    { key: 'completed', label: 'สำเร็จ' },
                    { key: 'cancelled', label: 'ยกเลิก' },
                ].map((item) => (
                    <button
                        key={item.key}
                        onClick={() => setFilter(item.key as any)}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                            filter === item.key
                                ? 'bg-white text-gray-800 shadow-sm'
                                : 'text-gray-500'
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {/* History List */}
            {filteredBookings.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center">
                    <span className="material-symbols-outlined text-5xl text-gray-300 mb-3">history</span>
                    <p className="text-gray-500">ยังไม่มีประวัติการเดินทาง</p>
                </div>
            ) : (
                Object.entries(groupedByMonth).map(([month, monthBookings]) => (
                    <div key={month}>
                        <h3 className="font-semibold text-gray-500 mb-3 text-sm uppercase">{month}</h3>
                        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
                            {monthBookings.map((booking) => (
                                <div key={booking.id} className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="font-semibold text-gray-800">
                                                {booking.firstName} {booking.lastName}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {formatDate(booking.pickupDate)} • {booking.pickupTime}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(booking.status)}`}>
                                            {getStatusText(booking.status)}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                        <span className="material-symbols-outlined text-green-500 text-lg">trip_origin</span>
                                        <span className="truncate">{booking.pickupLocation}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <span className="material-symbols-outlined text-red-500 text-lg">location_on</span>
                                        <span className="truncate">{booking.dropoffLocation}</span>
                                    </div>

                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                        <span className="text-gray-500">{booking.vehicleName}</span>
                                        <span className="font-bold text-gray-800">฿{booking.totalCost.toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
