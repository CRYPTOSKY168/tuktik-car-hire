import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Admin Bookings API
 * Uses Firebase Admin SDK to bypass client-side security rules
 */

// GET - Get all bookings
export async function GET() {
    try {
        const snapshot = await adminDb.collection('bookings').get();
        const bookings = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return NextResponse.json({
            success: true,
            bookings,
            total: bookings.length
        });
    } catch (error: any) {
        console.error('Error fetching bookings:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// POST - Update booking (assign driver, change status, etc.)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, bookingId, data } = body;

        if (!bookingId) {
            return NextResponse.json(
                { success: false, error: 'bookingId is required' },
                { status: 400 }
            );
        }

        const bookingRef = adminDb.collection('bookings').doc(bookingId);
        const bookingSnap = await bookingRef.get();

        if (!bookingSnap.exists) {
            return NextResponse.json(
                { success: false, error: 'Booking not found' },
                { status: 404 }
            );
        }

        const currentData = bookingSnap.data();

        switch (action) {
            case 'assignDriver': {
                const { driverInfo } = data;

                if (!driverInfo || !driverInfo.name || !driverInfo.phone) {
                    return NextResponse.json(
                        { success: false, error: 'Driver name and phone are required' },
                        { status: 400 }
                    );
                }

                // === VALIDATION 1: Check if driver already has an active job ===
                if (driverInfo.driverId) {
                    const activeBookingsSnap = await adminDb.collection('bookings')
                        .where('driver.driverId', '==', driverInfo.driverId)
                        .where('status', 'in', ['driver_assigned', 'driver_en_route', 'in_progress'])
                        .get();

                    if (!activeBookingsSnap.empty) {
                        return NextResponse.json(
                            { success: false, error: 'คนขับกำลังมีงานอยู่ ไม่สามารถรับงานซ้อนได้' },
                            { status: 400 }
                        );
                    }

                    // === VALIDATION 2: Check if driver is the booking owner ===
                    // Get driver's userId
                    const driverDoc = await adminDb.collection('drivers').doc(driverInfo.driverId).get();
                    const driverData = driverDoc.data();

                    if (driverData?.userId && driverData.userId === currentData?.userId) {
                        return NextResponse.json(
                            { success: false, error: 'คนขับไม่สามารถรับงานของตัวเองได้' },
                            { status: 400 }
                        );
                    }
                }

                // Update booking with driver info
                const statusHistory = currentData?.statusHistory || [];
                statusHistory.push({
                    status: 'driver_assigned',
                    timestamp: FieldValue.serverTimestamp(),
                    note: `คนขับ: ${driverInfo.name}`
                });

                await bookingRef.update({
                    status: 'driver_assigned',
                    driver: driverInfo,
                    statusHistory,
                    updatedAt: FieldValue.serverTimestamp()
                });

                // If driver is in system, update their status to busy
                if (driverInfo.driverId) {
                    try {
                        await adminDb.collection('drivers').doc(driverInfo.driverId).update({
                            status: 'busy',
                            updatedAt: FieldValue.serverTimestamp()
                        });
                    } catch (e) {
                        console.log('Could not update driver status:', e);
                    }
                }

                // Create notification for customer
                if (currentData?.userId) {
                    await adminDb.collection('notifications').add({
                        userId: currentData.userId,
                        type: 'booking',
                        title: 'มอบหมายคนขับแล้ว',
                        message: `คนขับ ${driverInfo.name} จะมารับคุณ`,
                        data: {
                            bookingId,
                            status: 'driver_assigned',
                            driverName: driverInfo.name,
                            driverPhone: driverInfo.phone
                        },
                        isRead: false,
                        createdAt: FieldValue.serverTimestamp()
                    });
                }

                return NextResponse.json({
                    success: true,
                    message: 'Driver assigned successfully'
                });
            }

            case 'updateStatus': {
                const { status, note } = data;

                if (!status) {
                    return NextResponse.json(
                        { success: false, error: 'Status is required' },
                        { status: 400 }
                    );
                }

                const statusHistory = currentData?.statusHistory || [];
                statusHistory.push({
                    status,
                    timestamp: FieldValue.serverTimestamp(),
                    note: note || null
                });

                await bookingRef.update({
                    status,
                    statusHistory,
                    updatedAt: FieldValue.serverTimestamp()
                });

                // Create notification for customer
                if (currentData?.userId) {
                    const statusMessages: Record<string, string> = {
                        'confirmed': 'การจองของคุณได้รับการยืนยันแล้ว',
                        'driver_assigned': 'มอบหมายคนขับให้คุณแล้ว',
                        'driver_en_route': 'คนขับกำลังเดินทางมารับคุณ',
                        'in_progress': 'เริ่มเดินทางแล้ว',
                        'completed': 'เดินทางเสร็จสิ้น ขอบคุณที่ใช้บริการ',
                        'cancelled': 'การจองถูกยกเลิก'
                    };

                    await adminDb.collection('notifications').add({
                        userId: currentData.userId,
                        type: 'booking',
                        title: 'อัปเดตสถานะ',
                        message: statusMessages[status] || `สถานะเปลี่ยนเป็น ${status}`,
                        data: { bookingId, status },
                        isRead: false,
                        createdAt: FieldValue.serverTimestamp()
                    });
                }

                return NextResponse.json({
                    success: true,
                    message: 'Status updated successfully'
                });
            }

            default:
                return NextResponse.json(
                    { success: false, error: `Invalid action: ${action}` },
                    { status: 400 }
                );
        }
    } catch (error: any) {
        console.error('Error updating booking:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
