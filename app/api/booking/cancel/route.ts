// ====================================
// TukTik Car Rental - Cancel Booking API
// Passenger Rules: Cancellation with fee calculation
// ====================================

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { CancellationReason } from '@/lib/types';
import { DEFAULT_SYSTEM_CONFIG } from '@/lib/types';

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_LIMIT_WINDOW = 60000; // 1 minute

function checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userLimit = rateLimitMap.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
        rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return true;
    }

    if (userLimit.count >= RATE_LIMIT) {
        return false;
    }

    userLimit.count++;
    return true;
}

/**
 * POST /api/booking/cancel
 * Cancel a booking with fee calculation based on PassengerConfig
 *
 * Body:
 * {
 *   bookingId: string,
 *   reason: CancellationReason | string,
 *   note?: string
 * }
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Verify authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, error: 'กรุณาเข้าสู่ระบบก่อนยกเลิกการจอง' },
                { status: 401 }
            );
        }

        const token = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch {
            return NextResponse.json(
                { success: false, error: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่' },
                { status: 401 }
            );
        }

        const userId = decodedToken.uid;

        // 2. Rate limiting
        if (!checkRateLimit(userId)) {
            return NextResponse.json(
                { success: false, error: 'คุณยกเลิกบ่อยเกินไป กรุณารอสักครู่' },
                { status: 429 }
            );
        }

        // 3. Parse request body
        const body = await request.json();
        const { bookingId, reason, note } = body;

        if (!bookingId) {
            return NextResponse.json(
                { success: false, error: 'กรุณาระบุ bookingId' },
                { status: 400 }
            );
        }

        // 4. Get booking
        const bookingRef = adminDb.collection('bookings').doc(bookingId);
        const bookingSnap = await bookingRef.get();

        if (!bookingSnap.exists) {
            return NextResponse.json(
                { success: false, error: 'ไม่พบข้อมูลการจอง' },
                { status: 404 }
            );
        }

        const booking = bookingSnap.data()!;

        // 5. Check ownership (only booking owner can cancel)
        if (booking.userId !== userId) {
            // Check if admin
            const userDoc = await adminDb.collection('users').doc(userId).get();
            const userData = userDoc.data();
            if (userData?.role !== 'admin') {
                return NextResponse.json(
                    { success: false, error: 'คุณไม่มีสิทธิ์ยกเลิกการจองนี้' },
                    { status: 403 }
                );
            }
        }

        // 6. Check if booking can be cancelled
        const cancellableStatuses = ['pending', 'confirmed', 'driver_assigned'];
        if (!cancellableStatuses.includes(booking.status)) {
            const statusMessages: Record<string, string> = {
                'awaiting_payment': 'กรุณาชำระเงินก่อนหรือรอหมดเวลา',
                'driver_en_route': 'คนขับกำลังเดินทางมา ไม่สามารถยกเลิกได้',
                'in_progress': 'การเดินทางเริ่มต้นแล้ว ไม่สามารถยกเลิกได้',
                'completed': 'การเดินทางเสร็จสิ้นแล้ว',
                'cancelled': 'การจองนี้ถูกยกเลิกไปแล้ว',
            };
            return NextResponse.json(
                {
                    success: false,
                    error: statusMessages[booking.status] || 'ไม่สามารถยกเลิกการจองในสถานะนี้ได้'
                },
                { status: 400 }
            );
        }

        // 7. Get system configuration
        let passengerConfig = DEFAULT_SYSTEM_CONFIG.passenger;
        try {
            const configSnap = await adminDb.collection('settings').doc('system_config').get();
            if (configSnap.exists) {
                const configData = configSnap.data();
                passengerConfig = { ...passengerConfig, ...configData?.passenger };
            }
        } catch (e) {
            console.error('Error fetching config, using defaults:', e);
        }

        // 8. Check daily cancellation limit
        if (passengerConfig.enableCancellationLimit) {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const cancellationsToday = await adminDb.collection('bookings')
                .where('userId', '==', userId)
                .where('status', '==', 'cancelled')
                .where('cancelledBy', '==', 'customer')
                .where('cancelledAt', '>=', Timestamp.fromDate(todayStart))
                .get();

            if (cancellationsToday.size >= passengerConfig.maxCancellationsPerDay) {
                return NextResponse.json(
                    {
                        success: false,
                        error: `คุณยกเลิกได้สูงสุด ${passengerConfig.maxCancellationsPerDay} ครั้งต่อวัน`
                    },
                    { status: 400 }
                );
            }
        }

        // 9. Calculate cancellation fee
        let cancellationFee = 0;
        let cancellationFeeStatus: 'waived' | 'pending' = 'waived';
        let feeReason = 'ไม่มีค่าธรรมเนียม';

        if (passengerConfig.enableCancellationFee && booking.status === 'driver_assigned') {
            const now = Date.now();
            const driverAssignedAt = booking.driverAssignedAt?.toDate?.()?.getTime() ||
                booking.driverAssignedAt?.seconds * 1000 ||
                now;

            const timeSinceAssignment = now - driverAssignedAt;

            // Check if within free cancellation window
            if (timeSinceAssignment <= passengerConfig.freeCancellationWindowMs) {
                feeReason = `ยกเลิกฟรี (ภายใน ${passengerConfig.freeCancellationWindowMs / 60000} นาที)`;
            }
            // Check if driver is late (waiver)
            else if (passengerConfig.enableDriverLateWaiver) {
                const pickupDateTime = new Date(`${booking.pickupDate}T${booking.pickupTime}`);
                const driverLateThreshold = pickupDateTime.getTime() + passengerConfig.driverLateThresholdMs;

                if (now > driverLateThreshold && booking.status === 'driver_assigned') {
                    feeReason = 'ยกเลิกฟรี (คนขับมาช้า)';
                } else {
                    // Apply late cancellation fee
                    cancellationFee = passengerConfig.lateCancellationFee;
                    cancellationFeeStatus = 'pending';
                    feeReason = `ค่าธรรมเนียมยกเลิก ฿${cancellationFee}`;
                }
            } else {
                // Apply late cancellation fee
                cancellationFee = passengerConfig.lateCancellationFee;
                cancellationFeeStatus = 'pending';
                feeReason = `ค่าธรรมเนียมยกเลิก ฿${cancellationFee}`;
            }
        }

        // 10. Prepare status history entry
        const statusHistoryEntry = {
            status: 'cancelled',
            timestamp: Timestamp.now(),
            note: note || `ยกเลิกโดยลูกค้า: ${reason || 'ไม่ระบุเหตุผล'}`,
            updatedBy: 'customer',
        };

        // 11. Update booking
        const updateData: Record<string, any> = {
            status: 'cancelled',
            cancelledAt: Timestamp.now(),
            cancelledBy: 'customer',
            cancellationReason: reason || CancellationReason.OTHER,
            cancellationFee,
            cancellationFeeStatus,
            statusHistory: FieldValue.arrayUnion(statusHistoryEntry),
            updatedAt: Timestamp.now(),
        };

        await bookingRef.update(updateData);

        // 12. If driver was assigned, release the driver
        if (booking.driver?.driverId) {
            const driverRef = adminDb.collection('drivers').doc(booking.driver.driverId);
            await driverRef.update({
                status: 'available',
                updatedAt: Timestamp.now(),
            });

            // Notify driver
            await adminDb.collection('notifications').add({
                userId: booking.driver.driverId,
                type: 'booking',
                title: 'งานถูกยกเลิก',
                message: `ลูกค้ายกเลิกการจอง: ${booking.pickupLocation} → ${booking.dropoffLocation}`,
                data: { bookingId, reason },
                isRead: false,
                createdAt: Timestamp.now(),
            });
        }

        // 13. Create admin notification
        await adminDb.collection('admin_notifications').add({
            type: 'booking_cancelled',
            title: 'การจองถูกยกเลิก',
            message: `${booking.firstName || 'ลูกค้า'} ยกเลิกการจอง - ${booking.pickupLocation} → ${booking.dropoffLocation}`,
            data: {
                bookingId,
                reason,
                cancellationFee,
                feeStatus: cancellationFeeStatus,
            },
            isRead: false,
            createdAt: Timestamp.now(),
        });

        // 14. Return success response
        return NextResponse.json({
            success: true,
            message: 'ยกเลิกการจองเรียบร้อยแล้ว',
            data: {
                bookingId,
                status: 'cancelled',
                cancellationFee,
                cancellationFeeStatus,
                feeReason,
            },
        });

    } catch (error: any) {
        console.error('Cancel booking error:', error);
        return NextResponse.json(
            { success: false, error: 'เกิดข้อผิดพลาดในการยกเลิก กรุณาลองใหม่' },
            { status: 500 }
        );
    }
}
