import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { safeErrorMessage, logError } from '@/lib/utils/safeError';
import { checkPaymentRateLimit, getRateLimitResponse } from '@/lib/utils/rateLimit';

/**
 * Confirm Payment API
 * Updates booking status after successful Stripe payment
 *
 * POST /api/payment/confirm
 * Body: { bookingId: string }
 * Returns: { success: true }
 */

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

        // Verify ownership
        if (bookingData?.userId !== userId) {
            return NextResponse.json(
                { success: false, error: 'You are not authorized to confirm this booking' },
                { status: 403 }
            );
        }

        // 4. Check if booking has a PaymentIntent (paid with card)
        if (!bookingData?.stripePaymentIntentId) {
            return NextResponse.json(
                { success: false, error: 'This booking has no card payment to confirm' },
                { status: 400 }
            );
        }

        // 5. Update booking status and payment status
        const statusHistory = bookingData?.statusHistory || [];
        statusHistory.push({
            status: 'pending',
            timestamp: Timestamp.now(),  // ใช้ Timestamp.now() ใน array (ไม่ใช่ FieldValue.serverTimestamp())
            note: 'Payment completed via Stripe',
            updatedBy: 'system',
        });

        await bookingRef.update({
            status: 'pending',
            paymentStatus: 'paid',
            paymentCompletedAt: FieldValue.serverTimestamp(),
            statusHistory,
            updatedAt: FieldValue.serverTimestamp(),
        });

        // 6. Create notification for user
        await adminDb.collection('notifications').add({
            userId: userId,
            type: 'payment',
            title: 'ชำระเงินสำเร็จ',
            message: `ชำระเงินสำหรับการจอง ${bookingId.slice(-6).toUpperCase()} เรียบร้อยแล้ว`,
            data: { bookingId },
            isRead: false,
            createdAt: FieldValue.serverTimestamp(),
        });

        // 7. Create admin notification
        await adminDb.collection('admin_notifications').add({
            type: 'payment_received',
            title: 'ได้รับชำระเงิน',
            message: `ได้รับชำระเงินสำหรับการจอง ${bookingId.slice(-6).toUpperCase()}`,
            data: { bookingId, amount: bookingData?.totalCost },
            isRead: false,
            createdAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
            success: true,
            message: 'Payment confirmed successfully',
        });

    } catch (error: unknown) {
        logError('payment/confirm/POST', error, { bookingId: 'from-request' });
        return NextResponse.json(
            { success: false, error: safeErrorMessage(error, 'ไม่สามารถยืนยันการชำระเงินได้') },
            { status: 500 }
        );
    }
}
