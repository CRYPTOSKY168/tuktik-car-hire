'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { FirestoreService } from '@/lib/firebase/firestore';
import { DriverStatus } from '@/lib/types';
import Link from 'next/link';

interface DriverData {
    id: string;
    name: string;
    phone: string;
    vehiclePlate?: string;
    vehicleModel?: string;
    status: DriverStatus | string;
}

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
}

export default function DriverDashboard() {
    const [driver, setDriver] = useState<DriverData | null>(null);
    const [driverStatus, setDriverStatus] = useState<DriverStatus | string>(DriverStatus.AVAILABLE);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

    // New job alert states
    const [newJobAlert, setNewJobAlert] = useState<Booking | null>(null);
    const [showNewJobModal, setShowNewJobModal] = useState(false);
    const previousBookingIds = useRef<Set<string>>(new Set());
    const isFirstLoad = useRef(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Play notification sound
    const playNotificationSound = useCallback(() => {
        try {
            // Create audio context for notification sound
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Play pleasant notification melody
            oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
            oscillator.frequency.setValueAtTime(1108.73, audioContext.currentTime + 0.1); // C#6
            oscillator.frequency.setValueAtTime(1318.51, audioContext.currentTime + 0.2); // E6

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch {
            // Could not play notification sound
        }
    }, []);

    // Check for new bookings
    const checkForNewBookings = useCallback((newBookings: Booking[]) => {
        if (isFirstLoad.current) {
            // First load - just store the IDs
            previousBookingIds.current = new Set(newBookings.map(b => b.id));
            isFirstLoad.current = false;
            return;
        }

        // Find new bookings with status 'driver_assigned'
        const newAssignedBookings = newBookings.filter(
            b => b.status === 'driver_assigned' && !previousBookingIds.current.has(b.id)
        );

        if (newAssignedBookings.length > 0) {
            // Show alert for the first new booking
            setNewJobAlert(newAssignedBookings[0]);
            setShowNewJobModal(true);
            playNotificationSound();

            // Vibrate if supported
            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200, 100, 200]);
            }
        }

        // Update stored IDs
        previousBookingIds.current = new Set(newBookings.map(b => b.id));
    }, [playNotificationSound]);

    useEffect(() => {
        if (!auth) {
            setLoading(false);
            return;
        }

        let unsubscribeBookings: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                // Get user data
                const userDoc = await getDoc(doc(db!, 'users', user.uid));
                const userData = userDoc.data();
                let foundDriverId: string | null = null;

                if (userData?.driverId) {
                    const driverDoc = await getDoc(doc(db!, 'drivers', userData.driverId));
                    if (driverDoc.exists()) {
                        const driverData = driverDoc.data();
                        const driverInfo: DriverData = {
                            id: driverDoc.id,
                            name: driverData.name,
                            phone: driverData.phone,
                            vehiclePlate: driverData.vehiclePlate,
                            vehicleModel: driverData.vehicleModel,
                            status: driverData.status || DriverStatus.OFFLINE,
                        };
                        setDriver(driverInfo);
                        setDriverStatus(driverInfo.status);
                        foundDriverId = driverInfo.id;
                    }
                }

                // Fallback: Check by userId
                if (!foundDriverId) {
                    const driversQuery = query(
                        collection(db!, 'drivers'),
                        where('userId', '==', user.uid)
                    );
                    const driversSnap = await getDocs(driversQuery);

                    if (!driversSnap.empty) {
                        const driverDoc = driversSnap.docs[0];
                        const driverData = driverDoc.data();
                        const driverInfo: DriverData = {
                            id: driverDoc.id,
                            name: driverData.name,
                            phone: driverData.phone,
                            vehiclePlate: driverData.vehiclePlate,
                            vehicleModel: driverData.vehicleModel,
                            status: driverData.status || DriverStatus.OFFLINE,
                        };
                        setDriver(driverInfo);
                        setDriverStatus(driverInfo.status);
                        foundDriverId = driverInfo.id;
                    }
                }

                // Subscribe to bookings in real-time
                if (foundDriverId) {
                    unsubscribeBookings = FirestoreService.subscribeToDriverBookings(foundDriverId, (driverBookings) => {
                        setBookings(driverBookings);
                        checkForNewBookings(driverBookings);
                    });
                }

                setLoading(false);
            } catch (err) {
                console.error('Error loading driver:', err);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeBookings) unsubscribeBookings();
        };
    }, [checkForNewBookings]);

    const [statusLoading, setStatusLoading] = useState(false);

    // Helper function to get auth token (force refresh to avoid expired token)
    const getAuthToken = async (): Promise<string | null> => {
        const user = auth?.currentUser;
        if (!user) return null;
        try {
            // Force refresh token to ensure it's valid
            return await user.getIdToken(true);
        } catch {
            return null;
        }
    };

    const handleStatusChange = async (newStatus: DriverStatus) => {
        if (!driver) return;

        setStatusLoading(true);
        try {
            const token = await getAuthToken();
            if (!token) {
                throw new Error('กรุณาเข้าสู่ระบบใหม่');
            }

            // Use API endpoint to update driver status (with authentication)
            const response = await fetch('/api/driver/status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ driverId: driver.id, status: newStatus })
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to update status');
            }

            setDriverStatus(newStatus);
            setDriver({ ...driver, status: newStatus });
        } catch (error: any) {
            console.error('Error updating status:', error);
            alert(`ไม่สามารถเปลี่ยนสถานะได้: ${error.message || 'Unknown error'}`);
        } finally {
            setStatusLoading(false);
        }
    };

    const handleBookingAction = async (bookingId: string, newStatus: 'driver_en_route' | 'in_progress' | 'completed') => {
        if (!driver) return;

        // Find current booking and check if status is already the same (prevent duplicate calls)
        const currentBooking = bookings.find(b => b.id === bookingId);
        if (currentBooking?.status === newStatus) {
            console.log('Status already updated, skipping...');
            return;
        }

        setUpdatingStatus(bookingId);
        try {
            const token = await getAuthToken();
            if (!token) {
                throw new Error('กรุณาเข้าสู่ระบบใหม่');
            }

            // Use API route to update booking status (with authentication)
            const response = await fetch('/api/driver/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: 'updateStatus',
                    bookingId,
                    driverId: driver.id,
                    data: { status: newStatus }
                })
            });

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to update status');
            }

            // Optimistic update - update local state immediately for better UX
            setBookings(prev => prev.map(b =>
                b.id === bookingId ? { ...b, status: newStatus } : b
            ));

            // Real-time subscription will also update, but this gives instant feedback
        } catch (error: any) {
            console.error('Error updating booking:', error);
            alert(error.message || 'ไม่สามารถอัปเดตสถานะได้');
        } finally {
            setUpdatingStatus(null);
        }
    };

    const handleRejectJob = async (bookingId: string) => {
        if (!driver) return;

        if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการปฏิเสธงานนี้?')) return;

        setUpdatingStatus(bookingId);
        try {
            const token = await getAuthToken();
            if (!token) {
                throw new Error('กรุณาเข้าสู่ระบบใหม่');
            }

            const response = await fetch('/api/driver/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: 'rejectJob',
                    bookingId,
                    driverId: driver.id
                })
            });

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to reject job');
            }

            setShowNewJobModal(false);
            setNewJobAlert(null);
        } catch (error: any) {
            console.error('Error rejecting job:', error);
            alert(error.message || 'ไม่สามารถปฏิเสธงานได้');
        } finally {
            setUpdatingStatus(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'driver_assigned': return 'bg-blue-100 text-blue-700';
            case 'driver_en_route': return 'bg-orange-100 text-orange-700';
            case 'in_progress': return 'bg-purple-100 text-purple-700';
            case 'completed': return 'bg-green-100 text-green-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'driver_assigned': return 'รอออกเดินทาง';
            case 'driver_en_route': return 'กำลังไปรับ';
            case 'in_progress': return 'กำลังเดินทาง';
            case 'completed': return 'เสร็จสิ้น';
            default: return status;
        }
    };

    const getNextAction = (status: string): { label: string; nextStatus: 'driver_en_route' | 'in_progress' | 'completed'; icon: string; color: string } | null => {
        switch (status) {
            case 'driver_assigned':
                return { label: 'ออกเดินทาง', nextStatus: 'driver_en_route', icon: 'directions_car', color: 'from-orange-500 to-orange-600' };
            case 'driver_en_route':
                return { label: 'รับลูกค้าแล้ว', nextStatus: 'in_progress', icon: 'person_add', color: 'from-purple-500 to-purple-600' };
            case 'in_progress':
                return { label: 'ถึงปลายทาง', nextStatus: 'completed', icon: 'check_circle', color: 'from-green-500 to-green-600' };
            default:
                return null;
        }
    };

    const activeBookings = bookings.filter(b => ['driver_assigned', 'driver_en_route', 'in_progress'].includes(b.status));
    const todayBookings = bookings.filter(b => {
        const today = new Date().toISOString().split('T')[0];
        return b.pickupDate === today;
    });

    // Determine if driver is truly busy (has actual active bookings)
    const isActuallyBusy = activeBookings.length > 0;

    // Auto-correct stale "busy" status if no active bookings
    useEffect(() => {
        if (driver && driverStatus === DriverStatus.BUSY && !isActuallyBusy) {
            // Status is "busy" but no active bookings - auto correct to available
            handleStatusChange(DriverStatus.AVAILABLE);
        }
    }, [driver, driverStatus, isActuallyBusy]);

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

    if (!driver) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <span className="material-symbols-outlined text-5xl text-gray-300 mb-3">error</span>
                    <p className="text-gray-500">ไม่พบข้อมูลคนขับ</p>
                </div>
            </div>
        );
    }

    // Check if driver is online (available or busy)
    // Use isActuallyBusy for accurate busy status
    const isOnline = driverStatus === DriverStatus.AVAILABLE || driverStatus === DriverStatus.BUSY || isActuallyBusy;
    const displayBusy = isActuallyBusy; // Only show "busy" if there are actual active jobs

    // Toggle online/offline
    const handleToggleOnline = async () => {
        if (isOnline) {
            // Go offline (only if not busy)
            if (!displayBusy) {
                await handleStatusChange(DriverStatus.OFFLINE);
            }
        } else {
            // Go online (available)
            await handleStatusChange(DriverStatus.AVAILABLE);
        }
    };

    return (
        <div className="space-y-6">
            {/* Driver Status Card - Simple Toggle */}
            <div className={`rounded-2xl shadow-lg p-5 transition-all duration-300 ${
                isOnline
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                    : 'bg-gradient-to-r from-gray-400 to-gray-500'
            }`}>
                <div className="flex items-center justify-between">
                    <div className="text-white">
                        <p className="text-sm opacity-80">สถานะของคุณ</p>
                        <p className="text-2xl font-bold">
                            {isOnline ? (
                                displayBusy ? 'กำลังวิ่งงาน' : 'พร้อมรับงาน'
                            ) : 'ออฟไลน์'}
                        </p>
                        <p className="text-xs opacity-70 mt-1">
                            {isOnline
                                ? displayBusy
                                    ? `คุณมี ${activeBookings.length} งานอยู่`
                                    : 'คุณจะได้รับการแจ้งเตือนงานใหม่'
                                : 'คุณจะไม่ได้รับงานใหม่'}
                        </p>
                    </div>

                    {/* Toggle Switch */}
                    <button
                        onClick={handleToggleOnline}
                        disabled={displayBusy || statusLoading}
                        className={`relative w-20 h-10 rounded-full transition-all duration-300 ${
                            statusLoading
                                ? 'bg-white/20 cursor-wait'
                                : displayBusy
                                    ? 'bg-orange-400 cursor-not-allowed'
                                    : isOnline
                                        ? 'bg-white/30 hover:bg-white/40'
                                        : 'bg-white/20 hover:bg-white/30'
                        }`}
                        title={displayBusy ? 'ต้องเสร็จงานก่อนถึงจะปิดได้' : ''}
                    >
                        <div className={`absolute top-1 w-8 h-8 rounded-full bg-white shadow-lg transition-all duration-300 flex items-center justify-center ${
                            isOnline ? 'left-11' : 'left-1'
                        }`}>
                            {statusLoading ? (
                                <div className="w-4 h-4 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin"></div>
                            ) : (
                                <span className={`material-symbols-outlined text-lg ${
                                    displayBusy
                                        ? 'text-orange-500'
                                        : isOnline
                                            ? 'text-green-500'
                                            : 'text-gray-400'
                                }`}>
                                    {displayBusy
                                        ? 'local_taxi'
                                        : isOnline
                                            ? 'check'
                                            : 'power_settings_new'}
                                </span>
                            )}
                        </div>
                    </button>
                </div>

                {/* Status indicator */}
                {displayBusy && (
                    <div className="mt-3 pt-3 border-t border-white/20">
                        <p className="text-white/80 text-xs flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm animate-pulse">info</span>
                            คุณมีงานอยู่ ต้องเสร็จงานก่อนถึงจะปิดสถานะได้
                        </p>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined">pending_actions</span>
                        <span className="text-sm opacity-80">งานที่รอ</span>
                    </div>
                    <p className="text-3xl font-bold">{activeBookings.length}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined">today</span>
                        <span className="text-sm opacity-80">วันนี้</span>
                    </div>
                    <p className="text-3xl font-bold">{todayBookings.length}</p>
                </div>
            </div>

            {/* Active Bookings */}
            <div>
                <h3 className="font-semibold text-gray-800 mb-3">งานที่กำลังดำเนินการ</h3>
                {activeBookings.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 text-center">
                        <span className="material-symbols-outlined text-5xl text-gray-300 mb-3">inbox</span>
                        <p className="text-gray-500">ไม่มีงานที่กำลังดำเนินการ</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {activeBookings.map((booking) => {
                            const nextAction = getNextAction(booking.status);
                            return (
                                <div key={booking.id} id={`booking-${booking.id}`} className="bg-white rounded-2xl shadow-sm overflow-hidden transition-all duration-300">
                                    <div className="p-4">
                                        {/* Status Badge */}
                                        <div className="flex items-center justify-between mb-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                                                {getStatusText(booking.status)}
                                            </span>
                                            <span className="text-sm text-gray-500">
                                                {booking.pickupDate} • {booking.pickupTime}
                                            </span>
                                        </div>

                                        {/* Customer Info */}
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                                                <span className="material-symbols-outlined text-indigo-600">person</span>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-800">
                                                    {booking.firstName} {booking.lastName}
                                                </p>
                                                <a href={`tel:${booking.phone}`} className="text-sm text-indigo-600 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">call</span>
                                                    {booking.phone}
                                                </a>
                                            </div>
                                        </div>

                                        {/* Route */}
                                        <div className="bg-gray-50 rounded-xl p-3 mb-4">
                                            <div className="flex items-start gap-3">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                                    <div className="w-0.5 h-8 bg-gray-300"></div>
                                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                                </div>
                                                <div className="flex-1 space-y-4">
                                                    <div>
                                                        <p className="text-xs text-gray-500">รับ</p>
                                                        <p className="text-sm font-medium text-gray-800">{booking.pickupLocation}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">ส่ง</p>
                                                        <p className="text-sm font-medium text-gray-800">{booking.dropoffLocation}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Price */}
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-gray-500">ค่าบริการ</span>
                                            <span className="text-xl font-bold text-gray-800">฿{booking.totalCost.toLocaleString()}</span>
                                        </div>

                                        {/* Action Buttons */}
                                        {nextAction && (
                                            <div className="space-y-2">
                                                {/* Main action button */}
                                                <button
                                                    onClick={() => handleBookingAction(booking.id, nextAction.nextStatus)}
                                                    disabled={updatingStatus === booking.id}
                                                    className={`w-full py-4 bg-gradient-to-r ${nextAction.color} text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50`}
                                                >
                                                    {updatingStatus === booking.id ? (
                                                        <>
                                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                            กำลังอัพเดท...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="material-symbols-outlined">{nextAction.icon}</span>
                                                            {nextAction.label}
                                                        </>
                                                    )}
                                                </button>

                                                {/* Reject button - only for driver_assigned status */}
                                                {booking.status === 'driver_assigned' && (
                                                    <button
                                                        onClick={() => handleRejectJob(booking.id)}
                                                        disabled={updatingStatus === booking.id}
                                                        className="w-full py-2.5 bg-red-50 text-red-600 font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 transition-all disabled:opacity-50"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">cancel</span>
                                                        ปฏิเสธงานนี้
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Today's Schedule */}
            {todayBookings.length > 0 && (
                <div>
                    <h3 className="font-semibold text-gray-800 mb-3">ตารางงานวันนี้</h3>
                    <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
                        {todayBookings.map((booking) => (
                            <div key={booking.id} className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-gray-500">schedule</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800">{booking.pickupTime}</p>
                                            <p className="text-sm text-gray-500">{booking.firstName} {booking.lastName}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(booking.status)}`}>
                                        {getStatusText(booking.status)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* New Job Alert Modal */}
            {showNewJobModal && newJobAlert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop with blur */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
                        onClick={() => setShowNewJobModal(false)}
                    />

                    {/* Modal */}
                    <div className="relative w-full max-w-sm animate-bounceIn">
                        {/* Glow effect */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 rounded-3xl blur-lg opacity-75 animate-pulse" />

                        <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden">
                            {/* Top section with animation */}
                            <div className="relative bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 p-6 text-white text-center overflow-hidden">
                                {/* Animated circles */}
                                <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 animate-ping" style={{ animationDuration: '2s' }} />
                                <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-1/2 translate-y-1/2 animate-ping" style={{ animationDuration: '2.5s' }} />

                                {/* Icon with animation */}
                                <div className="relative inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4 animate-bounce">
                                    <div className="absolute inset-0 bg-white/20 rounded-full animate-ping" />
                                    <span className="material-symbols-outlined text-5xl">notifications_active</span>
                                </div>

                                <h2 className="text-2xl font-bold mb-1 animate-pulse">งานใหม่เข้ามาแล้ว!</h2>
                                <p className="text-white/80 text-sm">มีลูกค้ารอคุณอยู่</p>
                            </div>

                            {/* Job details */}
                            <div className="p-5 space-y-4">
                                {/* Customer info */}
                                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white shadow-lg">
                                        <span className="material-symbols-outlined text-2xl">person</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-lg">
                                            {newJobAlert.firstName} {newJobAlert.lastName}
                                        </p>
                                        <p className="text-sm text-gray-500 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">call</span>
                                            {newJobAlert.phone}
                                        </p>
                                    </div>
                                </div>

                                {/* Route */}
                                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex flex-col items-center">
                                            <div className="w-4 h-4 bg-green-500 rounded-full shadow-lg shadow-green-500/50 animate-pulse" />
                                            <div className="w-0.5 h-10 bg-gradient-to-b from-green-500 to-red-500" />
                                            <div className="w-4 h-4 bg-red-500 rounded-full shadow-lg shadow-red-500/50 animate-pulse" />
                                        </div>
                                        <div className="flex-1 space-y-5">
                                            <div>
                                                <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">จุดรับ</p>
                                                <p className="text-sm font-medium text-gray-800">{newJobAlert.pickupLocation}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-red-600 font-semibold uppercase tracking-wide">จุดส่ง</p>
                                                <p className="text-sm font-medium text-gray-800">{newJobAlert.dropoffLocation}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Time and Price */}
                                <div className="flex gap-3">
                                    <div className="flex-1 bg-blue-50 rounded-xl p-3 text-center">
                                        <span className="material-symbols-outlined text-blue-500 text-2xl">schedule</span>
                                        <p className="text-xs text-blue-600 mt-1">เวลารับ</p>
                                        <p className="font-bold text-blue-800">{newJobAlert.pickupTime}</p>
                                    </div>
                                    <div className="flex-1 bg-amber-50 rounded-xl p-3 text-center">
                                        <span className="material-symbols-outlined text-amber-500 text-2xl">calendar_today</span>
                                        <p className="text-xs text-amber-600 mt-1">วันที่</p>
                                        <p className="font-bold text-amber-800">{newJobAlert.pickupDate}</p>
                                    </div>
                                    <div className="flex-1 bg-green-50 rounded-xl p-3 text-center">
                                        <span className="material-symbols-outlined text-green-500 text-2xl">payments</span>
                                        <p className="text-xs text-green-600 mt-1">ค่าบริการ</p>
                                        <p className="font-bold text-green-800">฿{newJobAlert.totalCost.toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Action buttons */}
                                <div className="space-y-3 pt-2">
                                    {/* Accept / Reject buttons */}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleRejectJob(newJobAlert.id)}
                                            disabled={updatingStatus === newJobAlert.id}
                                            className="flex-1 py-3.5 bg-red-100 text-red-700 font-bold rounded-xl hover:bg-red-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {updatingStatus === newJobAlert.id ? (
                                                <div className="w-5 h-5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined">cancel</span>
                                                    ไม่รับงาน
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowNewJobModal(false);
                                                // Scroll to the booking
                                                const element = document.getElementById(`booking-${newJobAlert.id}`);
                                                if (element) {
                                                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                    element.classList.add('ring-4', 'ring-green-400', 'ring-opacity-50');
                                                    setTimeout(() => {
                                                        element.classList.remove('ring-4', 'ring-green-400', 'ring-opacity-50');
                                                    }, 3000);
                                                }
                                            }}
                                            className="flex-1 py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transition-all flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined">check_circle</span>
                                            รับงาน
                                        </button>
                                    </div>
                                    {/* View Later button */}
                                    <button
                                        onClick={() => setShowNewJobModal(false)}
                                        className="w-full py-2.5 text-gray-500 font-medium text-sm hover:text-gray-700 transition-all"
                                    >
                                        ดูภายหลัง
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CSS for animations */}
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes bounceIn {
                    0% { transform: scale(0.3); opacity: 0; }
                    50% { transform: scale(1.05); }
                    70% { transform: scale(0.9); }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
                .animate-bounceIn {
                    animation: bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                }
            `}</style>
        </div>
    );
}
