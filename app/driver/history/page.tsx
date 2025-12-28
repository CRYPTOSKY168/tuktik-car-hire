'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { FirestoreService } from '@/lib/firebase/firestore';

interface Booking {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    pickupLocation: string;
    dropoffLocation: string;
    pickupDate: string;
    pickupTime: string;
    vehicleName: string;
    totalCost: number;
    status: string;
    paymentMethod?: string;
    paymentStatus?: string;
    statusHistory?: Array<{
        status: string;
        timestamp: any;
        note?: string;
    }>;
    createdAt: any;
    updatedAt?: any;
}

export default function DriverHistoryPage() {
    const [driverId, setDriverId] = useState<string | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

    useEffect(() => {
        if (!auth) {
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                // Get user data from Firestore
                const userDoc = await getDoc(doc(db!, 'users', user.uid));
                const userData = userDoc.data();
                let foundDriverId: string | null = null;

                // Check if user has driverId linked
                if (userData?.driverId) {
                    const driverDoc = await getDoc(doc(db!, 'drivers', userData.driverId));
                    if (driverDoc.exists()) {
                        foundDriverId = driverDoc.id;
                    }
                }

                // Fallback: Check by userId in drivers collection
                if (!foundDriverId) {
                    const driversQuery = query(
                        collection(db!, 'drivers'),
                        where('userId', '==', user.uid)
                    );
                    const driversSnap = await getDocs(driversQuery);

                    if (!driversSnap.empty) {
                        foundDriverId = driversSnap.docs[0].id;
                    }
                }

                if (foundDriverId) {
                    setDriverId(foundDriverId);
                    loadHistory(foundDriverId);
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error('Error loading driver:', err);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const loadHistory = async (id: string) => {
        try {
            const allBookings = await FirestoreService.getDriverBookings(id);
            // Get completed and cancelled bookings
            const historyBookings = allBookings.filter(
                b => ['completed', 'cancelled'].includes(b.status)
            );
            // Sort by date descending
            historyBookings.sort((a, b) => {
                const dateA = new Date(a.pickupDate).getTime();
                const dateB = new Date(b.pickupDate).getTime();
                return dateB - dateA;
            });
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
            case 'driver_assigned': return 'รับงานแล้ว';
            case 'driver_en_route': return 'กำลังไปรับ';
            case 'in_progress': return 'กำลังเดินทาง';
            case 'confirmed': return 'ยืนยันแล้ว';
            case 'pending': return 'รอดำเนินการ';
            default: return status;
        }
    };

    const getPaymentMethodText = (method?: string) => {
        switch (method) {
            case 'cash': return 'เงินสด';
            case 'card': return 'บัตรเครดิต';
            case 'promptpay': return 'PromptPay';
            case 'bank_transfer': return 'โอนเงิน';
            default: return method || '-';
        }
    };

    const getPaymentStatusText = (status?: string) => {
        switch (status) {
            case 'paid': return 'ชำระแล้ว';
            case 'pending': return 'รอชำระ';
            case 'failed': return 'ล้มเหลว';
            default: return status || '-';
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

    const formatDateTime = (timestamp: any) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredBookings = bookings.filter(b => {
        if (filter === 'all') return true;
        return b.status === filter;
    });

    // Group by month
    const groupedByMonth: { [key: string]: Booking[] } = {};
    filteredBookings.forEach(booking => {
        const date = new Date(booking.pickupDate);
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
    const cancelledCount = bookings.filter(b => b.status === 'cancelled').length;

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
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-800">ประวัติการเดินทาง</h1>
                <p className="text-gray-500 text-sm">ดูประวัติงานทั้งหมดของคุณ</p>
            </div>

            {/* Summary Stats */}
            <div className="space-y-3">
                {/* Earnings - Full width */}
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-2xl">payments</span>
                            <span className="text-sm opacity-80">รายได้รวม</span>
                        </div>
                        <p className="text-2xl font-bold">฿{totalEarnings.toLocaleString()}</p>
                    </div>
                </div>
                {/* Completed & Cancelled - Side by side */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-white">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-lg">check_circle</span>
                            <span className="text-xs opacity-80">สำเร็จ</span>
                        </div>
                        <p className="text-2xl font-bold">{completedCount}</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl p-4 text-white">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-lg">cancel</span>
                            <span className="text-xs opacity-80">ยกเลิก</span>
                        </div>
                        <p className="text-2xl font-bold">{cancelledCount}</p>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex bg-gray-100 rounded-xl p-1">
                {[
                    { key: 'all', label: `ทั้งหมด (${bookings.length})` },
                    { key: 'completed', label: `สำเร็จ (${completedCount})` },
                    { key: 'cancelled', label: `ยกเลิก (${cancelledCount})` },
                ].map((item) => (
                    <button
                        key={item.key}
                        onClick={() => setFilter(item.key as any)}
                        className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
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
                <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-4xl text-gray-400">history</span>
                    </div>
                    <p className="text-gray-500 font-medium">ยังไม่มีประวัติการเดินทาง</p>
                    <p className="text-gray-400 text-sm mt-1">เมื่อคุณทำงานเสร็จ ประวัติจะแสดงที่นี่</p>
                </div>
            ) : (
                Object.entries(groupedByMonth).map(([month, monthBookings]) => (
                    <div key={month}>
                        <h3 className="font-semibold text-gray-500 mb-3 text-sm uppercase tracking-wider">{month}</h3>
                        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
                            {monthBookings.map((booking) => (
                                <div
                                    key={booking.id}
                                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                                    onClick={() => setSelectedBooking(booking)}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="font-semibold text-gray-800">
                                                {booking.firstName} {booking.lastName}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {formatDate(booking.pickupDate)} • {booking.pickupTime}
                                            </p>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getStatusColor(booking.status)}`}>
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
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500 text-sm">{booking.vehicleName}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-gray-800">฿{booking.totalCost.toLocaleString()}</span>
                                            <button
                                                className="flex items-center gap-1 text-indigo-600 text-sm font-medium hover:text-indigo-700"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedBooking(booking);
                                                }}
                                            >
                                                <span>ดูรายละเอียด</span>
                                                <span className="material-symbols-outlined text-lg">chevron_right</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}

            {/* Booking Detail Modal */}
            {selectedBooking && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end lg:items-center justify-center p-0 lg:p-4">
                    <div className="bg-white w-full lg:max-w-lg lg:rounded-2xl rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
                        {/* Modal Header */}
                        <div className={`sticky top-0 px-6 py-4 ${selectedBooking.status === 'completed' ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-red-500 to-pink-600'}`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-white">รายละเอียดการเดินทาง</h3>
                                    <p className="text-white/80 text-sm">#{selectedBooking.id.slice(-8).toUpperCase()}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedBooking(null)}
                                    className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                                >
                                    <span className="material-symbols-outlined text-white">close</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Status Badge */}
                            <div className="flex items-center justify-center">
                                <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusColor(selectedBooking.status)}`}>
                                    {selectedBooking.status === 'completed' ? '✓ ' : '✕ '}
                                    {getStatusText(selectedBooking.status)}
                                </span>
                            </div>

                            {/* Customer Info */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">ข้อมูลลูกค้า</h4>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-indigo-600">person</span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-800">{selectedBooking.firstName} {selectedBooking.lastName}</p>
                                            <p className="text-sm text-gray-500">{selectedBooking.phone}</p>
                                        </div>
                                    </div>
                                    {selectedBooking.email && (
                                        <p className="text-sm text-gray-500 pl-13">
                                            <span className="material-symbols-outlined text-sm align-middle mr-1">email</span>
                                            {selectedBooking.email}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Trip Details */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">รายละเอียดการเดินทาง</h4>
                                <div className="space-y-4">
                                    {/* Date & Time */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                            <span className="material-symbols-outlined text-purple-600">calendar_today</span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-800">{formatDate(selectedBooking.pickupDate)}</p>
                                            <p className="text-sm text-gray-500">เวลา {selectedBooking.pickupTime}</p>
                                        </div>
                                    </div>

                                    {/* Pickup */}
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <span className="material-symbols-outlined text-green-600">trip_origin</span>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 font-medium">จุดรับ</p>
                                            <p className="font-semibold text-gray-800">{selectedBooking.pickupLocation}</p>
                                        </div>
                                    </div>

                                    {/* Dropoff */}
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <span className="material-symbols-outlined text-red-600">location_on</span>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 font-medium">จุดหมาย</p>
                                            <p className="font-semibold text-gray-800">{selectedBooking.dropoffLocation}</p>
                                        </div>
                                    </div>

                                    {/* Vehicle */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <span className="material-symbols-outlined text-blue-600">directions_car</span>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 font-medium">ประเภทรถ</p>
                                            <p className="font-semibold text-gray-800">{selectedBooking.vehicleName}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Info */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">การชำระเงิน</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">ค่าบริการ</span>
                                        <span className="font-bold text-xl text-gray-800">฿{selectedBooking.totalCost.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">วิธีชำระ</span>
                                        <span className="text-gray-700">{getPaymentMethodText(selectedBooking.paymentMethod)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">สถานะ</span>
                                        <span className={`font-medium ${selectedBooking.paymentStatus === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                                            {getPaymentStatusText(selectedBooking.paymentStatus)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Status History */}
                            {selectedBooking.statusHistory && selectedBooking.statusHistory.length > 0 && (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">ประวัติสถานะ</h4>
                                    <div className="space-y-3">
                                        {selectedBooking.statusHistory.map((history, index) => (
                                            <div key={index} className="flex items-start gap-3">
                                                <div className={`w-2 h-2 rounded-full mt-2 ${
                                                    history.status === 'completed' ? 'bg-green-500' :
                                                    history.status === 'cancelled' ? 'bg-red-500' :
                                                    'bg-blue-500'
                                                }`} />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-gray-800">
                                                        {getStatusText(history.status)}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {formatDateTime(history.timestamp)}
                                                    </p>
                                                    {history.note && (
                                                        <p className="text-xs text-gray-400 mt-1">{history.note}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Close Button */}
                            <button
                                onClick={() => setSelectedBooking(null)}
                                className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                ปิด
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
