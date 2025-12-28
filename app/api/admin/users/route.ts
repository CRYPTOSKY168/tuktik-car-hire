import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
    try {
        // Get all users from Firebase Auth (paginated, max 1000 per call)
        const listUsersResult = await adminAuth.listUsers(1000);
        const authUsers = listUsersResult.users;

        // Get all users from Firestore for additional data (role, driverId, etc.)
        const firestoreUsersSnap = await adminDb.collection('users').get();
        const firestoreUsers: Record<string, any> = {};
        firestoreUsersSnap.docs.forEach(doc => {
            firestoreUsers[doc.id] = { id: doc.id, ...doc.data() };
        });

        // Get all drivers to check driver status
        const driversSnap = await adminDb.collection('drivers').get();
        const driversByUserId: Record<string, any> = {};
        const driversById: Record<string, any> = {};
        driversSnap.docs.forEach(doc => {
            const data = doc.data();
            driversById[doc.id] = { id: doc.id, ...data };
            if (data.userId) {
                driversByUserId[data.userId] = { id: doc.id, ...data };
            }
        });

        // Merge Auth users with Firestore data
        const members = authUsers.map(authUser => {
            const firestoreData = firestoreUsers[authUser.uid] || {};
            // Look up driver by userId first, then by driverId from user document
            let driverData = driversByUserId[authUser.uid];
            if (!driverData && firestoreData.driverId) {
                driverData = driversById[firestoreData.driverId];
            }

            // Determine provider
            let provider = 'email';
            if (authUser.providerData && authUser.providerData.length > 0) {
                const providerId = authUser.providerData[0].providerId;
                if (providerId === 'google.com') provider = 'google';
                else if (providerId === 'phone') provider = 'phone';
            }

            return {
                id: authUser.uid,
                uid: authUser.uid,
                email: authUser.email || firestoreData.email || null,
                displayName: authUser.displayName || firestoreData.displayName || null,
                phone: authUser.phoneNumber || firestoreData.phone || null,
                photoURL: authUser.photoURL || null,
                provider: firestoreData.provider || provider,
                role: firestoreData.role || 'user',
                isActive: firestoreData.isActive !== false && !authUser.disabled,
                disabled: authUser.disabled || false,
                emailVerified: authUser.emailVerified || false,
                // Driver approval status (Admin approved but may not have vehicle info yet)
                isApprovedDriver: firestoreData.isApprovedDriver || false,
                // Has complete driver profile (with vehicle info)
                isDriver: !!driverData,
                hasVehicleInfo: !!(driverData?.vehiclePlate),
                driverData: driverData ? {
                    id: driverData.id,
                    vehiclePlate: driverData.vehiclePlate,
                    vehicleModel: driverData.vehicleModel,
                    vehicleColor: driverData.vehicleColor,
                    status: driverData.status,
                    setupStatus: driverData.setupStatus || 'approved', // Default approved for old drivers
                    idCardUrl: driverData.idCardUrl || null,
                    driverLicenseUrl: driverData.driverLicenseUrl || null,
                } : null,
                createdAt: authUser.metadata.creationTime || firestoreData.createdAt?.toDate?.() || null,
                lastSignIn: authUser.metadata.lastSignInTime || null,
                // Firestore-only fields
                hasFirestoreProfile: !!firestoreUsers[authUser.uid],
            };
        });

        // Sort by creation date (newest first)
        members.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });

        return NextResponse.json({
            success: true,
            members,
            total: members.length,
        });
    } catch (error: any) {
        console.error('Error fetching auth users:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch users' },
            { status: 500 }
        );
    }
}

