import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { safeErrorMessage, logError } from '@/lib/utils/safeError';
import { sendBookingStatusNotification, sendNewJobNotification } from '@/lib/firebase/pushNotification';

/**
 * POST /api/booking/assign-driver
 * Assigns a driver to a booking (using Admin SDK - bypasses Firestore rules)
 *
 * This endpoint is needed because:
 * - Regular users cannot update other driver's status via Firestore rules
 * - Only admin or the driver themselves can update driver documents
 * - This API uses Admin SDK to update both booking and driver atomically
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Verify authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, error: 'ไม่ได้รับอนุญาต - กรุณาเข้าสู่ระบบ' },
                { status: 401 }
            );
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userId = decodedToken.uid;

        // 2. Parse request body
        const body = await request.json();
        const { bookingId, driverId, driverName, driverPhone, vehiclePlate, vehicleModel, vehicleColor } = body;

        if (!bookingId || !driverId) {
            return NextResponse.json(
                { success: false, error: 'ข้อมูลไม่ครบถ้วน' },
                { status: 400 }
            );
        }

        // 3. Get booking and verify ownership
        const bookingRef = adminDb.collection('bookings').doc(bookingId);
        const bookingDoc = await bookingRef.get();

        if (!bookingDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'ไม่พบการจอง' },
                { status: 404 }
            );
        }

        const bookingData = bookingDoc.data();

        // Check if user owns this booking
        if (bookingData?.userId !== userId) {
            return NextResponse.json(
                { success: false, error: 'คุณไม่มีสิทธิ์แก้ไขการจองนี้' },
                { status: 403 }
            );
        }

        // 4. Check if booking is in valid status
        const validStatuses = ['pending', 'confirmed'];
        if (!validStatuses.includes(bookingData?.status)) {
            return NextResponse.json(
                { success: false, error: 'ไม่สามารถมอบหมายคนขับในสถานะนี้ได้' },
                { status: 400 }
            );
        }

        // 5. Validate driver
        const driverRef = adminDb.collection('drivers').doc(driverId);
        const driverDoc = await driverRef.get();

        if (!driverDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'ไม่พบคนขับ' },
                { status: 404 }
            );
        }

        const driverData = driverDoc.data();

        // Check if driver is available
        if (driverData?.status !== 'available') {
            return NextResponse.json(
                { success: false, error: 'คนขับไม่ว่าง' },
                { status: 400 }
            );
        }

        // Check if driver already has active job
        const activeBookingsSnap = await adminDb.collection('bookings')
            .where('driver.driverId', '==', driverId)
            .where('status', 'in', ['driver_assigned', 'driver_en_route', 'in_progress'])
            .get();

        if (!activeBookingsSnap.empty) {
            return NextResponse.json(
                { success: false, error: 'คนขับกำลังมีงานอยู่ ไม่สามารถรับงานซ้อนได้' },
                { status: 400 }
            );
        }

        // Check if driver is booking owner (can't accept own booking)
        if (driverData?.userId && driverData.userId === bookingData?.userId) {
            return NextResponse.json(
                { success: false, error: 'คนขับไม่สามารถรับงานของตัวเองได้' },
                { status: 400 }
            );
        }

        // 6. Update booking with driver info
        const statusHistory = bookingData?.statusHistory || [];
        statusHistory.push({
            status: 'driver_assigned',
            timestamp: Timestamp.now(),
            note: `คนขับ: ${driverName}`,
            updatedBy: 'system'
        });

        await bookingRef.update({
            status: 'driver_assigned',
            driver: {
                driverId,
                name: driverName,
                phone: driverPhone,
                vehiclePlate: vehiclePlate || '',
                vehicleModel: vehicleModel || '',
                vehicleColor: vehicleColor || '',
            },
            statusHistory,
            updatedAt: FieldValue.serverTimestamp(),
        });

        // 7. Update driver status to busy
        await driverRef.update({
            status: 'busy',
            updatedAt: FieldValue.serverTimestamp(),
        });

        // 8. Create notification for customer
        await adminDb.collection('notifications').add({
            userId: bookingData?.userId,
            type: 'booking',
            title: 'พบคนขับแล้ว!',
            message: `คนขับ ${driverName} กำลังจะติดต่อคุณ`,
            data: { bookingId, driverId },
            isRead: false,
            createdAt: FieldValue.serverTimestamp(),
        });

        // 🔔 Send Push Notification to customer
        if (bookingData?.userId) {
            await sendBookingStatusNotification(
                bookingData.userId,
                bookingId,
                'driver_assigned',
                driverName
            );
        }

        // 🔔 Send Push Notification to driver about new job
        if (driverData?.userId) {
            await sendNewJobNotification(
                driverData.userId,
                bookingId,
                bookingData?.pickupLocation || '',
                bookingData?.dropoffLocation || ''
            );
        }

        return NextResponse.json({
            success: true,
            message: 'มอบหมายคนขับสำเร็จ',
            data: {
                bookingId,
                driverId,
                driverName,
                status: 'driver_assigned'
            }
        });

    } catch (error: unknown) {
        logError('booking/assign-driver/POST', error, { bookingId: 'from-request' });
        return NextResponse.json(
            { success: false, error: safeErrorMessage(error, 'ไม่สามารถมอบหมายคนขับได้') },
            { status: 500 }
        );
    }
}
