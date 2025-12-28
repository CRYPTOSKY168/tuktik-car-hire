'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useBooking } from '@/lib/contexts/BookingContext';
import { StripeService } from '@/lib/firebase/stripe';
import { FirestoreService } from '@/lib/firebase/firestore';
import Link from 'next/link';

function PaymentSuccessContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading: authLoading } = useAuth();
    const { resetBooking } = useBooking();

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [bookingDetails, setBookingDetails] = useState<any>(null);
    const [error, setError] = useState<string>('');

    const sessionId = searchParams.get('session_id');
    const bookingId = searchParams.get('booking_id');

    useEffect(() => {
        const verifyPayment = async () => {
            if (authLoading) return;

            if (!user) {
                router.push('/login');
                return;
            }

            if (!bookingId) {
                setError('Booking ID not found');
                setStatus('error');
                return;
            }

            try {
                const booking = await FirestoreService.getBooking(bookingId);

                if (!booking) {
                    setError('Booking not found');
                    setStatus('error');
                    return;
                }

                await StripeService.updateBookingPaymentSuccess(bookingId, {
                    stripePaymentIntentId: sessionId || undefined,
                    amountPaid: booking.totalCost,
                    currency: 'thb'
                });

                try {
                    await FirestoreService.addNotification(user.uid, {
                        type: 'payment',
                        title: 'Payment Successful',
                        message: `Your payment of ${booking.totalCost?.toLocaleString()} THB has been received. Booking #${bookingId.slice(-6).toUpperCase()}`,
                        data: { bookingId }
                    });
                } catch (e) {
                    console.warn('Failed to add notification:', e);
                }

                setBookingDetails(booking);
                setStatus('success');
                resetBooking();

            } catch (err: any) {
                console.error('Error verifying payment:', err);
                setError(err.message || 'Failed to verify payment');
                setStatus('error');
            }
        };

        verifyPayment();
    }, [user, authLoading, bookingId, sessionId, router, resetBooking]);

    // Loading State
    if (status === 'loading') {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-gray-600 dark:text-gray-400">กำลังตรวจสอบการชำระเงิน...</p>
                </div>
            </main>
        );
    }

    // Error State
    if (status === 'error') {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 max-w-sm w-full text-center">
                    <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-red-500 text-3xl">error</span>
                    </div>
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white mb-2">การชำระเงินไม่สำเร็จ</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
                    <div className="flex gap-2">
                        <Link href="/payment" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl text-center">
                            ลองอีกครั้ง
                        </Link>
                        <Link href="/dashboard" className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-xl text-center">
                            หน้าหลัก
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    // Success State - Clean Mobile-First Design
    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 px-4 sm:py-10">
            <div className="max-w-md mx-auto">
                {/* Success Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">

                    {/* Header - Centered & Clean */}
                    <div className="bg-gradient-to-br from-emerald-500 to-green-600 px-6 py-8 text-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <span className="material-symbols-outlined text-emerald-500 text-4xl">check_circle</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-1">ชำระเงินสำเร็จ!</h1>
                        <p className="text-emerald-100 text-sm">การจองของคุณได้รับการยืนยันแล้ว</p>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                        {bookingDetails && (
                            <>
                                {/* Booking ID */}
                                <div className="text-center mb-5 pb-5 border-b border-gray-100 dark:border-gray-700">
                                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">หมายเลขการจอง</p>
                                    <p className="text-2xl font-mono font-bold text-gray-800 dark:text-white">
                                        #{bookingId?.slice(-8).toUpperCase()}
                                    </p>
                                </div>

                                {/* Trip Details - Stacked Layout */}
                                <div className="space-y-3 mb-5">
                                    {/* Route */}
                                    <div className="flex items-start gap-3">
                                        <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <span className="material-symbols-outlined text-blue-600 text-xl">route</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-gray-400 uppercase">เส้นทาง</p>
                                            <p className="font-semibold text-gray-800 dark:text-white text-sm">
                                                {bookingDetails.pickupLocation}
                                            </p>
                                            <p className="text-gray-500 text-sm flex items-center gap-1">
                                                <span className="material-symbols-outlined text-base">arrow_forward</span>
                                                {bookingDetails.dropoffLocation}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Date & Time */}
                                    <div className="flex items-start gap-3">
                                        <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <span className="material-symbols-outlined text-purple-600 text-xl">event</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-gray-400 uppercase">วันที่และเวลา</p>
                                            <p className="font-semibold text-gray-800 dark:text-white text-sm">
                                                {new Date(bookingDetails.pickupDate).toLocaleDateString('th-TH', {
                                                    weekday: 'short',
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                            </p>
                                            <p className="text-gray-500 text-sm">{bookingDetails.pickupTime} น.</p>
                                        </div>
                                    </div>

                                    {/* Vehicle */}
                                    <div className="flex items-start gap-3">
                                        <div className="w-9 h-9 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <span className="material-symbols-outlined text-amber-600 text-xl">directions_car</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-gray-400 uppercase">รถ</p>
                                            <p className="font-semibold text-gray-800 dark:text-white text-sm">
                                                {bookingDetails.vehicle?.name || 'Standard Vehicle'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Amount Paid */}
                                <div className="flex justify-between items-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl mb-5">
                                    <span className="text-gray-600 dark:text-gray-400">ยอดที่ชำระแล้ว</span>
                                    <span className="text-2xl font-bold text-emerald-600">
                                        ฿{bookingDetails.totalCost?.toLocaleString()}
                                    </span>
                                </div>

                                {/* Info */}
                                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-xs mb-5">
                                    <span className="material-symbols-outlined text-blue-600 text-base flex-shrink-0">info</span>
                                    <p className="text-blue-700 dark:text-blue-300">
                                        เราจะส่งอีเมลยืนยันให้คุณ และคนขับจะติดต่อก่อนถึงเวลารับ
                                    </p>
                                </div>
                            </>
                        )}

                        {/* Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            <Link
                                href={`/confirmation?bookingId=${bookingId}`}
                                className="py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl text-center flex items-center justify-center gap-1.5 transition-colors"
                            >
                                <span className="material-symbols-outlined text-lg">receipt_long</span>
                                ดูรายละเอียด
                            </Link>
                            <Link
                                href="/dashboard"
                                className="py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-xl text-center flex items-center justify-center gap-1.5 transition-colors"
                            >
                                <span className="material-symbols-outlined text-lg">home</span>
                                หน้าหลัก
                            </Link>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex justify-center gap-6 mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
                            <button
                                onClick={() => {
                                    if (navigator.share) {
                                        navigator.share({
                                            title: 'การจอง TukTik',
                                            text: `การจอง #${bookingId?.slice(-8).toUpperCase()} สำเร็จแล้ว!`,
                                            url: window.location.href
                                        });
                                    }
                                }}
                                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                            >
                                <span className="material-symbols-outlined text-lg">share</span>
                                แชร์
                            </button>
                            <button
                                onClick={() => {
                                    if (!bookingDetails) return;
                                    const startDate = new Date(bookingDetails.pickupDate);
                                    const [hours, minutes] = (bookingDetails.pickupTime || '09:00').split(':');
                                    startDate.setHours(parseInt(hours), parseInt(minutes));
                                    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

                                    const formatDate = (d: Date) => d.toISOString().replace(/-|:|\.\d{3}/g, '');
                                    const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`TukTik: ${bookingDetails.pickupLocation} → ${bookingDetails.dropoffLocation}`)}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${encodeURIComponent(`Booking #${bookingId?.slice(-8).toUpperCase()}`)}`;
                                    window.open(calUrl, '_blank');
                                }}
                                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                            >
                                <span className="material-symbols-outlined text-lg">calendar_add_on</span>
                                เพิ่มปฏิทิน
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

// Loading component for Suspense
function LoadingState() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-500">Loading...</p>
            </div>
        </main>
    );
}

export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={<LoadingState />}>
            <PaymentSuccessContent />
        </Suspense>
    );
}
