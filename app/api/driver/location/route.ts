import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { checkDriverLocationRateLimit, getRateLimitResponse } from '@/lib/utils/rateLimit';
import { safeErrorMessage, logError } from '@/lib/utils/safeError';

/**
 * Driver Location API
 * POST: Update driver's current location (for real-time tracking)
 * GET: Get driver's current location
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
    } catch (err: any) {
        console.error('Token verification error:', err.message);
        return { success: false, error: `Unauthorized - ${err.code || err.message || 'Invalid token'}` };
    }
}

// POST: Update driver location
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { driverId, lat, lng, heading, speed } = body;

        // Validate required fields
        if (!driverId) {
            return NextResponse.json(
                { success: false, error: 'driverId is required' },
                { status: 400 }
            );
        }

        if (lat === undefined || lng === undefined) {
            return NextResponse.json(
                { success: false, error: 'lat and lng are required' },
                { status: 400 }
            );
        }

        // Validate coordinates range
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return NextResponse.json(
                { success: false, error: 'Invalid coordinates' },
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

        // Check rate limit (60 req/min for GPS updates)
        if (!checkDriverLocationRateLimit(driverId)) {
            return NextResponse.json(
                getRateLimitResponse('driverLocation'),
                { status: 429 }
            );
        }

        // Update driver location
        const driverRef = adminDb.collection('drivers').doc(driverId);
        const driverDoc = await driverRef.get();

        if (!driverDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Driver not found' },
                { status: 404 }
            );
        }

        // Build location object
        const locationData: {
            lat: number;
            lng: number;
            timestamp: FirebaseFirestore.Timestamp;
            heading?: number;
            speed?: number;
        } = {
            lat: Number(lat),
            lng: Number(lng),
            timestamp: Timestamp.now(),
        };

        // Add optional fields if provided
        if (heading !== undefined) {
            locationData.heading = Number(heading);
        }
        if (speed !== undefined) {
            locationData.speed = Number(speed);
        }

        await driverRef.update({
            currentLocation: locationData,
        });

        return NextResponse.json({
            success: true,
            message: 'Location updated successfully',
            data: {
                driverId,
                location: locationData,
            }
        });

    } catch (error: unknown) {
        logError('driver/location/POST', error, { driverId: 'from-request' });
        return NextResponse.json(
            { success: false, error: safeErrorMessage(error, 'ไม่สามารถอัปเดตตำแหน่งได้') },
            { status: 500 }
        );
    }
}

// GET: Get driver location (for customer tracking)
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

        // Get driver document
        const driverDoc = await adminDb.collection('drivers').doc(driverId).get();

        if (!driverDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Driver not found' },
                { status: 404 }
            );
        }

        const driverData = driverDoc.data();

        // Return location data
        return NextResponse.json({
            success: true,
            data: {
                driverId,
                currentLocation: driverData?.currentLocation || null,
                status: driverData?.status || 'offline',
                name: driverData?.name,
                vehiclePlate: driverData?.vehiclePlate,
                vehicleModel: driverData?.vehicleModel,
            }
        });

    } catch (error: unknown) {
        logError('driver/location/GET', error, { driverId: 'from-request' });
        return NextResponse.json(
            { success: false, error: safeErrorMessage(error, 'ไม่สามารถดึงตำแหน่งได้') },
            { status: 500 }
        );
    }
}
