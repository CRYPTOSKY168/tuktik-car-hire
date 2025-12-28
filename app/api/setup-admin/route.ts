import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { requireSuperAdmin, SUPER_ADMIN_EMAIL } from '@/lib/firebase/adminAuth';

/**
 * API สำหรับ setup admin user
 *
 * SECURITY:
 * - Only Super Admin can use this API
 * - Exception: If no admins exist, allow first-time setup
 *
 * GET: ดึงรายชื่อ users ทั้งหมด (requires super admin)
 * POST: ตั้งค่า user เป็น admin (requires super admin)
 */

// Check if this is first-time setup (no admins exist)
async function isFirstTimeSetup(): Promise<boolean> {
    const adminSnapshot = await adminDb.collection('users')
        .where('role', '==', 'admin')
        .limit(1)
        .get();
    return adminSnapshot.empty;
}

export async function GET(request: NextRequest) {
    // Check authorization
    const isFirstSetup = await isFirstTimeSetup();

    if (!isFirstSetup) {
        // If admins exist, require super admin
        const auth = await requireSuperAdmin(request);
        if (!auth.isSuperAdmin) {
            return NextResponse.json(
                { success: false, error: `Unauthorized: Only Super Admin (${SUPER_ADMIN_EMAIL}) can access this API` },
                { status: 403 }
            );
        }
    }

    try {
        // Get all users from Firebase Auth
        const listUsersResult = await adminAuth.listUsers(100);
        const users = listUsersResult.users.map(user => ({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            phone: user.phoneNumber,
        }));

        // Check existing admins
        const adminSnapshot = await adminDb.collection('users')
            .where('role', '==', 'admin')
            .get();

        const existingAdmins = adminSnapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data(),
        }));

        return NextResponse.json({
            success: true,
            users,
            existingAdmins,
            totalUsers: users.length,
            totalAdmins: existingAdmins.length,
            superAdminEmail: SUPER_ADMIN_EMAIL,
            isFirstTimeSetup: isFirstSetup,
        });
    } catch (error: any) {
        console.error('Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const isFirstSetup = await isFirstTimeSetup();

    // If admins exist, require super admin authorization
    if (!isFirstSetup) {
        const auth = await requireSuperAdmin(request);
        if (!auth.isSuperAdmin) {
            return NextResponse.json(
                { success: false, error: `Unauthorized: Only Super Admin (${SUPER_ADMIN_EMAIL}) can modify admin access` },
                { status: 403 }
            );
        }
    }

    try {
        const body = await request.json();
        const { email, uid, action } = body;

        if (action === 'setAdmin') {
            let userId = uid;

            // If email provided, find user by email
            if (email && !uid) {
                try {
                    const userRecord = await adminAuth.getUserByEmail(email);
                    userId = userRecord.uid;
                } catch (e) {
                    return NextResponse.json(
                        { success: false, error: `User with email ${email} not found` },
                        { status: 404 }
                    );
                }
            }

            if (!userId) {
                return NextResponse.json(
                    { success: false, error: 'Please provide email or uid' },
                    { status: 400 }
                );
            }

            // Get user info
            const userRecord = await adminAuth.getUser(userId);

            // For first-time setup, only allow setting the super admin email
            if (isFirstSetup && userRecord.email !== SUPER_ADMIN_EMAIL) {
                return NextResponse.json(
                    { success: false, error: `First admin must be Super Admin (${SUPER_ADMIN_EMAIL})` },
                    { status: 403 }
                );
            }

            // Set user as admin
            const updateData: any = {
                role: 'admin',
                updatedAt: new Date(),
            };
            if (userRecord.email) updateData.email = userRecord.email;
            if (userRecord.displayName) updateData.displayName = userRecord.displayName;
            if (userRecord.phoneNumber) updateData.phone = userRecord.phoneNumber;

            await adminDb.collection('users').doc(userId).set(updateData, { merge: true });

            return NextResponse.json({
                success: true,
                message: `User ${userRecord.email} is now an admin`,
                user: {
                    uid: userId,
                    email: userRecord.email,
                    displayName: userRecord.displayName,
                    role: 'admin',
                }
            });
        }

        if (action === 'approveDriver') {
            let userId = uid;

            if (email && !uid) {
                try {
                    const userRecord = await adminAuth.getUserByEmail(email);
                    userId = userRecord.uid;
                } catch (e) {
                    return NextResponse.json(
                        { success: false, error: `User with email ${email} not found` },
                        { status: 404 }
                    );
                }
            }

            if (!userId) {
                return NextResponse.json(
                    { success: false, error: 'Please provide email or uid' },
                    { status: 400 }
                );
            }

            // Get user info
            const userRecord = await adminAuth.getUser(userId);

            // Approve user as driver
            await adminDb.collection('users').doc(userId).set({
                isApprovedDriver: true,
                email: userRecord.email,
                displayName: userRecord.displayName || userRecord.email?.split('@')[0],
                driverApprovedAt: new Date(),
                updatedAt: new Date(),
            }, { merge: true });

            return NextResponse.json({
                success: true,
                message: `User ${userRecord.email} is now approved as driver`,
                user: {
                    uid: userId,
                    email: userRecord.email,
                    isApprovedDriver: true,
                }
            });
        }

        return NextResponse.json(
            { success: false, error: 'Invalid action. Use "setAdmin" or "approveDriver"' },
            { status: 400 }
        );

    } catch (error: any) {
        console.error('Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