// POST - Update user (role, disable, etc.)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, userId, data } = body;

        switch (action) {
            case 'updateRole': {
                // Update role in Firestore
                await adminDb.collection('users').doc(userId).set({
                    role: data.role,
                    updatedAt: new Date(),
                }, { merge: true });
                return NextResponse.json({ success: true, message: 'Role updated' });
            }

            case 'toggleDisable': {
                // Disable/Enable in Firebase Auth
                await adminAuth.updateUser(userId, { disabled: data.disabled });
                // Also update Firestore
                await adminDb.collection('users').doc(userId).set({
                    isActive: !data.disabled,
                    updatedAt: new Date(),
                }, { merge: true });
                return NextResponse.json({ success: true, message: data.disabled ? 'User disabled' : 'User enabled' });
            }

            case 'approveDriver': {
                // Just approve user as driver (they will fill in vehicle info themselves)
                await adminDb.collection('users').doc(userId).set({
                    isApprovedDriver: true,
                    driverApprovedAt: new Date(),
                    updatedAt: new Date(),
                }, { merge: true });

                return NextResponse.json({
                    success: true,
                    message: 'User approved as driver',
                });
            }

            case 'revokeDriver': {
                // Revoke driver access
                await adminDb.collection('users').doc(userId).set({
                    isApprovedDriver: false,
                    driverRevokedAt: new Date(),
                    updatedAt: new Date(),
                }, { merge: true });

                return NextResponse.json({
                    success: true,
                    message: 'Driver access revoked',
                });
            }

            case 'approveDriverSetup': {
                // Approve driver's vehicle info setup
                const userDoc = await adminDb.collection('users').doc(userId).get();
                const userData = userDoc.data();

                if (!userData?.driverId) {
                    return NextResponse.json({ success: false, error: 'Driver profile not found' }, { status: 404 });
                }

                // Update driver setupStatus to approved
                await adminDb.collection('drivers').doc(userData.driverId).update({
                    setupStatus: 'approved',
                    isActive: true,
                    approvedAt: new Date(),
                    updatedAt: new Date(),
                });

                return NextResponse.json({
                    success: true,
                    message: 'Driver setup approved',
                });
            }

            case 'rejectDriverSetup': {
                // Reject driver's vehicle info
                const userDocRej = await adminDb.collection('users').doc(userId).get();
                const userDataRej = userDocRej.data();

                if (!userDataRej?.driverId) {
                    return NextResponse.json({ success: false, error: 'Driver profile not found' }, { status: 404 });
                }

                // Update driver setupStatus to rejected
                await adminDb.collection('drivers').doc(userDataRej.driverId).update({
                    setupStatus: 'rejected',
                    isActive: false,
                    rejectedAt: new Date(),
                    updatedAt: new Date(),
                });

                return NextResponse.json({
                    success: true,
                    message: 'Driver setup rejected',
                });
            }

            case 'createDriver': {
                // Get user data
                const userDoc = await adminDb.collection('users').doc(userId).get();
                const authUser = await adminAuth.getUser(userId);

                if (!userDoc.exists && !authUser) {
                    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
                }

                const userData = userDoc.data() || {};

                // Check if already a driver
                const existingDriver = await adminDb.collection('drivers')
                    .where('userId', '==', userId)
                    .get();

                if (!existingDriver.empty) {
                    return NextResponse.json({ success: false, error: 'User is already a driver' }, { status: 400 });
                }

                // Create driver document
                const driverData = {
                    userId: userId,
                    name: authUser.displayName || userData.displayName || authUser.email?.split('@')[0] || 'Driver',
                    phone: authUser.phoneNumber || userData.phone || '',
                    email: authUser.email || userData.email || '',
                    vehiclePlate: data.vehiclePlate,
                    vehicleModel: data.vehicleModel,
                    vehicleColor: data.vehicleColor,
                    licenseNumber: data.licenseNumber || '',
                    status: 'offline',
                    totalTrips: 0,
                    rating: 5.0,
                    ratingCount: 0,
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                const driverRef = await adminDb.collection('drivers').add(driverData);

                // Update user with driverId and approve as driver
                await adminDb.collection('users').doc(userId).set({
                    driverId: driverRef.id,
                    isApprovedDriver: true,
                    updatedAt: new Date(),
                }, { merge: true });

                return NextResponse.json({
                    success: true,
                    message: 'Driver created',
                    driverId: driverRef.id,
                });
            }

            case 'deleteUser': {
                // Soft delete - just disable the account
                await adminAuth.updateUser(userId, { disabled: true });
                await adminDb.collection('users').doc(userId).set({
                    isActive: false,
                    deletedAt: new Date(),
                    updatedAt: new Date(),
                }, { merge: true });
                return NextResponse.json({ success: true, message: 'User deleted' });
            }

            default:
                return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('Error updating user:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to update user' },
            { status: 500 }
        );
    }
}
