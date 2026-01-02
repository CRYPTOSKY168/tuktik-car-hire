import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { safeErrorMessage, logError } from '@/lib/utils/safeError';

/**
 * POST /api/auth/create-custom-token
 * Creates a custom token from a Firebase ID token
 * Used for Capacitor apps where native auth doesn't sync with web SDK
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { idToken } = body;

        if (!idToken) {
            return NextResponse.json(
                { success: false, error: 'ID token is required' },
                { status: 400 }
            );
        }

        // Verify the ID token from native auth
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        console.log('[CustomToken] Verified ID token for user:', uid);

        // Create a custom token for the web SDK
        const customToken = await adminAuth.createCustomToken(uid);

        console.log('[CustomToken] Created custom token for user:', uid);

        return NextResponse.json({
            success: true,
            customToken,
            uid
        });

    } catch (error: unknown) {
        logError('auth/create-custom-token', error);
        return NextResponse.json(
            { success: false, error: safeErrorMessage(error, 'Failed to create custom token') },
            { status: 500 }
        );
    }
}
