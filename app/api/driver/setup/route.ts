import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
    try {
        // Get authorization token
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized - No token provided' },
                { status: 401 }
            );
        }

        const token = authHeader.split('Bearer ')[1];

        // Verify the token
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (err) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized - Invalid token' },
                { status: 401 }
            );
        }

        const userId = decodedToken.uid;

        // Get user data to check if approved driver
        const userDoc = await adminDb.collection('users').doc(userId).get();
        const userData = userDoc.data();

        if (!userData?.isApprovedDriver) {
            return NextResponse.json(
                { success: false, error: 'User is not approved as a driver' },
                { status: 403 }
            );
        }

        // Get request body
        const body = await request.json();
        const { vehiclePlate, vehicleModel, vehicleColor, licenseNumber, idCardUrl, driverLicenseUrl } = body;

        // Validate required fields
        if (!vehiclePlate || !vehicleModel || !vehicleColor) {
            return NextResponse.json(
                { success: false, error: 'Missing required vehicle information' },
                { status: 400 }
            );
        }

        if (!idCardUrl || !driverLicenseUrl) {
            return NextResponse.json(
                { success: false, error: 'Missing required documents (ID card and driver license)' },
                { status: 400 }
            );
        }

        // Check if driver profile already exists for this user
        const existingDriverSnap = await adminDb.collection('drivers')
            .where('userId', '==', userId)
            .get();

        let driverId: string;

        if (!existingDriverSnap.empty) {
            // Update existing driver (including re-submission after rejection)
            const driverDoc = existingDriverSnap.docs[0];
            driverId = driverDoc.id;

            await adminDb.collection('drivers').doc(driverId).update({
                vehiclePlate: vehiclePlate.trim().toUpperCase(),
                vehicleModel: vehicleModel.trim(),
                vehicleColor: vehicleColor.trim(),
                licenseNumber: licenseNumber?.trim() || '',
                // Update document URLs
                idCardUrl: idCardUrl,
                driverLicenseUrl: driverLicenseUrl,
                // Reset to pending_review for admin approval
                setupStatus: 'pending_review',
                isActive: false,
                updatedAt: new Date(),
            });
        } else {
            // Get user info for creating driver
            const authUser = await adminAuth.getUser(userId);

            // Create new driver profile with pending_review status
            const driverData = {
                userId: userId,
                name: authUser.displayName || userData.displayName || authUser.email?.split('@')[0] || 'Driver',
                phone: authUser.phoneNumber || userData.phone || '',
                email: authUser.email || userData.email || '',
                vehiclePlate: vehiclePlate.trim().toUpperCase(),
                vehicleModel: vehicleModel.trim(),
                vehicleColor: vehicleColor.trim(),
                licenseNumber: licenseNumber?.trim() || '',
                // Document URLs
                idCardUrl: idCardUrl,
                driverLicenseUrl: driverLicenseUrl,
                status: 'offline',
                setupStatus: 'pending_review', // Needs admin approval
                totalTrips: 0,
                rating: 5.0,
                ratingCount: 0,
                isActive: false, // Not active until approved
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const driverRef = await adminDb.collection('drivers').add(driverData);
            driverId = driverRef.id;
        }

        // Update user with driverId
        await adminDb.collection('users').doc(userId).update({
            driverId: driverId,
            updatedAt: new Date(),
        });

        return NextResponse.json({
            success: true,
            message: 'Driver profile created successfully',
            driverId: driverId,
        });
    } catch (error: any) {
        console.error('Error in driver setup:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to create driver profile' },
            { status: 500 }
        );
    }
}
