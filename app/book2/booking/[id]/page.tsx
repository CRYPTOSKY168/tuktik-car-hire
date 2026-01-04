'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { BookingService } from '@/lib/firebase/services';
import { Booking, BookingStatus } from '@/lib/types';

export default function BookingTrackingPage() {
    const router = useRouter();
    const params = useParams();
    const bookingId = params.id as string;
    const { user, loading: authLoading } = useAuth();
    const { t } = useLanguage();

    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);

    // Subscribe to booking updates
    useEffect(() => {
        if (!bookingId || !db) return;

        const unsubscribe = onSnapshot(
            doc(db, 'bookings', bookingId),
            (docSnap) => {
                if (docSnap.exists()) {
                    setBooking({ id: docSnap.id, ...docSnap.data() } as Booking);
                } else {
                    setError(t.book2.bookingNotFound);
                }
                setLoading(false);
            },
            (error) => {
                console.error('Error fetching booking:', error);
                setError(t.book2.errorLoadingData);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [bookingId]);

    // Get status info
    const getStatusInfo = (status: string) => {
        switch (status) {
            case BookingStatus.PENDING:
                return {
                    label: t.book2.trackingStatus.pending,
                    description: t.book2.trackingStatus.pendingDesc,
                    icon: 'hourglass_empty',
                    color: 'text-[#FFB300]',
                    bgColor: 'bg-[#FFB300]/10',
                    step: 1
                };
            case BookingStatus.CONFIRMED:
                return {
                    label: t.book2.trackingStatus.confirmed,
                    description: t.book2.trackingStatus.confirmedDesc,
                    icon: 'check_circle',
                    color: 'text-[#00b250]',
                    bgColor: 'bg-[#00b250]/10',
                    step: 2
                };
            case BookingStatus.DRIVER_ASSIGNED:
                return {
                    label: t.book2.trackingStatus.driverAssigned,
                    description: t.book2.trackingStatus.driverAssignedDesc,
                    icon: 'person_pin',
                    color: 'text-blue-500',
                    bgColor: 'bg-blue-500/10',
                    step: 3
                };
            case BookingStatus.DRIVER_EN_ROUTE:
                return {
                    label: t.book2.trackingStatus.driverEnRoute,
                    description: t.book2.trackingStatus.driverEnRouteDesc,
                    icon: 'directions_car',
                    color: 'text-purple-500',
                    bgColor: 'bg-purple-500/10',
                    step: 4
                };
            case BookingStatus.IN_PROGRESS:
                return {
                    label: t.book2.trackingStatus.inProgress,
                    description: t.book2.trackingStatus.inProgressDesc,
                    icon: 'local_taxi',
                    color: 'text-cyan-500',
                    bgColor: 'bg-cyan-500/10',
                    step: 5
                };
            case BookingStatus.COMPLETED:
                return {
                    label: t.book2.trackingStatus.completed,
                    description: t.book2.trackingStatus.completedDesc,
                    icon: 'celebration',
                    color: 'text-[#00b250]',
                    bgColor: 'bg-[#00b250]/10',
                    step: 6
                };
            case BookingStatus.CANCELLED:
                return {
                    label: t.book2.trackingStatus.cancelled,
                    description: t.book2.trackingStatus.cancelledDesc,
                    icon: 'cancel',
                    color: 'text-red-500',
                    bgColor: 'bg-red-500/10',
                    step: 0
                };
            default:
                return {
                    label: status,
                    description: '',
                    icon: 'help',
                    color: 'text-gray-500',
                    bgColor: 'bg-gray-500/10',
                    step: 0
                };
        }
    };

    // Handle cancel booking
    const handleCancel = async () => {
        if (!booking) return;

        const cancellableStatuses = [BookingStatus.PENDING, BookingStatus.CONFIRMED];
        if (!cancellableStatuses.includes(booking.status as BookingStatus)) {
            alert(t.book2.cannotCancelNow);
            return;
        }

        if (!confirm(t.book2.cancelBookingConfirm)) return;

        setIsCancelling(true);
        try {
            await BookingService.updateBookingStatus(booking.id, BookingStatus.CANCELLED);
            router.push('/book2');
        } catch (error: any) {
            console.error('Error cancelling:', error);
            alert(error.message || t.book2.cannotCancel);
        } finally {
            setIsCancelling(false);
        }
    };

    // Loading state
    if (loading || authLoading) {
        return (
            <div className="min-h-screen bg-[#f5f8f7] dark:bg-[#0f2318] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00b250]"></div>
            </div>
        );
    }

    // Error state
    if (error || !booking) {
        return (
            <div className="min-h-screen bg-[#f5f8f7] dark:bg-[#0f2318] flex flex-col items-center justify-center p-4">
                <span className="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
                <p className="text-lg font-bold text-[#101814] dark:text-white mb-2">{error || t.book2.bookingNotFound}</p>
                <Link href="/book2" className="text-[#00b250] font-semibold">
                    {t.book2.backToHome}
                </Link>
            </div>
        );
    }

    const statusInfo = getStatusInfo(booking.status);
    const isActive = ![BookingStatus.COMPLETED, BookingStatus.CANCELLED].includes(booking.status as BookingStatus);
    const canCancel = [BookingStatus.PENDING, BookingStatus.CONFIRMED].includes(booking.status as BookingStatus);

    return (
        <div className="min-h-screen bg-[#f5f8f7] dark:bg-[#0f2318] pb-24 w-full">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-[#f5f8f7]/95 dark:bg-[#0f2318]/95 backdrop-blur-md border-b border-[#dae7e0] dark:border-[#2a4a38] px-4 pt-4 pb-3">
                <div className="flex items-center justify-between h-12">
                    <Link
                        href="/book2"
                        className="flex items-center justify-center size-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[#101814] dark:text-white">arrow_back</span>
                    </Link>
                    <h1 className="text-lg font-bold flex-1 text-center text-[#101814] dark:text-white">{t.book2.bookingStatus}</h1>
                    <div className="size-10" />
                </div>
            </header>

            {/* Status Card */}
            <div className="px-4 pt-6">
                <div className={`${statusInfo.bgColor} rounded-2xl p-6 mb-6`}>
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`size-16 rounded-full ${statusInfo.bgColor} flex items-center justify-center`}>
                            <span className={`material-symbols-outlined text-4xl ${statusInfo.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                                {statusInfo.icon}
                            </span>
                        </div>
                        <div>
                            <p className={`text-2xl font-bold ${statusInfo.color}`}>{statusInfo.label}</p>
                            <p className="text-sm text-[#5e8d73]">{statusInfo.description}</p>
                        </div>
                    </div>

                    {/* Progress Steps */}
                    {isActive && (
                        <div className="flex items-center gap-1 mt-4">
                            {[1, 2, 3, 4, 5].map((step) => (
                                <div
                                    key={step}
                                    className={`flex-1 h-1.5 rounded-full transition-colors ${
                                        step <= statusInfo.step
                                            ? 'bg-[#00b250]'
                                            : 'bg-gray-300'
                                    }`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Trip Details */}
                <div className="bg-white rounded-2xl border border-[#dae7e0] p-4 mb-4">
                    <h3 className="text-sm font-semibold text-[#5e8d73] uppercase mb-3">{t.book2.tripDetails}</h3>

                    <div className="flex gap-3">
                        {/* Route Visual */}
                        <div className="flex flex-col items-center pt-1">
                            <div className="size-3 rounded-full bg-[#00b250] border-2 border-white shadow-sm" />
                            <div className="w-0.5 border-l-2 border-dashed border-[#dae7e0] grow my-1 min-h-[24px]" />
                            <div className="size-3 rounded-full bg-red-500 border-2 border-white shadow-sm" />
                        </div>

                        {/* Route Text */}
                        <div className="flex-1 flex flex-col gap-4">
                            <div>
                                <p className="text-xs text-[#5e8d73]">{t.book2.pickupAt}</p>
                                <p className="text-sm font-medium text-[#101814]">{booking.pickupLocation}</p>
                            </div>
                            <div>
                                <p className="text-xs text-[#5e8d73]">{t.book2.dropoffAt}</p>
                                <p className="text-sm font-medium text-[#101814]">{booking.dropoffLocation}</p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-[#dae7e0] mt-4 pt-4 flex justify-between items-center">
                        <div>
                            <p className="text-xs text-[#5e8d73]">{t.book2.vehicle}</p>
                            <p className="text-sm font-medium text-[#101814]">{booking.vehicleName}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-[#5e8d73]">{t.book2.price}</p>
                            <p className="text-lg font-bold text-[#00b250]">฿{booking.totalCost?.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Driver Card (if assigned) */}
                {booking.driver && (
                    <div className="bg-white rounded-2xl border border-[#dae7e0] p-4 mb-4">
                        <h3 className="text-sm font-semibold text-[#5e8d73] uppercase mb-3">{t.book2.yourDriver}</h3>
                        <div className="flex items-center gap-4">
                            <div className="size-14 rounded-full bg-[#00b250]/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[#00b250] text-3xl">person</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-base font-bold text-[#101814]">{booking.driver.name}</p>
                                <p className="text-sm text-[#5e8d73]">{booking.driver.vehicleModel} • {booking.driver.vehiclePlate}</p>
                            </div>
                            <a
                                href={`tel:${booking.driver.phone}`}
                                className="size-12 rounded-full bg-[#00b250] flex items-center justify-center"
                            >
                                <span className="material-symbols-outlined text-white">call</span>
                            </a>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 mt-6">
                    {canCancel && (
                        <button
                            onClick={handleCancel}
                            disabled={isCancelling}
                            className="w-full h-12 rounded-xl border-2 border-red-500 text-red-500 font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isCancelling ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500"></div>
                                    <span>{t.book2.cancelling}</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">cancel</span>
                                    <span>{t.book2.cancelBooking}</span>
                                </>
                            )}
                        </button>
                    )}

                    {booking.status === BookingStatus.COMPLETED && (
                        <Link
                            href="/book2"
                            className="w-full h-14 rounded-xl bg-[#00b250] text-white font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-[#00b250]/30"
                        >
                            <span>{t.book2.bookAgain}</span>
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </Link>
                    )}

                    {booking.status === BookingStatus.CANCELLED && (
                        <Link
                            href="/book2"
                            className="w-full h-14 rounded-xl bg-[#00b250] text-white font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-[#00b250]/30"
                        >
                            <span>{t.book2.bookNew}</span>
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </Link>
                    )}
                </div>

                {/* Contact Support */}
                <div className="text-center mt-8">
                    <p className="text-sm text-[#5e8d73]">
                        {t.book2.needHelp}{' '}
                        <button className="text-[#00b250] font-semibold">{t.book2.contactUs}</button>
                    </p>
                </div>
            </div>
        </div>
    );
}
