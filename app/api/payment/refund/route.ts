import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { safeErrorMessage, logError } from '@/lib/utils/safeError';
import { checkPaymentRateLimit, getRateLimitResponse } from '@/lib/utils/rateLimit';

/**
 * Refund API
 * Refunds a Stripe PaymentIntent when booking is cancelled
 *
 * POST /api/payment/refund
 * Body: { bookingId: string, reason?: string }
 * Returns: { success: true, refundId: string, status: string }
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

        // 2. Check rate limit
        if (!checkPaymentRateLimit(userId)) {
            return NextResponse.json(
                getRateLimitResponse('payment'),
                { status: 429 }
            );
        }

        // 3. Parse request body
        const body = await request.json();
        const { bookingId, reason } = body;

        if (!bookingId) {
            return NextResponse.json(
                { success: false, error: 'bookingId is required' },
                { status: 400 }
            );
        }

        // 3. Get booking and verify ownership
        const bookingRef = adminDb.collection('bookings').doc(bookingId);
        const bookingSnap = await bookingRef.get();

        if (!bookingSnap.exists) {
            return NextResponse.json(
                { success: false, error: 'Booking not found' },
                { status: 404 }
            );
        }

        const bookingData = bookingSnap.data();

        // Only owner or admin can refund
        const userDoc = await adminDb.collection('users').doc(userId).get();
        const userData = userDoc.data();
        const isAdmin = userData?.role === 'admin';

        if (bookingData?.userId !== userId && !isAdmin) {
            return NextResponse.json(
                { success: false, error: 'You are not authorized to refund this booking' },
                { status: 403 }
            );
        }

        // 4. Check if booking has a PaymentIntent
        const paymentIntentId = bookingData?.stripePaymentIntentId;
        if (!paymentIntentId) {
            return NextResponse.json(
                { success: false, error: 'This booking has no card payment to refund' },
                { status: 400 }
            );
        }

        // 5. Check payment status
        if (bookingData?.paymentStatus === 'refunded') {
            return NextResponse.json(
                { success: false, error: 'This booking has already been refunded' },
                { status: 400 }
            );
        }

        // 6. Check if payment was successful
        try {
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

            if (paymentIntent.status !== 'succeeded') {
                return NextResponse.json(
                    { success: false, error: 'Cannot refund - payment was not completed' },
                    { status: 400 }
                );
            }
        } catch (err: unknown) {
            logError('payment/refund/retrieve', err, { paymentIntentId });
            return NextResponse.json(
                { success: false, error: 'ไม่สามารถดึงข้อมูลการชำระเงินได้' },
                { status: 400 }
            );
        }

        // 7. Create refund
        const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            reason: 'requested_by_customer',
            metadata: {
                bookingId: bookingId,
                refundedBy: userId,
                refundReason: reason || 'Booking cancelled',
            },
        });

        // 8. Update booking status
        const statusHistory = bookingData?.statusHistory || [];
        statusHistory.push({
            status: 'cancelled',
            timestamp: Timestamp.now(),  // ใช้ Timestamp.now() ใน array
            note: `Refunded: ${reason || 'Booking cancelled by customer'}`,
            updatedBy: isAdmin ? 'admin' : 'user',
        });

        await bookingRef.update({
            status: 'cancelled',
            paymentStatus: 'refunded',
            stripeRefundId: refund.id,
            refundedAt: FieldValue.serverTimestamp(),
            refundReason: reason || 'Booking cancelled',
            statusHistory,
            updatedAt: FieldValue.serverTimestamp(),
        });

        // 9. If driver was assigned, set them back to available
        if (bookingData?.driver?.driverId) {
            try {
                const driverRef = adminDb.collection('drivers').doc(bookingData.driver.driverId);
                await driverRef.update({
                    status: 'available',
                    updatedAt: FieldValue.serverTimestamp(),
                });
            } catch (e) {
                console.log('Could not update driver status:', e);
            }
        }

        // 10. Create notification for user
        if (bookingData?.userId) {
            await adminDb.collection('notifications').add({
                userId: bookingData.userId,
                type: 'payment',
                title: 'คืนเงินสำเร็จ',
                message: `คืนเงินสำหรับการจอง ${bookingId.slice(-6).toUpperCase()} เรียบร้อยแล้ว`,
                data: { bookingId, refundId: refund.id },
                isRead: false,
                createdAt: FieldValue.serverTimestamp(),
            });
        }

        return NextResponse.json({
            success: true,
            refundId: refund.id,
            status: refund.status,
            amount: refund.amount / 100, // Convert back from satang
            message: 'คืนเงินสำเร็จ',
        });

    } catch (error: unknown) {
        logError('payment/refund', error, { bookingId: 'from-request' });

        // Handle Stripe-specific errors - show generic messages
        const stripeError = error as { type?: string };
        if (stripeError.type === 'StripeInvalidRequestError') {
            return NextResponse.json(
                { success: false, error: 'ไม่สามารถคืนเงินได้ กรุณาติดต่อเจ้าหน้าที่' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: safeErrorMessage(error, 'ไม่สามารถคืนเงินได้ กรุณาลองใหม่') },
            { status: 500 }
        );
    }
}
