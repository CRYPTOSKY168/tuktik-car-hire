import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireSuperAdmin, SUPER_ADMIN_EMAIL } from '@/lib/firebase/adminAuth';

/**
 * API เพื่อ cleanup ข้อมูลที่ผิดพลาด
 * เช่น ลบ admin ที่ไม่ควรเป็น admin
 *
 * REQUIRES: Super Admin authorization
 */

export async function POST(request: NextRequest) {
    // Require super admin authorization
    const auth = await requireSuperAdmin(request);
    if (!auth.isSuperAdmin) {
        return NextResponse.json(
            { success: false, error: `Unauthorized: Only Super Admin (${SUPER_ADMIN_EMAIL}) can perform cleanup` },
            { status: 403 }
        );
    }

    try {
        const body = await request.json();
        const { action } = body;

        switch (action) {
            case 'removeWrongAdmins': {
                // Find all users with admin role except super admin
                const adminsSnapshot = await adminDb.collection('users')
                    .where('role', '==', 'admin')
                    .get();

                const wrongAdmins: string[] = [];
                const batch = adminDb.batch();

                adminsSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    // Keep super admin, remove others
                    if (data.email !== SUPER_ADMIN_EMAIL) {
                        batch.update(doc.ref, {
                            role: 'user',
                            adminRevokedAt: new Date(),
                            adminRevokedReason: 'Security cleanup - unauthorized admin access',
                            updatedAt: new Date()
                        });
                        wrongAdmins.push(data.email || doc.id);
                    }
                });

                await batch.commit();

                return NextResponse.json({
                    success: true,
                    message: `Removed admin role from ${wrongAdmins.length} unauthorized users`,
                    affectedUsers: wrongAdmins,
                    superAdminEmail: SUPER_ADMIN_EMAIL
                });
            }

            case 'fixStaleDriverStatus': {
                // Find all drivers with 'busy' status but no active bookings
                const driversSnapshot = await adminDb.collection('drivers')
                    .where('status', '==', 'busy')
                    .get();

                const fixedDrivers: string[] = [];
                const batch = adminDb.batch();

                for (const driverDoc of driversSnapshot.docs) {
                    const driverId = driverDoc.id;

                    // Check if driver has active bookings
                    const activeBookingsSnap = await adminDb.collection('bookings')
                        .where('driver.driverId', '==', driverId)
                        .where('status', 'in', ['driver_assigned', 'driver_en_route', 'in_progress'])
                        .get();

                    if (activeBookingsSnap.empty) {
                        // No active bookings but status is busy - fix it
                        batch.update(driverDoc.ref, {
                            status: 'available',
                            statusFixedAt: new Date(),
                            statusFixedReason: 'Security cleanup - stale busy status',
                            updatedAt: new Date()
                        });
                        fixedDrivers.push(driverDoc.data().name || driverId);
                    }
                }

                await batch.commit();

                return NextResponse.json({
                    success: true,
                    message: `Fixed stale status for ${fixedDrivers.length} drivers`,
                    affectedDrivers: fixedDrivers
                });
            }

            default:
                return NextResponse.json(
                    { success: false, error: 'Invalid action. Use "removeWrongAdmins" or "fixStaleDriverStatus"' },
                    { status: 400 }
                );
        }
    } catch (error: any) {
        console.error('Cleanup error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Cleanup failed' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    // Require super admin authorization
    const auth = await requireSuperAdmin(request);
    if (!auth.isSuperAdmin) {
        return NextResponse.json(
            { success: false, error: `Unauthorized: Only Super Admin (${SUPER_ADMIN_EMAIL}) can view cleanup info` },
            { status: 403 }
        );
    }

    try {
        // Get stats for cleanup
        const adminsSnapshot = await adminDb.collection('users')
            .where('role', '==', 'admin')
            .get();

        const wrongAdmins: string[] = [];
        adminsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.email !== SUPER_ADMIN_EMAIL) {
                wrongAdmins.push(data.email || doc.id);
            }
        });

        // Get stale busy drivers
        const busyDriversSnapshot = await adminDb.collection('drivers')
            .where('status', '==', 'busy')
            .get();

        const staleDrivers: string[] = [];
        for (const driverDoc of busyDriversSnapshot.docs) {
            const driverId = driverDoc.id;

            const activeBookingsSnap = await adminDb.collection('bookings')
                .where('driver.driverId', '==', driverId)
                .where('status', 'in', ['driver_assigned', 'driver_en_route', 'in_progress'])
                .get();

            if (activeBookingsSnap.empty) {
                staleDrivers.push(driverDoc.data().name || driverId);
            }
        }

        return NextResponse.json({
            success: true,
            superAdminEmail: SUPER_ADMIN_EMAIL,
            cleanup: {
                wrongAdmins: {
                    count: wrongAdmins.length,
                    emails: wrongAdmins
                },
                staleDrivers: {
                    count: staleDrivers.length,
                    names: staleDrivers
                }
            }
        });
    } catch (error: any) {
        console.error('Error getting cleanup info:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to get cleanup info' },
            { status: 500 }
        );
    }
}
