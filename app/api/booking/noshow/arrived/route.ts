// ====================================
// TukTik Car Rental - Driver Arrived API
// Passenger Rules: Driver marks arrival at pickup
// ====================================

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { DEFAULT_SYSTEM_CONFIG } from '@/lib/types';

/**
 * POST /api/booking/noshow/arrived
 * Driver marks arrival at pickup location
 *
 * Body: { bookingId: string }
 */
export async function POST(request: NextRequest) {
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

        // 6. Check if already arrived
        if (booking.driverArrivedAt) {
            return NextResponse.json(
                { success: false, error: 'คุณแจ้งว่าถึงจุดรับไปแล้ว' },
                { status: 400 }
            );
        }

        // 7. Mark driver arrived
        await bookingRef.update({
            driverArrivedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });

        // 8. Notify customer
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

        // 9. Get config for wait time info
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
                driverArrivedAt: new Date().toISOString(),
                waitTimeMs: passengerConfig.noShowWaitTimeMs,
                waitTimeMinutes: Math.round(passengerConfig.noShowWaitTimeMs / 60000),
                noShowFee: passengerConfig.enableNoShowFee ? passengerConfig.noShowFee : 0,
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
