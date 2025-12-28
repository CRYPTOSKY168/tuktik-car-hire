import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Driver Status API
 * Uses Firebase Admin SDK to update driver status
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
        console.log('Verifying token, length:', token?.length);
        console.log('Admin Auth available:', !!adminAuth);

        const decodedToken = await adminAuth.verifyIdToken(token);
        console.log('Token verified, userId:', decodedToken.uid);
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
    } catch (err: any) {
        console.error('Token verification FULL error:', JSON.stringify({
            code: err.code,
            message: err.message,
            name: err.name,
            stack: err.stack?.substring(0, 500)
        }));
        return { success: false, error: `Unauthorized - ${err.code || err.message || 'Invalid token'}` };
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { driverId, status } = body;

        if (!driverId) {
            return NextResponse.json(
                { success: false, error: 'driverId is required' },
                { status: 400 }
            );
        }

        if (!status) {
            return NextResponse.json(
                { success: false, error: 'status is required' },
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

        // Validate status value
        const validStatuses = ['available', 'busy', 'offline'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
                { status: 400 }
            );
        }

        // Check if driver exists
        const driverRef = adminDb.collection('drivers').doc(driverId);
        const driverSnap = await driverRef.get();

        if (!driverSnap.exists) {
            return NextResponse.json(
                { success: false, error: 'Driver not found' },
                { status: 404 }
            );
        }

        const currentData = driverSnap.data();

        // If driver has active booking, prevent going offline
        if (status === 'offline') {
            const activeBookingsSnap = await adminDb.collection('bookings')
                .where('driver.driverId', '==', driverId)
                .where('status', 'in', ['driver_assigned', 'driver_en_route', 'in_progress'])
                .get();

            if (!activeBookingsSnap.empty) {
                return NextResponse.json(
                    { success: false, error: 'คุณมีงานอยู่ ต้องเสร็จงานก่อนถึงจะปิดสถานะได้' },
                    { status: 400 }
                );
            }
        }

        // Update driver status
        await driverRef.update({
            status,
            updatedAt: FieldValue.serverTimestamp()
        });

        return NextResponse.json({
            success: true,
            message: `Status updated to ${status}`,
            driver: {
                id: driverId,
                status,
                previousStatus: currentData?.status
            }
        });

    } catch (error: any) {
        console.error('Error updating driver status:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to update status' },
            { status: 500 }
        );
    }
}

// GET - Get driver status (requires authentication)
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

        const driverRef = adminDb.collection('drivers').doc(driverId);
        const driverSnap = await driverRef.get();

        if (!driverSnap.exists) {
            return NextResponse.json(
                { success: false, error: 'Driver not found' },
                { status: 404 }
            );
        }

        const data = driverSnap.data();

        return NextResponse.json({
            success: true,
            driver: {
                id: driverId,
                status: data?.status,
                name: data?.name
            }
        });

    } catch (error: any) {
        console.error('Error getting driver status:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to get status' },
            { status: 500 }
        );
    }
}
