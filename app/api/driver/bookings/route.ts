import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { safeErrorMessage, logError } from '@/lib/utils/safeError';
import { sendBookingStatusNotification } from '@/lib/firebase/pushNotification';

/**
 * Driver Bookings API
 * Uses Firebase Admin SDK to bypass client-side security rules
 * SECURED: Requires authentication and validates driver ownership
 */

// Helper function to verify driver ownership
async function verifyDriverOwnership(request: NextRequest, driverId: string): Promise<{ success: boolean; error?: string; userId?: string }> {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { success: false, error: 'Unauthorized - No token provided' };
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userId = decodedToken.uid;

        // Get user's driverId
        const userDoc = await adminDb.collection('users').doc(userId).get();
        const userData = userDoc.data();

        // Check if user is an approved driver
        if (!userData?.isApprovedDriver) {
            return { success: false, error: 'User is not an approved driver' };
        }

        // Check if the driverId matches
        if (userData?.driverId !== driverId) {
            // Also check by userId in drivers collection
            const driverDoc = await adminDb.collection('drivers').doc(driverId).get();
            if (!driverDoc.exists || driverDoc.data()?.userId !== userId) {
                return { success: false, error: 'You are not authorized to access this driver' };
            }
        }

        return { success: true, userId };
    } catch (err) {
        return { success: false, error: 'Unauthorized - Invalid token' };
    }
}

// GET - Get driver's bookings (requires authentication)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const driverId = searchParams.get('driverId');

        if (!driverId) {
            return NextResponse.json(
                { success: false, error: 'driverId is required' },
                { status: 400 }
            );
        }

        // Verify driver ownership
        const authResult = await verifyDriverOwnership(request, driverId);
        if (!authResult.success) {
            return NextResponse.json(
                { success: false, error: authResult.error },
                { status: 401 }
            );
        }

        const snapshot = await adminDb.collection('bookings')
            .where('driver.driverId', '==', driverId)
            .get();

        const bookings = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return NextResponse.json({
            success: true,
            bookings,
            total: bookings.length
        });
    } catch (error: unknown) {
        logError('driver/bookings/GET', error, { driverId: 'from-request' });
        return NextResponse.json(
            { success: false, error: safeErrorMessage(error, 'ไม่สามารถดึงข้อมูลการจองได้') },
            { status: 500 }
        );
    }
}

