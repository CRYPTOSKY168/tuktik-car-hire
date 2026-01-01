'use client';

import { useEffect, useState, useMemo } from 'react';
import { FirestoreService } from '@/lib/firebase/firestore';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { getTimestampSeconds } from '@/lib/constants';
import { Driver, DriverStatus } from '@/lib/types';

// Status Configuration - Including awaiting_payment
const BOOKING_STATUSES = [
    { value: 'awaiting_payment', label: 'รอชำระเงิน', labelEn: 'Awaiting Payment', color: 'orange', icon: 'hourglass_empty', step: 0 },
    { value: 'pending', label: 'รอยืนยัน', labelEn: 'Pending', color: 'amber', icon: 'schedule', step: 1 },
    { value: 'confirmed', label: 'ยืนยันแล้ว', labelEn: 'Confirmed', color: 'blue', icon: 'check_circle', step: 2 },
    { value: 'driver_assigned', label: 'มอบหมายคนขับ', labelEn: 'Driver Assigned', color: 'purple', icon: 'person_pin', step: 3 },
    { value: 'driver_en_route', label: 'คนขับกำลังมา', labelEn: 'Driver En Route', color: 'indigo', icon: 'directions_car', step: 4 },
    { value: 'in_progress', label: 'กำลังเดินทาง', labelEn: 'In Progress', color: 'cyan', icon: 'trip_origin', step: 5 },
    { value: 'completed', label: 'เสร็จสิ้น', labelEn: 'Completed', color: 'emerald', icon: 'verified', step: 6 },
    { value: 'cancelled', label: 'ยกเลิก', labelEn: 'Cancelled', color: 'red', icon: 'cancel', step: -1 },
    { value: 'no_show', label: 'ลูกค้าไม่มา', labelEn: 'No Show', color: 'gray', icon: 'person_off', step: -2 },
    { value: 'refunded', label: 'คืนเงินแล้ว', labelEn: 'Refunded', color: 'pink', icon: 'currency_exchange', step: -3 },
];

// Valid status transitions - prevent going backwards
const VALID_TRANSITIONS: Record<string, string[]> = {
    awaiting_payment: ['pending', 'cancelled'],
    pending: ['confirmed', 'cancelled'],
    confirmed: ['driver_assigned', 'cancelled'],
    driver_assigned: ['driver_en_route', 'cancelled'],
    driver_en_route: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'cancelled'],
    completed: ['refunded'],
    cancelled: ['refunded'],
    no_show: ['refunded'],
    refunded: [],
};

const PAYMENT_STATUSES = [
    { value: 'pending', label: 'รอชำระ', labelEn: 'Pending', color: 'amber', icon: 'schedule' },
    { value: 'processing', label: 'กำลังดำเนินการ', labelEn: 'Processing', color: 'blue', icon: 'sync' },
    { value: 'paid', label: 'ชำระแล้ว', labelEn: 'Paid', color: 'emerald', icon: 'check_circle' },
    { value: 'partial', label: 'ชำระบางส่วน', labelEn: 'Partial', color: 'yellow', icon: 'remove_circle' },
    { value: 'failed', label: 'ไม่สำเร็จ', labelEn: 'Failed', color: 'red', icon: 'error' },
    { value: 'refunded', label: 'คืนเงินแล้ว', labelEn: 'Refunded', color: 'pink', icon: 'currency_exchange' },
    { value: 'cancelled', label: 'ยกเลิก', labelEn: 'Cancelled', color: 'gray', icon: 'cancel' },
];

const PAYMENT_METHODS = [
    { value: 'card', label: 'บัตรเครดิต', labelEn: 'Card', icon: 'credit_card', color: 'indigo' },
    { value: 'promptpay', label: 'พร้อมเพย์', labelEn: 'PromptPay', icon: 'qr_code', color: 'blue' },
    { value: 'bank_transfer', label: 'โอนเงิน', labelEn: 'Transfer', icon: 'account_balance', color: 'green' },
    { value: 'cash', label: 'เงินสด', labelEn: 'Cash', icon: 'payments', color: 'amber' },
];

// Date filter options
const DATE_FILTERS = [
    { value: 'all', label: 'ทั้งหมด', labelEn: 'All' },
    { value: 'today', label: 'วันนี้', labelEn: 'Today' },
    { value: 'tomorrow', label: 'พรุ่งนี้', labelEn: 'Tomorrow' },
    { value: 'week', label: 'สัปดาห์นี้', labelEn: 'This Week' },
    { value: 'month', label: 'เดือนนี้', labelEn: 'This Month' },
];

