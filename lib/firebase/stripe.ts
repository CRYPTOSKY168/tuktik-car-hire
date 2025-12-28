import { db } from './config';
import {
    collection,
    addDoc,
    onSnapshot,
    query,
    where,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    Timestamp
} from 'firebase/firestore';

// Stripe Checkout Session Interface
export interface CheckoutSessionData {
    mode: 'payment';
    success_url: string;
    cancel_url: string;
    line_items: Array<{
        price_data: {
            currency: string;
            product_data: {
                name: string;
                description?: string;
                images?: string[];
            };
            unit_amount: number; // Amount in smallest currency unit (satang for THB)
        };
        quantity: number;
    }>;
    metadata?: {
        bookingId?: string;
        pickupLocation?: string;
        dropoffLocation?: string;
        vehicleName?: string;
        pickupDate?: string;
        customerName?: string;
        customerEmail?: string;
        customerPhone?: string;
    };
}

export interface CheckoutSession {
    id: string;
    url?: string;
    sessionId?: string;
    error?: { message: string };
    created: any;
}

export const StripeService = {
    /**
     * Create a Stripe Checkout Session for payment
     * This creates a document in the Firebase Extension's checkout_sessions collection
     * The extension will automatically create the Stripe session and add the URL
     */
    async createCheckoutSession(
        userId: string,
        bookingDetails: {
            bookingId: string;
            vehicleName: string;
            pickupLocation: string;
            dropoffLocation: string;
            pickupDate: string;
            pickupTime: string;
            tripType: string;
            totalAmount: number; // THB
            customerName: string;
            customerEmail: string;
            customerPhone: string;
        }
    ): Promise<string> {
        if (!db) throw new Error('Firebase not initialized');

        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

        // Convert THB to satang (smallest unit - multiply by 100)
        const amountInSatang = Math.round(bookingDetails.totalAmount * 100);

        // Create checkout session document
        const sessionData: CheckoutSessionData = {
            mode: 'payment',
            success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingDetails.bookingId}`,
            cancel_url: `${baseUrl}/payment/cancel?booking_id=${bookingDetails.bookingId}`,
            line_items: [
                {
                    price_data: {
                        currency: 'thb',
                        product_data: {
                            name: `Tuktik Transfer - ${bookingDetails.vehicleName}`,
                            description: `${bookingDetails.pickupLocation} → ${bookingDetails.dropoffLocation} | ${bookingDetails.pickupDate} ${bookingDetails.pickupTime} | ${bookingDetails.tripType === 'roundTrip' ? 'Round Trip' : 'One Way'}`,
                            images: ['https://tuktik.vercel.app/images/logo.png'],
                        },
                        unit_amount: amountInSatang,
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                bookingId: bookingDetails.bookingId,
                pickupLocation: bookingDetails.pickupLocation,
                dropoffLocation: bookingDetails.dropoffLocation,
                vehicleName: bookingDetails.vehicleName,
                pickupDate: bookingDetails.pickupDate,
                customerName: bookingDetails.customerName,
                customerEmail: bookingDetails.customerEmail,
                customerPhone: bookingDetails.customerPhone,
            },
        };

        try {
            // Add to Firebase Extension's checkout_sessions collection
            const checkoutSessionRef = collection(db, 'customers', userId, 'checkout_sessions');
            const docRef = await addDoc(checkoutSessionRef, sessionData);

            return docRef.id;
        } catch (error) {
            console.error('Error creating checkout session:', error);
            throw error;
        }
    },

    /**
     * Subscribe to checkout session updates
     * The Firebase Extension will update the document with the Stripe URL
     */
    subscribeToCheckoutSession(
        userId: string,
        sessionId: string,
        callback: (session: CheckoutSession | null, error?: string) => void
    ): () => void {
        if (!db) {
            callback(null, 'Firebase not initialized');
            return () => {};
        }

        const sessionRef = doc(db, 'customers', userId, 'checkout_sessions', sessionId);

        return onSnapshot(
            sessionRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();

                    // Check for errors
                    if (data.error) {
                        callback(null, data.error.message);
                        return;
                    }

                    // Check if URL is ready
                    if (data.url) {
                        callback({
                            id: snapshot.id,
                            url: data.url,
                            sessionId: data.sessionId,
                            created: data.created,
                        });
                    } else {
                        // Still waiting for URL
                        callback({
                            id: snapshot.id,
                            created: data.created,
                        });
                    }
                } else {
                    callback(null, 'Session not found');
                }
            },
            (error) => {
                console.error('Error subscribing to checkout session:', error);
                callback(null, error.message);
            }
        );
    },

    /**
     * Get user's payment history
     */
    async getPaymentHistory(userId: string): Promise<any[]> {
        if (!db) return [];

        try {
            const paymentsRef = collection(db, 'customers', userId, 'payments');
            const snapshot = await getDocs(paymentsRef);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error fetching payment history:', error);
            return [];
        }
    },

    /**
     * Subscribe to payment status updates
     */
    subscribeToPayments(
        userId: string,
        callback: (payments: any[]) => void
    ): () => void {
        if (!db) {
            callback([]);
            return () => {};
        }

        const paymentsRef = collection(db, 'customers', userId, 'payments');

        return onSnapshot(
            paymentsRef,
            (snapshot) => {
                const payments = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                callback(payments);
            },
            (error) => {
                console.error('Error subscribing to payments:', error);
                callback([]);
            }
        );
    },

    /**
     * Link a Stripe payment to a booking
     */
    async linkPaymentToBooking(
        bookingId: string,
        stripeSessionId: string,
        stripePaymentIntentId?: string
    ): Promise<void> {
        if (!db) throw new Error('Firebase not initialized');

        try {
            const bookingRef = doc(db, 'bookings', bookingId);
            await updateDoc(bookingRef, {
                stripeSessionId,
                stripePaymentIntentId: stripePaymentIntentId || null,
                paymentStatus: 'processing',
                paymentMethod: 'card',
                updatedAt: Timestamp.now()
            });
        } catch (error) {
            console.error('Error linking payment to booking:', error);
            throw error;
        }
    },

    /**
     * Update booking payment status after successful payment
     */
    async updateBookingPaymentSuccess(
        bookingId: string,
        paymentDetails: {
            stripePaymentIntentId?: string;
            amountPaid?: number;
            currency?: string;
        }
    ): Promise<void> {
        if (!db) throw new Error('Firebase not initialized');

        try {
            const bookingRef = doc(db, 'bookings', bookingId);

            // Get current booking to update status history
            const bookingSnap = await getDoc(bookingRef);
            const currentData = bookingSnap.data();
            const statusHistory = currentData?.statusHistory || [];

            // Add status history entry
            statusHistory.push({
                status: 'confirmed',
                timestamp: Timestamp.now(),
                note: 'Payment received via Stripe'
            });

            await updateDoc(bookingRef, {
                paymentStatus: 'paid',
                status: 'confirmed',
                statusHistory,
                stripePaymentIntentId: paymentDetails.stripePaymentIntentId || null,
                amountPaid: paymentDetails.amountPaid || null,
                paidCurrency: paymentDetails.currency || 'thb',
                paidAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
        } catch (error) {
            console.error('Error updating payment success:', error);
            throw error;
        }
    },

    /**
     * Mark booking as payment failed
     */
    async updateBookingPaymentFailed(
        bookingId: string,
        errorMessage?: string
    ): Promise<void> {
        if (!db) throw new Error('Firebase not initialized');

        try {
            const bookingRef = doc(db, 'bookings', bookingId);
            await updateDoc(bookingRef, {
                paymentStatus: 'failed',
                paymentError: errorMessage || 'Payment was cancelled or failed',
                updatedAt: Timestamp.now()
            });
        } catch (error) {
            console.error('Error updating payment failed:', error);
            throw error;
        }
    }
};
