'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { StripeService } from '@/lib/firebase/stripe';
import Link from 'next/link';

function PaymentCancelContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading: authLoading } = useAuth();

    const [isProcessing, setIsProcessing] = useState(true);

    const bookingId = searchParams.get('booking_id');

    useEffect(() => {
        const handleCancellation = async () => {
            if (authLoading) return;

            if (!user) {
                router.push('/login');
                return;
            }

            // If we have a booking ID, update its status
            if (bookingId) {
                try {
                    await StripeService.updateBookingPaymentFailed(
                        bookingId,
                        'Payment was cancelled by user'
                    );
                } catch (err) {
                    console.error('Error updating booking status:', err);
                }
            }

            setIsProcessing(false);
        };

        handleCancellation();
    }, [user, authLoading, bookingId, router]);

    // Loading State
    if (isProcessing) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin"></div>
                    <p className="text-gray-500 dark:text-gray-400">Processing...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden max-w-lg w-full">
                {/* Header */}
                <div className="bg-gradient-to-r from-gray-700 to-gray-800 p-8 text-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                        <div className="absolute bottom-0 right-0 w-48 h-48 bg-white rounded-full translate-x-1/3 translate-y-1/3"></div>
                    </div>
                    <div className="relative z-10">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <span className="material-symbols-outlined text-gray-500 text-5xl">cancel</span>
                        </div>
                        <h1 className="text-3xl font-black text-white mb-2">Payment Cancelled</h1>
                        <p className="text-gray-300">Your payment was not completed</p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8">
                    <div className="space-y-6">
                        {/* Info Box */}
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-800/50 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">info</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-amber-800 dark:text-amber-300 mb-1">No charges were made</h3>
                                    <p className="text-sm text-amber-700 dark:text-amber-400">
                                        Your credit card or bank account has not been charged. You can try again or choose a different payment method.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Reasons */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-5">
                            <h3 className="font-bold text-gray-800 dark:text-white mb-4">Common reasons for cancellation:</h3>
                            <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                                <li className="flex items-center gap-3">
                                    <span className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                                    Browser window was closed
                                </li>
                                <li className="flex items-center gap-3">
                                    <span className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                                    Back button was pressed
                                </li>
                                <li className="flex items-center gap-3">
                                    <span className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                                    Payment was declined by your bank
                                </li>
                                <li className="flex items-center gap-3">
                                    <span className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                                    Session timeout
                                </li>
                            </ul>
                        </div>

                        {/* Help */}
                        <div className="text-center p-4 border border-gray-100 dark:border-gray-700 rounded-xl">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Need help? Contact us at{' '}
                                <a href="tel:+66812345678" className="text-blue-600 hover:underline font-semibold">
                                    +66 81 234 5678
                                </a>
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3 mt-8">
                        <Link
                            href="/payment"
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all text-center shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">refresh</span>
                            Try Again
                        </Link>
                        <Link
                            href="/vehicles"
                            className="w-full py-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl transition-colors text-center flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">arrow_back</span>
                            Back to Vehicle Selection
                        </Link>
                        <Link
                            href="/"
                            className="w-full py-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-semibold transition-colors text-center text-sm"
                        >
                            Return to Homepage
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}

// Loading component for Suspense
function LoadingState() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin"></div>
                <p className="text-gray-500 dark:text-gray-400">Loading...</p>
            </div>
        </main>
    );
}

export default function PaymentCancelPage() {
    return (
        <Suspense fallback={<LoadingState />}>
            <PaymentCancelContent />
        </Suspense>
    );
}
