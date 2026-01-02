import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { safeErrorMessage, logError } from '@/lib/utils/safeError';

/**
 * Payment Intent API
 * Creates a Stripe PaymentIntent for embedded payment (Payment Element)
 *
 * POST /api/payment/create-intent
 * Body: { bookingId: string, amount: number, currency?: string }
 * Returns: { success: true, clientSecret: string, paymentIntentId: string }
 */

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Helper function to verify user authentication
async function verifyAuth(request: NextRequest): Promise<{ success: boolean; error?: string; userId?: string }> {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { success: false, error: 'Unauthorized - No token provided' };
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        return { success: true, userId: decodedToken.uid };
    } catch (err) {
        return { success: false, error: 'Unauthorized - Invalid token' };
    }
}

export async function POST(request: NextRequest) {
    try {
        // 1. Verify authentication
        const authResult = await verifyAuth(request);
        if (!authResult.success) {
            return NextResponse.json(
                { success: false, error: authResult.error },
                { status: 401 }
            );
        }

        const userId = authResult.userId!;

        // 2. Parse request body
        const body = await request.json();
        const { bookingId } = body;

        if (!bookingId) {
            return NextResponse.json(
                { success: false, error: 'bookingId is required' },
                { status: 400 }
            );
        }

        // 3. Verify booking exists and belongs to user
        const bookingRef = adminDb.collection('bookings').doc(bookingId);
        const bookingSnap = await bookingRef.get();

        if (!bookingSnap.exists) {
            return NextResponse.json(
                { success: false, error: 'Booking not found' },
                { status: 404 }
            );
        }

        const bookingData = bookingSnap.data();

        if (bookingData?.userId !== userId) {
            return NextResponse.json(
                { success: false, error: 'You are not authorized to pay for this booking' },
                { status: 403 }
            );
        }

        // 4. Check if already paid
        if (bookingData?.paymentStatus === 'paid') {
            return NextResponse.json(
                { success: false, error: 'This booking has already been paid' },
                { status: 400 }
            );
        }

        // 5. Get amount from booking (NOT from request!) - SECURITY FIX
        const amount = bookingData?.totalCost;
        const currency = 'thb'; // Fixed currency

        if (!amount || amount <= 0) {
            return NextResponse.json(
                { success: false, error: 'Invalid booking amount' },
                { status: 400 }
            );
        }

        // 5. Check if there's an existing PaymentIntent
        if (bookingData?.stripePaymentIntentId) {
            // Try to retrieve existing PaymentIntent
            try {
                const existingIntent = await stripe.paymentIntents.retrieve(
                    bookingData.stripePaymentIntentId
                );

                // If it's still valid (not canceled, not succeeded), return it
                if (existingIntent.status === 'requires_payment_method' ||
                    existingIntent.status === 'requires_confirmation' ||
                    existingIntent.status === 'requires_action') {
                    return NextResponse.json({
                        success: true,
                        clientSecret: existingIntent.client_secret,
                        paymentIntentId: existingIntent.id,
                        reused: true
                    });
                }
            } catch (e) {
                // PaymentIntent not found or error, create new one
                console.log('Existing PaymentIntent not usable, creating new one');
            }
        }

        // 6. Convert amount to smallest currency unit (satang for THB)
        const amountInSmallestUnit = Math.round(amount * 100);

        // 7. Create PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInSmallestUnit,
            currency: currency.toLowerCase(),
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                bookingId: bookingId,
                userId: userId,
                pickupLocation: bookingData?.pickupLocation || '',
                dropoffLocation: bookingData?.dropoffLocation || '',
                vehicleName: bookingData?.vehicleName || '',
            },
            description: `TukTik Transfer - ${bookingData?.vehicleName || 'Ride'} from ${bookingData?.pickupLocation || ''} to ${bookingData?.dropoffLocation || ''}`,
        });

        // 8. Update booking with PaymentIntent ID
        await bookingRef.update({
            stripePaymentIntentId: paymentIntent.id,
            paymentStatus: 'processing',
            paymentMethod: 'card',
            updatedAt: FieldValue.serverTimestamp(),
        });

        // 9. Return client secret
        return NextResponse.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
        });

    } catch (error: unknown) {
        logError('payment/create-intent', error, { bookingId: 'from-request' });

        // Handle Stripe-specific errors - show user-friendly messages
        const stripeError = error as { type?: string; message?: string };
        if (stripeError.type === 'StripeCardError') {
            // Card errors are safe to show (e.g., "Your card was declined")
            return NextResponse.json(
                { success: false, error: stripeError.message || 'Card error' },
                { status: 400 }
            );
        }

        // For all other errors, use safe error message
        return NextResponse.json(
            { success: false, error: safeErrorMessage(error, 'ไม่สามารถสร้างการชำระเงินได้ กรุณาลองใหม่') },
            { status: 500 }
        );
    }
}