// POST - Driver updates booking status (requires authentication)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, bookingId, driverId, data } = body;

        if (!bookingId || !driverId) {
            return NextResponse.json(
                { success: false, error: 'bookingId and driverId are required' },
                { status: 400 }
            );
        }

        // Verify driver ownership
        const authResult = await verifyDriverOwnership(request, driverId);
        if (!authResult.success) {
            return NextResponse.json(
                { success: false, error: authResult.error },
                { status: 401 }
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

        // Verify driver is assigned to this booking
        if (currentData?.driver?.driverId !== driverId) {
            return NextResponse.json(
                { success: false, error: 'This booking is not assigned to you' },
                { status: 403 }
            );
        }

        switch (action) {
            case 'rejectJob': {
                // Driver rejects the job - set status back to confirmed so admin can reassign
                if (currentData?.status !== 'driver_assigned') {
                    return NextResponse.json(
                        { success: false, error: 'สามารถปฏิเสธงานได้เฉพาะงานที่ยังไม่ได้เริ่ม' },
                        { status: 400 }
                    );
                }

                const statusHistory = currentData?.statusHistory || [];
                statusHistory.push({
                    status: 'confirmed',
                    timestamp: Timestamp.now(),
                    note: 'คนขับปฏิเสธงาน - รอมอบหมายคนขับใหม่',
                    updatedBy: 'driver',
                    rejectedBy: driverId
                });

                // Add driver to rejectedDrivers array for auto re-match
                const currentRejectedDrivers = currentData?.rejectedDrivers || [];
                if (!currentRejectedDrivers.includes(driverId)) {
                    currentRejectedDrivers.push(driverId);
                }

                await bookingRef.update({
                    status: 'confirmed',
                    driver: null, // Remove driver assignment
                    statusHistory,
                    rejectedDrivers: currentRejectedDrivers, // For auto re-match system
                    updatedAt: FieldValue.serverTimestamp()
                });

                // Update driver status back to available
                try {
                    const driverRef = adminDb.collection('drivers').doc(driverId);
                    await driverRef.update({
                        status: 'available',
                        updatedAt: FieldValue.serverTimestamp()
                    });
                } catch (e) {
                    console.log('Could not update driver status:', e);
                }

                // Create admin notification about rejection
                await adminDb.collection('admin_notifications').add({
                    type: 'driver_rejected',
                    title: 'คนขับปฏิเสธงาน',
                    message: `คนขับปฏิเสธงาน ${bookingId} - กรุณามอบหมายคนขับใหม่`,
                    data: { bookingId, driverId },
                    isRead: false,
                    createdAt: FieldValue.serverTimestamp()
                });

                return NextResponse.json({
                    success: true,
                    message: 'ปฏิเสธงานเรียบร้อย'
                });
            }

            case 'updateStatus': {
                const { status, note } = data;

                // Valid status transitions for driver
                const validTransitions: Record<string, string[]> = {
                    'driver_assigned': ['driver_en_route'],
                    'driver_en_route': ['in_progress'],
                    'in_progress': ['completed']
                };

                const currentStatus = currentData?.status;
                if (!validTransitions[currentStatus]?.includes(status)) {
                    return NextResponse.json(
                        { success: false, error: `Cannot change status from ${currentStatus} to ${status}` },
                        { status: 400 }
                    );
                }

                const statusHistory = currentData?.statusHistory || [];
                statusHistory.push({
                    status,
                    timestamp: Timestamp.now(),
                    note: note || `Driver updated to ${status}`,
                    updatedBy: 'driver'
                });

                // Prepare update data
                const updateData: Record<string, any> = {
                    status,
                    statusHistory,
                    updatedAt: FieldValue.serverTimestamp()
                };

                // For cash payment: mark as paid when completed
                if (status === 'completed' && currentData?.paymentMethod === 'cash') {
                    updateData.paymentStatus = 'paid';
                    updateData.paymentCompletedAt = FieldValue.serverTimestamp();
                }

                await bookingRef.update(updateData);

                // Update driver status and earnings when completed
                if (status === 'completed') {
                    try {
                        const driverRef = adminDb.collection('drivers').doc(driverId);
                        const driverSnap = await driverRef.get();
                        const driverData = driverSnap.data();

                        // Get booking total cost for earnings
                        const bookingEarnings = Number(currentData?.totalCost) || 0;

                        await driverRef.update({
                            status: 'available',
                            totalTrips: (driverData?.totalTrips || 0) + 1,
                            totalEarnings: (driverData?.totalEarnings || 0) + bookingEarnings,
                            updatedAt: FieldValue.serverTimestamp()
                        });
                    } catch (e) {
                        console.log('Could not update driver status:', e);
                    }
                }

                // Create notification for customer
                if (currentData?.userId) {
                    const statusMessages: Record<string, string> = {
                        'driver_en_route': 'คนขับกำลังเดินทางมารับคุณ',
                        'in_progress': 'เริ่มเดินทางแล้ว',
                        'completed': 'เดินทางถึงปลายทางแล้ว ขอบคุณที่ใช้บริการ'
                    };

                    // Save notification to Firestore
                    await adminDb.collection('notifications').add({
                        userId: currentData.userId,
                        type: 'booking',
                        title: 'อัปเดตสถานะ',
                        message: statusMessages[status] || `สถานะเปลี่ยนเป็น ${status}`,
                        data: { bookingId, status },
                        isRead: false,
                        createdAt: FieldValue.serverTimestamp()
                    });

                    // 🔔 Send Push Notification to customer's device
                    const driverName = currentData?.driver?.name;
                    await sendBookingStatusNotification(
                        currentData.userId,
                        bookingId,
                        status,
                        driverName
                    );
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
    } catch (error: unknown) {
        logError('driver/bookings/POST', error, { bookingId: 'from-request' });
        return NextResponse.json(
            { success: false, error: safeErrorMessage(error, 'ไม่สามารถอัปเดตการจองได้') },
            { status: 500 }
        );
    }
}
