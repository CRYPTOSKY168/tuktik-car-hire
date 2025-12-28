import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from './admin';

// Super Admin email - the only user who can change admin roles
// This should be set in environment variables for production
export const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || 'phiopan@gmail.com').trim();

export interface AuthResult {
    authenticated: boolean;
    user: {
        uid: string;
        email: string | null;
        role: 'user' | 'admin' | 'super_admin';
    } | null;
    error?: string;
}

/**
 * Verify Firebase ID token from request
 * Returns user info if authenticated
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
    try {
        // Get token from Authorization header
        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                authenticated: false,
                user: null,
                error: 'Missing or invalid authorization header'
            };
        }

        const token = authHeader.split('Bearer ')[1];

        if (!token) {
            return {
                authenticated: false,
                user: null,
                error: 'No token provided'
            };
        }

        // Verify the token
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Get user's role from Firestore
        const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        const userData = userDoc.data();

        let role: 'user' | 'admin' | 'super_admin' = 'user';

        // Check if super admin
        if (decodedToken.email === SUPER_ADMIN_EMAIL) {
            role = 'super_admin';
        } else if (userData?.role === 'admin') {
            role = 'admin';
        }

        return {
            authenticated: true,
            user: {
                uid: decodedToken.uid,
                email: decodedToken.email || null,
                role
            }
        };
    } catch (error: any) {
        console.error('Auth verification failed:', error);
        return {
            authenticated: false,
            user: null,
            error: error.message || 'Token verification failed'
        };
    }
}

/**
 * Check if user is admin or super admin
 */
export async function requireAdmin(request: NextRequest): Promise<AuthResult & { isAdmin: boolean }> {
    const auth = await verifyAuth(request);
    const isAdmin = auth.authenticated && (auth.user?.role === 'admin' || auth.user?.role === 'super_admin');

    return {
        ...auth,
        isAdmin
    };
}

/**
 * Check if user is super admin (only one who can manage other admins)
 */
export async function requireSuperAdmin(request: NextRequest): Promise<AuthResult & { isSuperAdmin: boolean }> {
    const auth = await verifyAuth(request);
    const isSuperAdmin = auth.authenticated && auth.user?.role === 'super_admin';

    return {
        ...auth,
        isSuperAdmin
    };
}
