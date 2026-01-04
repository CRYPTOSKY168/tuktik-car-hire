// ====================================
// TukTik Car Rental - No-Show Report API
// Passenger Rules: Driver reports customer no-show
// ====================================

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { CancellationReason, DEFAULT_SYSTEM_CONFIG } from '@/lib/types';

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW = 60000;

function checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userLimit = rateLimitMap.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
        rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return true;
    }

    if (userLimit.count >= RATE_LIMIT) return false;
    userLimit.count++;
    return true;
}

/**
 * POST /api/booking/noshow/arrived
 * Driver marks arrival at pickup location
 *
 * Body: { bookingId: string }
 */
async function handleDriverArrived(request: NextRequest) {
    try {
        // 1. Verify authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, error: 'กรุณาเข้าสู่ระบบก่อน' },
                { status: 401 }
            );
        }

        const token = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch {
            return NextResponse.json(
                { success: false, error: 'Session หมดอายุ' },
                { status: 401 }
            );
        }

        const userId = decodedToken.uid;

        // 2. Parse request body
        const body = await request.json();
        const { bookingId } = body;

        if (!bookingId) {
            return NextResponse.json(
                { success: false, error: 'กรุณาระบุ bookingId' },
                { status: 400 }
            );
        }

        // 3. Get booking
        const bookingRef = adminDb.collection('bookings').doc(bookingId);
        const bookingSnap = await bookingRef.get();

        if (!bookingSnap.exists) {
            return NextResponse.json(
                { success: false, error: 'ไม่พบข้อมูลการจอง' },
                { status: 404 }
            );
        }

        const booking = bookingSnap.data()!;

        // 4. Verify driver ownership
        const userDoc = await adminDb.collection('users').doc(userId).get();
        const userData = userDoc.data();
        const driverId = userData?.driverId;

        if (!driverId || booking.driver?.driverId !== driverId) {
            return NextResponse.json(
                { success: false, error: 'คุณไม่ได้รับมอบหมายงานนี้' },
                { status: 403 }
            );
        }

        // 5. Check status (must be driver_en_route)
        if (booking.status !== 'driver_en_route') {
            return NextResponse.json(
                { success: false, error: 'สถานะไม่ถูกต้อง (ต้องเป็น driver_en_route)' },
                { status: 400 }
            );
        }

        // 6. Mark driver arrived
        await bookingRef.update({
            driverArrivedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });

        // 7. Notify customer
        if (booking.userId) {
            await adminDb.collection('notifications').add({
                userId: booking.userId,
                type: 'booking',
                title: 'คนขับถึงแล้ว',
                message: `คนขับถึงจุดรับแล้ว กรุณาออกมาขึ้นรถ`,
                data: { bookingId },
                isRead: false,
                createdAt: Timestamp.now(),
            });
        }

        // Get config for wait time info
        let passengerConfig = DEFAULT_SYSTEM_CONFIG.passenger;
        try {
            const configSnap = await adminDb.collection('settings').doc('system_config').get();
            if (configSnap.exists) {
                passengerConfig = { ...passengerConfig, ...configSnap.data()?.passenger };
            }
        } catch { /* use defaults */ }

        return NextResponse.json({
            success: true,
            message: 'บันทึกเวลาถึงจุดรับแล้ว',
            data: {
                bookingId,
                driverArrivedAt: Timestamp.now().toDate().toISOString(),
                waitTimeMs: passengerConfig.noShowWaitTimeMs,
                waitTimeMinutes: Math.round(passengerConfig.noShowWaitTimeMs / 60000),
            },
        });

    } catch (error: any) {
        console.error('Driver arrived error:', error);
        return NextResponse.json(
            { success: false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/booking/noshow
 * Driver reports customer no-show
 *
 * Body:
 * {
 *   bookingId: string,
 *   note?: string
 * }
 */
export async function POST(request: NextRequest) {
    try {
        // Check if this is "arrived" action
        const url = new URL(request.url);
        if (url.pathname.endsWith('/arrived')) {
            return handleDriverArrived(request);
        }

        // 1. Verify authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, error: 'กรุณาเข้าสู่ระบบก่อน' },
                { status: 401 }
            );
        }

        const token = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch {
            return NextResponse.json(
                { success: false, error: 'Session หมดอายุ' },
                { status: 401 }
            );
        }

        const userId = decodedToken.uid;

        // 2. Rate limiting
        if (!checkRateLimit(userId)) {
            return NextResponse.json(
                { success: false, error: 'กรุณารอสักครู่แล้วลองใหม่' },
                { status: 429 }
            );
        }

        // 3. Parse request body
        const body = await request.json();
        const { bookingId, note } = body;

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

        // 5. Verify driver ownership
        const userDoc = await adminDb.collection('users').doc(userId).get();
        const userData = userDoc.data();
        const driverId = userData?.driverId;

        if (!driverId || booking.driver?.driverId !== driverId) {
            return NextResponse.json(
                { success: false, error: 'คุณไม่ได้รับมอบหมายงานนี้' },
                { status: 403 }
            );
        }

        // 6. Check status (must be driver_en_route and driver must have arrived)
        if (booking.status !== 'driver_en_route') {
            return NextResponse.json(
                { success: false, error: 'สถานะไม่ถูกต้อง (ต้องเป็น driver_en_route)' },
                { status: 400 }
            );
        }

        // 7. Get system configuration
        let passengerConfig = DEFAULT_SYSTEM_CONFIG.passenger;
        try {
            const configSnap = await adminDb.collection('settings').doc('system_config').get();
            if (configSnap.exists) {
                passengerConfig = { ...passengerConfig, ...configSnap.data()?.passenger };
            }
        } catch { /* use defaults */ }

        // 8. Check if driver has arrived
        if (!booking.driverArrivedAt) {
            return NextResponse.json(
                { success: false, error: 'กรุณากดแจ้งว่าถึงจุดรับก่อน' },
                { status: 400 }
            );
        }

        // 9. Check wait time requirement
        const now = Date.now();
        const arrivedAt = booking.driverArrivedAt?.toDate?.()?.getTime() ||
            booking.driverArrivedAt?.seconds * 1000 ||
            now;
        const waitedTime = now - arrivedAt;

        if (waitedTime < passengerConfig.noShowWaitTimeMs) {
            const remainingMs = passengerConfig.noShowWaitTimeMs - waitedTime;
            const remainingMinutes = Math.ceil(remainingMs / 60000);
            return NextResponse.json(
                {
                    success: false,
                    error: `กรุณารอลูกค้าอีก ${remainingMinutes} นาที ก่อนแจ้ง No-Show`,
                    data: {
                        waitedMs: waitedTime,
                        requiredMs: passengerConfig.noShowWaitTimeMs,
                        remainingMs,
                    }
                },
                { status: 400 }
            );
        }

        // 10. Calculate no-show fee
        let noShowFee = 0;
        let driverEarnings = 0;

        if (passengerConfig.enableNoShowFee) {
            noShowFee = passengerConfig.noShowFee;
            driverEarnings = Math.round(noShowFee * passengerConfig.noShowFeeToDriverPercent / 100);
        }

        // 11. Prepare status history entry
        const statusHistoryEntry = {
            status: 'cancelled',
            timestamp: Timestamp.now(),
            note: note || 'ลูกค้าไม่มารับรถ (No-Show)',
            updatedBy: 'driver',
        };

        // 12. Update booking
        await bookingRef.update({
            status: 'cancelled',
            isNoShow: true,
            noShowFee,
            noShowReportedAt: Timestamp.now(),
            cancelledAt: Timestamp.now(),
            cancelledBy: 'driver',
            cancellationReason: CancellationReason.CUSTOMER_NO_SHOW,
            statusHistory: FieldValue.arrayUnion(statusHistoryEntry),
            updatedAt: Timestamp.now(),
        });

        // 13. Update driver (release + add earnings)
        const driverRef = adminDb.collection('drivers').doc(driverId);
        const driverDoc = await driverRef.get();
        const currentEarnings = driverDoc.data()?.totalEarnings || 0;

        await driverRef.update({
            status: 'available',
            totalEarnings: currentEarnings + driverEarnings,
            updatedAt: Timestamp.now(),
        });

        // 14. Notify customer
        if (booking.userId) {
            await adminDb.collection('notifications').add({
                userId: booking.userId,
                type: 'booking',
                title: 'การจองถูกยกเลิก',
                message: `คุณไม่ได้มาขึ้นรถตามเวลานัดหมาย${noShowFee > 0 ? ` ค่าธรรมเนียม No-Show: ฿${noShowFee}` : ''}`,
                data: { bookingId, noShowFee },
                isRead: false,
                createdAt: Timestamp.now(),
            });
        }

        // 15. Create admin notification
        await adminDb.collection('admin_notifications').add({
            type: 'customer_no_show',
            title: 'ลูกค้าไม่มา (No-Show)',
            message: `${booking.firstName || 'ลูกค้า'} ไม่มารับรถ - ${booking.pickupLocation}`,
            data: {
                bookingId,
                noShowFee,
                driverEarnings,
                driverId,
            },
            isRead: false,
            createdAt: Timestamp.now(),
        });

        // 16. Return success response
        return NextResponse.json({
            success: true,
            message: 'บันทึก No-Show เรียบร้อยแล้ว',
            data: {
                bookingId,
                status: 'cancelled',
                isNoShow: true,
                noShowFee,
                driverEarnings,
                waitedMinutes: Math.round(waitedTime / 60000),
            },
        });

    } catch (error: any) {
        console.error('No-show report error:', error);
        return NextResponse.json(
            { success: false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
            { status: 500 }
        );
    }
}
