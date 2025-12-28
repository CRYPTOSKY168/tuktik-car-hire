import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

// DELETE - Remove driver and update user document
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const driverId = searchParams.get('id');

        if (!driverId) {
            return NextResponse.json(
                { success: false, error: 'Driver ID is required' },
                { status: 400 }
            );
        }

        // Get driver document to find userId
        const driverDoc = await adminDb.collection('drivers').doc(driverId).get();

        if (!driverDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Driver not found' },
                { status: 404 }
            );
        }

        const driverData = driverDoc.data();
        const userId = driverData?.userId;

        // Soft delete driver (set isActive to false)
        await adminDb.collection('drivers').doc(driverId).update({
            isActive: false,
            deletedAt: new Date(),
            updatedAt: new Date(),
        });

        // If driver has userId, update user document
        if (userId) {
            await adminDb.collection('users').doc(userId).update({
                isApprovedDriver: false,
                driverId: null,
                driverRevokedAt: new Date(),
                updatedAt: new Date(),
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Driver removed successfully',
        });
    } catch (error: any) {
        console.error('Error deleting driver:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to delete driver' },
            { status: 500 }
        );
    }
}

// POST - Handle various driver actions
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, driverId, data } = body;

        switch (action) {
            case 'updateStatus': {
                if (!driverId || !data?.status) {
                    return NextResponse.json(
                        { success: false, error: 'Driver ID and status are required' },
                        { status: 400 }
                    );
                }

                await adminDb.collection('drivers').doc(driverId).update({
                    status: data.status,
                    updatedAt: new Date(),
                });

                return NextResponse.json({
                    success: true,
                    message: 'Status updated',
                });
            }

            case 'hardDelete': {
                // Completely remove driver and user association
                if (!driverId) {
                    return NextResponse.json(
                        { success: false, error: 'Driver ID is required' },
                        { status: 400 }
                    );
                }

                const driverDoc = await adminDb.collection('drivers').doc(driverId).get();
                if (!driverDoc.exists) {
                    return NextResponse.json(
                        { success: false, error: 'Driver not found' },
                        { status: 404 }
                    );
                }

                const driverData = driverDoc.data();
                const userId = driverData?.userId;

                // Delete driver document
                await adminDb.collection('drivers').doc(driverId).delete();

                // Update user if exists
                if (userId) {
                    await adminDb.collection('users').doc(userId).update({
                        isApprovedDriver: false,
                        driverId: null,
                        driverRevokedAt: new Date(),
                        updatedAt: new Date(),
                    });
                }

                return NextResponse.json({
                    success: true,
                    message: 'Driver permanently deleted',
                });
            }

            default:
                return NextResponse.json(
                    { success: false, error: 'Invalid action' },
                    { status: 400 }
                );
        }
    } catch (error: any) {
        console.error('Error in driver action:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to perform action' },
            { status: 500 }
        );
    }
}