export default function AdminBookingsPage() {
    const { t, language } = useLanguage();
    const [bookings, setBookings] = useState<any[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterDate, setFilterDate] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'created' | 'amount'>('created');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Modals
    const [driverModal, setDriverModal] = useState<{
        show: boolean;
        bookingId: string;
        selectedDriverId: string;
        // Manual entry fallback
        driverName: string;
        driverPhone: string;
        vehiclePlate: string;
        vehicleModel: string;
        mode: 'select' | 'manual';
        searchQuery: string;
    }>({ show: false, bookingId: '', selectedDriverId: '', driverName: '', driverPhone: '', vehiclePlate: '', vehicleModel: '', mode: 'select', searchQuery: '' });

    const [confirmModal, setConfirmModal] = useState<{
        show: boolean;
        bookingId: string;
        newStatus: string;
        currentStatus: string;
        customerName: string;
    }>({ show: false, bookingId: '', newStatus: '', currentStatus: '', customerName: '' });

    const [detailModal, setDetailModal] = useState<{ show: boolean; booking: any | null }>({ show: false, booking: null });

    // Real-time subscription
    useEffect(() => {
        setLoading(true);

        const unsubscribeBookings = FirestoreService.subscribeToAllBookings((data) => {
            data.sort((a, b) => getTimestampSeconds(b.createdAt) - getTimestampSeconds(a.createdAt));
            setBookings(data);
            setLoading(false);
        });

        const unsubscribeDrivers = FirestoreService.subscribeToDrivers((data) => {
            setDrivers(data);
        });

        return () => {
            unsubscribeBookings();
            unsubscribeDrivers();
        };
    }, []);

    // Date filter helper
    const isInDateRange = (booking: any, filter: string) => {
        if (filter === 'all') return true;
        if (!booking.pickupDate) return false;

        const pickupDate = new Date(booking.pickupDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        switch (filter) {
            case 'today':
                return pickupDate.toDateString() === today.toDateString();
            case 'tomorrow':
                return pickupDate.toDateString() === tomorrow.toDateString();
            case 'week':
                return pickupDate >= today && pickupDate <= weekEnd;
            case 'month':
                return pickupDate >= monthStart && pickupDate <= monthEnd;
            default:
                return true;
        }
    };

    // Stats
    const stats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayBookings = bookings.filter(b => {
            if (!b.pickupDate) return false;
            return new Date(b.pickupDate).toDateString() === today.toDateString();
        });

        const urgentBookings = bookings.filter(b => {
            if (!['pending', 'confirmed'].includes(b.status)) return false;
            if (!b.pickupDate) return false;
            const pickup = new Date(b.pickupDate);
            const hoursUntil = (pickup.getTime() - Date.now()) / (1000 * 60 * 60);
            return hoursUntil > 0 && hoursUntil <= 24;
        });

        const totalRevenue = bookings
            .filter(b => b.status === 'completed')
            .reduce((sum, b) => sum + (b.totalCost || 0), 0);

        const countByStatus = (status: string) => bookings.filter(b => b.status === status).length;

        return {
            total: bookings.length,
            today: todayBookings.length,
            urgent: urgentBookings.length,
            awaiting_payment: countByStatus('awaiting_payment'),
            pending: countByStatus('pending'),
            confirmed: countByStatus('confirmed'),
            driver_assigned: countByStatus('driver_assigned'),
            driver_en_route: countByStatus('driver_en_route'),
            in_progress: countByStatus('in_progress'),
            completed: countByStatus('completed'),
            cancelled: countByStatus('cancelled'),
            revenue: totalRevenue,
        };
    }, [bookings]);

    // Filter tabs
    const FILTER_TABS = [
        { value: 'all', label: t.admin.bookings.filters.all, color: 'gray', count: stats.total },
        { value: 'awaiting_payment', label: t.admin.bookings.filters.awaitingPayment, color: 'orange', count: stats.awaiting_payment },
        { value: 'pending', label: t.admin.bookings.filters.pending, color: 'amber', count: stats.pending },
        { value: 'confirmed', label: t.admin.bookings.filters.confirmed, color: 'blue', count: stats.confirmed },
        { value: 'in_progress', label: t.admin.bookings.filters.inProgress, color: 'cyan', count: stats.in_progress },
        { value: 'completed', label: t.admin.bookings.filters.completed, color: 'emerald', count: stats.completed },
        { value: 'cancelled', label: t.admin.bookings.filters.cancelled, color: 'red', count: stats.cancelled },
    ];

    // Filtered & Sorted Bookings
    const filteredBookings = useMemo(() => {
        let result = bookings.filter(b => {
            const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
            const matchesDate = isInDateRange(b, filterDate);
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = !searchQuery ||
                b.id?.toLowerCase().includes(searchLower) ||
                b.firstName?.toLowerCase().includes(searchLower) ||
                b.lastName?.toLowerCase().includes(searchLower) ||
                b.email?.toLowerCase().includes(searchLower) ||
                b.phone?.includes(searchQuery) ||
                b.pickupLocation?.toLowerCase().includes(searchLower) ||
                b.dropoffLocation?.toLowerCase().includes(searchLower);

            return matchesStatus && matchesDate && matchesSearch;
        });

        // Sort
        result.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'date':
                    comparison = new Date(a.pickupDate || 0).getTime() - new Date(b.pickupDate || 0).getTime();
                    break;
                case 'amount':
                    comparison = (a.totalCost || 0) - (b.totalCost || 0);
                    break;
                case 'created':
                default:
                    comparison = (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
            }
            return sortOrder === 'desc' ? -comparison : comparison;
        });

        return result;
    }, [bookings, filterStatus, filterDate, searchQuery, sortBy, sortOrder]);

    // Get status config
    const getStatusConfig = (status: string): { bg: string; text: string; border: string; icon: string; label: string; step: number } => {
        const s = BOOKING_STATUSES.find(x => x.value === status);
        if (!s) return { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', icon: 'help', label: status, step: 0 };

        const colors: Record<string, { bg: string; text: string; border: string }> = {
            orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
            amber: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
            blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
            purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
            indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
            cyan: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
            emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
            red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
            gray: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
            pink: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
        };
        const c = colors[s.color] || colors.gray;
        return { ...c, icon: s.icon, label: language === 'en' ? s.labelEn : s.label, step: s.step };
    };

    const getPaymentMethodConfig = (method: string) => {
        const m = PAYMENT_METHODS.find(x => x.value === method);
        if (!m) return { icon: 'payment', label: method || '-', color: 'gray' };
        return { ...m, label: language === 'en' ? m.labelEn : m.label };
    };

    const getPaymentStatusConfig = (status: string) => {
        const s = PAYMENT_STATUSES.find(x => x.value === status);
        if (!s) return { bg: 'bg-gray-100', text: 'text-gray-600', icon: 'help', label: '-' };
        const colors: Record<string, { bg: string; text: string }> = {
            amber: { bg: 'bg-amber-100', text: 'text-amber-700' },
            blue: { bg: 'bg-blue-100', text: 'text-blue-700' },
            emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
            yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
            red: { bg: 'bg-red-100', text: 'text-red-700' },
            pink: { bg: 'bg-pink-100', text: 'text-pink-700' },
            gray: { bg: 'bg-gray-100', text: 'text-gray-700' },
        };
        const c = colors[s.color] || { bg: 'bg-gray-100', text: 'text-gray-600' };
        return { ...c, icon: s.icon, label: language === 'en' ? s.labelEn : s.label };
    };

    // Check if transition is valid
    const canTransitionTo = (currentStatus: string, newStatus: string) => {
        const valid = VALID_TRANSITIONS[currentStatus] || [];
        return valid.includes(newStatus);
    };

    // Get next action for a booking
    const getNextAction = (booking: any) => {
        const { status } = booking;
        switch (status) {
            case 'awaiting_payment':
                return { label: 'รอลูกค้าชำระ', action: null, color: 'orange', icon: 'hourglass_empty' };
            case 'pending':
                return { label: 'ยืนยัน', action: 'confirmed', color: 'emerald', icon: 'check_circle' };
            case 'confirmed':
                return booking.driver
                    ? { label: 'คนขับออกเดินทาง', action: 'driver_en_route', color: 'indigo', icon: 'directions_car' }
                    : { label: 'มอบหมายคนขับ', action: 'assign_driver', color: 'purple', icon: 'person_add' };
            case 'driver_assigned':
                return { label: 'คนขับออกเดินทาง', action: 'driver_en_route', color: 'indigo', icon: 'directions_car' };
            case 'driver_en_route':
                return { label: 'เริ่มเดินทาง', action: 'in_progress', color: 'cyan', icon: 'trip_origin' };
            case 'in_progress':
                return { label: 'เสร็จสิ้น', action: 'completed', color: 'emerald', icon: 'verified' };
            default:
                return null;
        }
    };

    // Handle status change with notification
    const handleStatusChange = async (bookingId: string, newStatus: string, booking: any) => {
        try {
            await FirestoreService.updateBookingStatus(bookingId, newStatus);

            // Send notification to customer
            if (booking.userId) {
                const statusLabel = BOOKING_STATUSES.find(s => s.value === newStatus)?.label || newStatus;
                await FirestoreService.addNotification(booking.userId, {
                    type: 'booking',
                    title: 'อัปเดตสถานะการจอง',
                    message: `การจอง #${bookingId.slice(0, 6).toUpperCase()} เปลี่ยนสถานะเป็น "${statusLabel}"`,
                    data: { bookingId, newStatus },
                });
            }

            setConfirmModal({ show: false, bookingId: '', newStatus: '', currentStatus: '', customerName: '' });
        } catch (error: any) {
            console.error('Failed to update status:', error);
            alert(`ไม่สามารถอัปเดตสถานะได้: ${error?.message || 'Unknown error'}`);
        }
    };

    // Handle payment status change
    const handlePaymentStatusChange = async (bookingId: string, newStatus: string, booking: any) => {
        try {
            await FirestoreService.updatePaymentStatus(bookingId, newStatus);

            // Notify customer
            if (booking.userId && newStatus === 'paid') {
                await FirestoreService.addNotification(booking.userId, {
                    type: 'payment',
                    title: 'ยืนยันการชำระเงิน',
                    message: `การชำระเงินสำหรับการจอง #${bookingId.slice(0, 6).toUpperCase()} ได้รับการยืนยันแล้ว`,
                    data: { bookingId },
                });
            }
        } catch (error) {
            console.error('Failed to update payment status:', error);
            alert('ไม่สามารถอัปเดตสถานะการชำระเงินได้');
        }
    };

    // Handle driver assignment
    const handleAssignDriver = async () => {
        let driverData: { name: string; phone: string; vehiclePlate?: string; vehicleModel?: string; driverId?: string };

        if (driverModal.mode === 'select' && driverModal.selectedDriverId) {
            // Use selected driver from dropdown
            const selectedDriver = drivers.find(d => d.id === driverModal.selectedDriverId);
            if (!selectedDriver) {
                alert('กรุณาเลือกคนขับ');
                return;
            }
            driverData = {
                driverId: selectedDriver.id,
                name: selectedDriver.name,
                phone: selectedDriver.phone,
                vehiclePlate: selectedDriver.vehiclePlate,
                vehicleModel: selectedDriver.vehicleModel,
            };
        } else if (driverModal.mode === 'manual' && driverModal.driverName && driverModal.driverPhone) {
            // Manual entry
            driverData = {
                name: driverModal.driverName,
                phone: driverModal.driverPhone,
                vehiclePlate: driverModal.vehiclePlate,
                vehicleModel: driverModal.vehicleModel,
            };
        } else {
            alert('กรุณาเลือกคนขับหรือกรอกข้อมูลให้ครบ');
            return;
        }

        try {
            await FirestoreService.assignDriver(driverModal.bookingId, driverData);

            // Update driver status to busy if selected from list
            if (driverData.driverId) {
                await FirestoreService.updateDriverStatus(driverData.driverId, DriverStatus.BUSY);

                // Get driver's userId to send notification
                const selectedDriver = drivers.find(d => d.id === driverData.driverId);
                if (selectedDriver) {
                    // Get driver document to find userId
                    const driverDoc = await FirestoreService.getDriverById(driverData.driverId);
                    if (driverDoc?.userId) {
                        const booking = bookings.find(b => b.id === driverModal.bookingId);
                        await FirestoreService.addNotification(driverDoc.userId, {
                            type: 'booking',
                            title: 'งานใหม่!',
                            message: `คุณได้รับมอบหมายงานรับ ${booking?.firstName || 'ลูกค้า'} ${booking?.lastName || ''} เวลา ${booking?.pickupTime || '-'}`,
                            data: {
                                bookingId: driverModal.bookingId,
                                pickupLocation: booking?.pickupLocation,
                                dropoffLocation: booking?.dropoffLocation,
                                pickupDate: booking?.pickupDate,
                                pickupTime: booking?.pickupTime,
                            },
                        });
                    }
                }
            }

            // Notify customer
            const booking = bookings.find(b => b.id === driverModal.bookingId);
            if (booking?.userId) {
                await FirestoreService.addNotification(booking.userId, {
                    type: 'booking',
                    title: 'มอบหมายคนขับแล้ว',
                    message: `คนขับ ${driverData.name} จะมารับคุณ ทะเบียน ${driverData.vehiclePlate || '-'}`,
                    data: { bookingId: driverModal.bookingId, driverName: driverData.name },
                });
            }

            setDriverModal({ show: false, bookingId: '', selectedDriverId: '', driverName: '', driverPhone: '', vehiclePlate: '', vehicleModel: '', mode: 'select', searchQuery: '' });
        } catch (error: any) {
            console.error('Failed to assign driver:', error);
            alert(`ไม่สามารถมอบหมายคนขับได้: ${error?.message || 'Unknown error'}`);
        }
    };

    // Get available drivers (only 'available' status) with search filter
    const availableDrivers = drivers.filter(d => {
        // Only show drivers with 'available' status
        // Exclude 'busy' (มีงานอยู่) and 'offline' (ปิดรับงาน)
        if (d.status !== 'available') return false;

        // Filter by search query
        if (driverModal.searchQuery) {
            const query = driverModal.searchQuery.toLowerCase();
            return (
                d.name?.toLowerCase().includes(query) ||
                d.phone?.includes(query) ||
                d.vehiclePlate?.toLowerCase().includes(query)
            );
        }
        return true;
    });

    // Export to CSV
    const exportToCSV = () => {
        const headers = ['ID', 'วันที่', 'เวลา', 'ลูกค้า', 'โทรศัพท์', 'ต้นทาง', 'ปลายทาง', 'ยานพาหนะ', 'ราคา', 'สถานะ', 'ชำระเงิน'];
        const rows = filteredBookings.map(b => [
            b.id,
            b.pickupDate || '-',
            b.pickupTime || '-',
            `${b.firstName || ''} ${b.lastName || ''}`.trim() || '-',
            b.phone || '-',
            b.pickupLocation || '-',
            b.dropoffLocation || '-',
            b.vehicle?.name || '-',
            b.totalCost || 0,
            getStatusConfig(b.status).label,
            getPaymentStatusConfig(b.paymentStatus).label,
        ]);

        const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `bookings_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    // Format helpers
    const formatDate = (date: string) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
    };

    const formatTimestamp = (ts: any) => {
        if (!ts) return '-';
        const date = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
        return date.toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const getTimeUntilPickup = (booking: any) => {
        if (!booking.pickupDate) return null;
        const pickup = new Date(`${booking.pickupDate} ${booking.pickupTime || '00:00'}`);
        const now = Date.now();
        const diff = pickup.getTime() - now;
        if (diff < 0) return { text: 'ผ่านไปแล้ว', urgent: false, past: true };
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        if (hours < 24) {
            return { text: `อีก ${hours} ชม. ${minutes} นาที`, urgent: hours < 3, past: false };
        }
        const days = Math.floor(hours / 24);
        return { text: `อีก ${days} วัน`, urgent: false, past: false };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-blue-600 font-semibold">{t.admin.common.loading}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">{t.admin.bookings.title}</h1>
                    <p className="text-gray-500 text-sm mt-1">{t.admin.bookings.subtitle}</p>
                </div>
                <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/30"
                >
                    <span className="material-symbols-outlined text-lg">download</span>
                    {t.admin.bookings.exportCSV}
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <span className="material-symbols-outlined text-white text-lg">receipt_long</span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">{t.admin.bookings.stats.total}</p>
                            <p className="text-xl font-bold text-gray-800">{stats.total}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                            <span className="material-symbols-outlined text-white text-lg">today</span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">{t.admin.bookings.stats.today}</p>
                            <p className="text-xl font-bold text-gray-800">{stats.today}</p>
                        </div>
                    </div>
                </div>

                <div className={`bg-white rounded-2xl p-4 border shadow-sm ${stats.urgent > 0 ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${stats.urgent > 0 ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/30 animate-pulse' : 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30'}`}>
                            <span className="material-symbols-outlined text-white text-lg">warning</span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">{t.admin.bookings.stats.urgent}</p>
                            <p className={`text-xl font-bold ${stats.urgent > 0 ? 'text-red-600' : 'text-gray-800'}`}>{stats.urgent}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                            <span className="material-symbols-outlined text-white text-lg">schedule</span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">{t.admin.bookings.stats.pending}</p>
                            <p className="text-xl font-bold text-gray-800">{stats.pending}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                            <span className="material-symbols-outlined text-white text-lg">trip_origin</span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">{t.admin.bookings.stats.inProgress}</p>
                            <p className="text-xl font-bold text-gray-800">{stats.in_progress}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm col-span-2 lg:col-span-1">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                            <span className="material-symbols-outlined text-white text-lg">payments</span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">{t.admin.bookings.stats.revenue}</p>
                            <p className="text-lg font-bold text-emerald-600">฿{stats.revenue.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-4">
                {/* Status Tabs */}
                <div className="flex p-1 bg-gray-100 rounded-xl overflow-x-auto">
                    {FILTER_TABS.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setFilterStatus(tab.value)}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${filterStatus === tab.value
                                ? 'bg-white text-gray-800 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab.label}
                            <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${filterStatus === tab.value ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Secondary Filters */}
                <div className="flex flex-col lg:flex-row gap-3">
                    {/* Date Filter */}
                    <div className="flex items-center gap-2">
                        <label htmlFor="filter-date" className="sr-only">กรองตามวันที่</label>
                        <span className="material-symbols-outlined text-gray-400 text-lg">calendar_today</span>
                        <select
                            id="filter-date"
                            name="filterDate"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            {DATE_FILTERS.map(df => (
                                <option key={df.value} value={df.value}>{df.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-2">
                        <label htmlFor="sort-by" className="sr-only">เรียงตาม</label>
                        <span className="material-symbols-outlined text-gray-400 text-lg">sort</span>
                        <select
                            id="sort-by"
                            name="sortBy"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="created">วันที่สร้าง</option>
                            <option value="date">วันที่เดินทาง</option>
                            <option value="amount">ราคา</option>
                        </select>
                        <button
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            className="p-2 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                            <span className="material-symbols-outlined text-gray-600 text-lg">
                                {sortOrder === 'desc' ? 'arrow_downward' : 'arrow_upward'}
                            </span>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative flex-1 lg:max-w-xs">
                        <label htmlFor="booking-search" className="sr-only">{t.admin.bookings.searchPlaceholder}</label>
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                        <input
                            id="booking-search"
                            name="bookingSearch"
                            type="text"
                            autoComplete="off"
                            placeholder={t.admin.bookings.searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Booking List */}
            {filteredBookings.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mx-auto mb-4">
                        <span className="material-symbols-outlined text-4xl">inbox</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">{t.admin.bookings.noBookings}</h3>
                    <p className="text-gray-500 mt-1">{t.admin.bookings.adjustFilters}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredBookings.map((booking) => {
                        const statusConfig = getStatusConfig(booking.status);
                        const paymentMethod = getPaymentMethodConfig(booking.paymentMethod);
                        const paymentStatus = getPaymentStatusConfig(booking.paymentStatus || 'pending');
                        const nextAction = getNextAction(booking);
                        const timeUntil = getTimeUntilPickup(booking);

                        return (
                            <div
                                key={booking.id}
                                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${timeUntil?.urgent ? 'border-red-300 bg-red-50/30' : 'border-gray-100'
                                    }`}
                            >
                                {/* Header */}
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        {/* Status Icon */}
                                        <div className={`w-12 h-12 rounded-xl ${statusConfig.bg} flex items-center justify-center`}>
                                            <span className={`material-symbols-outlined text-xl ${statusConfig.text}`}>{statusConfig.icon}</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm font-bold text-gray-800">#{booking.id.slice(0, 8).toUpperCase()}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusConfig.bg} ${statusConfig.text}`}>
                                                    {statusConfig.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                                <span>สร้างเมื่อ {formatTimestamp(booking.createdAt)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Time Until Pickup */}
                                    {timeUntil && !timeUntil.past && !['completed', 'cancelled', 'refunded'].includes(booking.status) && (
                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${timeUntil.urgent ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            <span className="material-symbols-outlined text-base">schedule</span>
                                            {timeUntil.text}
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-4">
                                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                                        {/* Customer Info */}
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                                {booking.firstName?.[0]?.toUpperCase() || 'G'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-800 truncate">{booking.firstName} {booking.lastName}</p>
                                                {booking.phone && (
                                                    <a href={`tel:${booking.phone}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-xs">call</span>
                                                        {booking.phone}
                                                    </a>
                                                )}
                                                {booking.email && <p className="text-xs text-gray-400 truncate">{booking.email}</p>}
                                            </div>
                                        </div>

                                        {/* Route & Time */}
                                        <div className="lg:col-span-2">
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="material-symbols-outlined text-emerald-500 text-lg">trip_origin</span>
                                                <span className="text-gray-700 truncate flex-1">{booking.pickupLocation || '-'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm mt-1">
                                                <span className="material-symbols-outlined text-red-500 text-lg">location_on</span>
                                                <span className="text-gray-700 truncate flex-1">{booking.dropoffLocation || '-'}</span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">event</span>
                                                    {formatDate(booking.pickupDate)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">schedule</span>
                                                    {booking.pickupTime || '-'}
                                                </span>
                                                {booking.flightNumber && (
                                                    <span className="flex items-center gap-1 text-blue-600">
                                                        <span className="material-symbols-outlined text-sm">flight</span>
                                                        {booking.flightNumber}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Payment */}
                                        <div className="text-right">
                                            <p className="text-xl font-bold text-gray-800">฿{booking.totalCost?.toLocaleString()}</p>
                                            <div className="flex items-center justify-end gap-2 mt-1">
                                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${paymentStatus.bg} ${paymentStatus.text}`}>
                                                    <span className="material-symbols-outlined text-xs">{paymentStatus.icon}</span>
                                                    {paymentStatus.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1 flex items-center justify-end gap-1">
                                                <span className="material-symbols-outlined text-xs">{paymentMethod.icon}</span>
                                                {paymentMethod.label}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Driver Info */}
                                    {booking.driver && (
                                        <div className="mt-4 p-3 bg-purple-50 rounded-xl border border-purple-100">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-purple-600">person</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-purple-800">{booking.driver.name}</p>
                                                        <p className="text-xs text-purple-600">
                                                            {booking.driver.vehicleModel && `${booking.driver.vehicleModel} • `}
                                                            {booking.driver.vehiclePlate || booking.driver.phone}
                                                        </p>
                                                    </div>
                                                </div>
                                                {booking.driver.phone && (
                                                    <a href={`tel:${booking.driver.phone}`} className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold">
                                                        <span className="material-symbols-outlined text-sm">call</span>
                                                        โทรคนขับ
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Special Requests */}
                                    {booking.specialRequests && (
                                        <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                            <div className="flex items-start gap-2">
                                                <span className="material-symbols-outlined text-amber-600 text-sm">info</span>
                                                <div>
                                                    <p className="text-xs font-bold text-amber-700">หมายเหตุ</p>
                                                    <p className="text-xs text-amber-800">{booking.specialRequests}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex flex-wrap items-center gap-2 p-4 bg-gray-50 border-t border-gray-100">
                                    {/* Main Action */}
                                    {nextAction && nextAction.action && (
                                        nextAction.action === 'assign_driver' ? (
                                            <button
                                                onClick={() => setDriverModal({ show: true, bookingId: booking.id, selectedDriverId: '', driverName: '', driverPhone: '', vehiclePlate: '', vehicleModel: '', mode: 'select', searchQuery: '' })}
                                                className={`flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-purple-500/30 hover:bg-purple-700 transition-colors`}
                                            >
                                                <span className="material-symbols-outlined text-lg">{nextAction.icon}</span>
                                                {nextAction.label}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setConfirmModal({
                                                    show: true,
                                                    bookingId: booking.id,
                                                    newStatus: nextAction.action!,
                                                    currentStatus: booking.status,
                                                    customerName: `${booking.firstName} ${booking.lastName}`
                                                })}
                                                className={`flex items-center gap-1.5 px-4 py-2 bg-${nextAction.color}-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-${nextAction.color}-500/30 hover:bg-${nextAction.color}-700 transition-colors`}
                                                style={{
                                                    backgroundColor: nextAction.color === 'emerald' ? '#059669' :
                                                        nextAction.color === 'indigo' ? '#4f46e5' :
                                                            nextAction.color === 'cyan' ? '#0891b2' : '#6b7280'
                                                }}
                                            >
                                                <span className="material-symbols-outlined text-lg">{nextAction.icon}</span>
                                                {nextAction.label}
                                            </button>
                                        )
                                    )}

                                    {/* Status Dropdown for manual change */}
                                    <label htmlFor={`status-${booking.id}`} className="sr-only">สถานะการจอง</label>
                                    <select
                                        id={`status-${booking.id}`}
                                        name={`status-${booking.id}`}
                                        value={booking.status}
                                        onChange={(e) => {
                                            const newStatus = e.target.value;
                                            if (canTransitionTo(booking.status, newStatus)) {
                                                setConfirmModal({
                                                    show: true,
                                                    bookingId: booking.id,
                                                    newStatus,
                                                    currentStatus: booking.status,
                                                    customerName: `${booking.firstName} ${booking.lastName}`
                                                });
                                            } else {
                                                alert(`ไม่สามารถเปลี่ยนจาก "${getStatusConfig(booking.status).label}" เป็น "${getStatusConfig(newStatus).label}" ได้`);
                                                e.target.value = booking.status;
                                            }
                                        }}
                                        className={`px-3 py-2 text-xs font-bold rounded-xl border cursor-pointer ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                                    >
                                        {BOOKING_STATUSES.map((s) => (
                                            <option key={s.value} value={s.value} disabled={!canTransitionTo(booking.status, s.value) && s.value !== booking.status}>
                                                {s.label} {!canTransitionTo(booking.status, s.value) && s.value !== booking.status ? '(ไม่อนุญาต)' : ''}
                                            </option>
                                        ))}
                                    </select>

                                    {/* Payment Status Dropdown */}
                                    <label htmlFor={`payment-${booking.id}`} className="sr-only">สถานะการชำระเงิน</label>
                                    <select
                                        id={`payment-${booking.id}`}
                                        name={`payment-${booking.id}`}
                                        value={booking.paymentStatus || 'pending'}
                                        onChange={(e) => handlePaymentStatusChange(booking.id, e.target.value, booking)}
                                        className={`px-3 py-2 text-xs font-bold rounded-xl border cursor-pointer ${paymentStatus.bg} ${paymentStatus.text}`}
                                    >
                                        {PAYMENT_STATUSES.map((ps) => (
                                            <option key={ps.value} value={ps.value}>{ps.label}</option>
                                        ))}
                                    </select>

                                    {/* Cancel Button */}
                                    {!['cancelled', 'completed', 'refunded', 'no_show'].includes(booking.status) && (
                                        <button
                                            onClick={() => setConfirmModal({
                                                show: true,
                                                bookingId: booking.id,
                                                newStatus: 'cancelled',
                                                currentStatus: booking.status,
                                                customerName: `${booking.firstName} ${booking.lastName}`
                                            })}
                                            className="flex items-center gap-1 px-3 py-2 bg-red-100 text-red-600 rounded-xl text-xs font-bold hover:bg-red-200 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-sm">close</span>
                                            ยกเลิก
                                        </button>
                                    )}

                                    {/* Call Customer */}
                                    {booking.phone && (
                                        <a href={`tel:${booking.phone}`} className="flex items-center gap-1 px-3 py-2 bg-blue-100 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-200 transition-colors">
                                            <span className="material-symbols-outlined text-sm">call</span>
                                            โทรลูกค้า
                                        </a>
                                    )}

                                    {/* View Slip */}
                                    {booking.slipUrl && (
                                        <a href={booking.slipUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-3 py-2 bg-green-100 text-green-600 rounded-xl text-xs font-bold hover:bg-green-200 transition-colors">
                                            <span className="material-symbols-outlined text-sm">receipt</span>
                                            ดูสลิป
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Confirm Modal */}
            {confirmModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-gray-100">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${confirmModal.newStatus === 'cancelled' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                                confirmModal.newStatus === 'confirmed' ? 'bg-gradient-to-br from-emerald-500 to-green-600' :
                                    confirmModal.newStatus === 'completed' ? 'bg-gradient-to-br from-emerald-500 to-green-600' :
                                        'bg-gradient-to-br from-blue-500 to-indigo-600'
                                }`}>
                                <span className="material-symbols-outlined text-white text-3xl">
                                    {confirmModal.newStatus === 'cancelled' ? 'close' :
                                        confirmModal.newStatus === 'confirmed' ? 'check' :
                                            confirmModal.newStatus === 'completed' ? 'verified' : 'sync'}
                                </span>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">
                                    {confirmModal.newStatus === 'confirmed' ? 'ยืนยันการจอง' :
                                        confirmModal.newStatus === 'cancelled' ? 'ยกเลิกการจอง' :
                                            confirmModal.newStatus === 'completed' ? 'เสร็จสิ้นการเดินทาง' :
                                                'เปลี่ยนสถานะ'}
                                </h3>
                                <p className="text-sm text-gray-500 mt-2">
                                    {confirmModal.customerName && `ลูกค้า: ${confirmModal.customerName}`}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                    เปลี่ยนจาก <span className="font-bold">{getStatusConfig(confirmModal.currentStatus).label}</span> เป็น <span className="font-bold">{getStatusConfig(confirmModal.newStatus).label}</span>
                                </p>
                                <p className="text-xs text-blue-600 mt-2">
                                    * ระบบจะส่ง notification แจ้งลูกค้าอัตโนมัติ
                                </p>
                            </div>
                            <div className="flex gap-3 w-full mt-4">
                                <button
                                    onClick={() => setConfirmModal({ show: false, bookingId: '', newStatus: '', currentStatus: '', customerName: '' })}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={() => {
                                        const booking = bookings.find(b => b.id === confirmModal.bookingId);
                                        if (booking) handleStatusChange(confirmModal.bookingId, confirmModal.newStatus, booking);
                                    }}
                                    className={`flex-1 px-4 py-3 text-white font-bold rounded-xl shadow-lg transition-all ${confirmModal.newStatus === 'cancelled' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                                        'bg-gradient-to-r from-blue-500 to-indigo-600'
                                        }`}
                                >
                                    ยืนยัน
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Driver Assignment Modal */}
            {driverModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-gray-100 overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="material-symbols-outlined">person_add</span>
                                มอบหมายคนขับ
                            </h2>
                            <p className="text-purple-100 text-sm">เลือกคนขับสำหรับงานนี้</p>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Mode Toggle */}
                            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                                <button
                                    onClick={() => setDriverModal({ ...driverModal, mode: 'select' })}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${driverModal.mode === 'select' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}
                                >
                                    เลือกจากรายชื่อ
                                </button>
                                <button
                                    onClick={() => setDriverModal({ ...driverModal, mode: 'manual' })}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${driverModal.mode === 'manual' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}
                                >
                                    กรอกเอง
                                </button>
                            </div>

                            {driverModal.mode === 'select' ? (
                                <>
                                    {/* Search Box */}
                                    <div className="relative">
                                        <label htmlFor="driver-search" className="sr-only">ค้นหาคนขับ</label>
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                                        <input
                                            id="driver-search"
                                            name="driverSearch"
                                            type="text"
                                            autoComplete="off"
                                            placeholder="ค้นหาชื่อ, เบอร์โทร, ทะเบียน..."
                                            value={driverModal.searchQuery}
                                            onChange={(e) => setDriverModal({ ...driverModal, searchQuery: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                        />
                                        {driverModal.searchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setDriverModal({ ...driverModal, searchQuery: '' })}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                <span className="material-symbols-outlined text-lg">close</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Driver Selection */}
                                    {availableDrivers.length === 0 ? (
                                        <div className="text-center py-8">
                                            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                                <span className="material-symbols-outlined text-3xl text-gray-400">person_off</span>
                                            </div>
                                            <p className="text-gray-500 font-medium">ไม่มีคนขับว่าง</p>
                                            <p className="text-sm text-gray-400 mt-1">กรุณาเพิ่มคนขับหรือกรอกข้อมูลเอง</p>
                                            <button
                                                onClick={() => setDriverModal({ ...driverModal, mode: 'manual' })}
                                                className="mt-3 px-4 py-2 bg-purple-100 text-purple-600 rounded-lg text-sm font-bold"
                                            >
                                                กรอกข้อมูลเอง
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-80 overflow-y-auto">
                                            {availableDrivers.map((driver) => (
                                                <button
                                                    key={driver.id}
                                                    onClick={() => setDriverModal({ ...driverModal, selectedDriverId: driver.id })}
                                                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${driverModal.selectedDriverId === driver.id
                                                            ? 'border-purple-500 bg-purple-50'
                                                            : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${driverModal.selectedDriverId === driver.id
                                                                ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
                                                                : 'bg-gradient-to-br from-gray-400 to-gray-500'
                                                            }`}>
                                                            {driver.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="font-bold text-gray-800">{driver.name}</p>
                                                            <p className="text-sm text-gray-500">{driver.phone}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                {driver.vehicleModel && (
                                                                    <span className="text-xs text-gray-500">{driver.vehicleModel}</span>
                                                                )}
                                                                {driver.vehiclePlate && (
                                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono font-bold">
                                                                        {driver.vehiclePlate}
                                                                    </span>
                                                                )}
                                                                {driver.vehicleColor && (
                                                                    <span className="text-xs text-gray-400">• {driver.vehicleColor}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {driverModal.selectedDriverId === driver.id && (
                                                            <span className="material-symbols-outlined text-purple-600 text-2xl">check_circle</span>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    {/* Manual Entry */}
                                    <div>
                                        <label htmlFor="manual-driver-name" className="block text-xs font-bold text-gray-500 uppercase mb-2">ชื่อคนขับ *</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">person</span>
                                            <input
                                                id="manual-driver-name"
                                                name="driverName"
                                                type="text"
                                                autoComplete="name"
                                                value={driverModal.driverName}
                                                onChange={(e) => setDriverModal({ ...driverModal, driverName: e.target.value })}
                                                placeholder="ชื่อ-นามสกุล คนขับ"
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="manual-driver-phone" className="block text-xs font-bold text-gray-500 uppercase mb-2">เบอร์โทรคนขับ *</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">phone</span>
                                            <input
                                                id="manual-driver-phone"
                                                name="driverPhone"
                                                type="tel"
                                                autoComplete="tel"
                                                value={driverModal.driverPhone}
                                                onChange={(e) => setDriverModal({ ...driverModal, driverPhone: e.target.value })}
                                                placeholder="08x-xxx-xxxx"
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor="manual-vehicle-plate" className="block text-xs font-bold text-gray-500 uppercase mb-2">ทะเบียนรถ</label>
                                            <input
                                                id="manual-vehicle-plate"
                                                name="vehiclePlate"
                                                type="text"
                                                autoComplete="off"
                                                value={driverModal.vehiclePlate}
                                                onChange={(e) => setDriverModal({ ...driverModal, vehiclePlate: e.target.value })}
                                                placeholder="กข 1234"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="manual-vehicle-model" className="block text-xs font-bold text-gray-500 uppercase mb-2">รุ่นรถ</label>
                                            <input
                                                id="manual-vehicle-model"
                                                name="vehicleModel"
                                                type="text"
                                                autoComplete="off"
                                                value={driverModal.vehicleModel}
                                                onChange={(e) => setDriverModal({ ...driverModal, vehicleModel: e.target.value })}
                                                placeholder="Toyota Camry"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            <p className="text-xs text-blue-600 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">info</span>
                                ระบบจะส่ง notification แจ้งลูกค้าพร้อมข้อมูลคนขับ
                            </p>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setDriverModal({ show: false, bookingId: '', selectedDriverId: '', driverName: '', driverPhone: '', vehiclePlate: '', vehicleModel: '', mode: 'select', searchQuery: '' })}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={handleAssignDriver}
                                    disabled={
                                        (driverModal.mode === 'select' && !driverModal.selectedDriverId) ||
                                        (driverModal.mode === 'manual' && (!driverModal.driverName || !driverModal.driverPhone))
                                    }
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    มอบหมาย
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
