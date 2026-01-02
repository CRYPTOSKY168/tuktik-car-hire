/**
 * Capacitor Firebase Phone Authentication
 * ใช้สำหรับ Android/iOS native apps (bypass reCAPTCHA)
 */

import { isCapacitor } from './pushNotifications';
import { auth } from '@/lib/firebase/config';
import { signInWithCustomToken } from 'firebase/auth';

// Dynamic import to avoid SSR issues
let FirebaseAuthentication: any = null;

// Initialize Capacitor Firebase Auth plugin
export const initCapacitorAuth = async () => {
    if (!isCapacitor()) {
        console.log('[CapacitorAuth] Not running in Capacitor');
        return false;
    }

    try {
        const authModule = await import('@capacitor-firebase/authentication');
        FirebaseAuthentication = authModule.FirebaseAuthentication;
        console.log('[CapacitorAuth] Plugin loaded successfully');
        return true;
    } catch (error) {
        console.error('[CapacitorAuth] Failed to load plugin:', error);
        return false;
    }
};

// Helper function to sync native auth with web SDK using custom token
const syncNativeAuthToWeb = async (): Promise<boolean> => {
    try {
        if (!FirebaseAuthentication || !auth) {
            console.error('[CapacitorAuth] Plugin or web auth not available for sync');
            return false;
        }

        // Get ID token from native auth
        console.log('[CapacitorAuth] Getting ID token from native auth...');
        const tokenResult = await FirebaseAuthentication.getIdToken({ forceRefresh: false });

        if (!tokenResult?.token) {
            console.error('[CapacitorAuth] No ID token returned from native auth');
            return false;
        }

        console.log('[CapacitorAuth] Got ID token, requesting custom token from backend...');

        // Send to backend to get custom token
        const response = await fetch('/api/auth/create-custom-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: tokenResult.token })
        });

        const data = await response.json();

        if (!data.success || !data.customToken) {
            console.error('[CapacitorAuth] Failed to get custom token:', data.error);
            return false;
        }

        console.log('[CapacitorAuth] Got custom token, signing in web SDK...');

        // Sign in web SDK with custom token
        await signInWithCustomToken(auth, data.customToken);

        console.log('[CapacitorAuth] Web SDK signed in successfully!');
        return true;

    } catch (error) {
        console.error('[CapacitorAuth] Error syncing auth to web:', error);
        return false;
    }
};

// Phone number sign in - Step 1: Send verification code
export const capacitorSendPhoneVerification = async (
    phoneNumber: string
): Promise<{ success: boolean; verificationId?: string; error?: string; autoVerified?: boolean }> => {
    if (!isCapacitor()) {
        return { success: false, error: 'Not running in Capacitor' };
    }

    if (!FirebaseAuthentication) {
        await initCapacitorAuth();
    }

    if (!FirebaseAuthentication) {
        return { success: false, error: 'FirebaseAuthentication plugin not loaded' };
    }

    try {
        console.log('[CapacitorAuth] Sending verification to:', phoneNumber);

        // Use native phone authentication
        const result = await FirebaseAuthentication.signInWithPhoneNumber({
            phoneNumber: phoneNumber,
        });

        // Log full result for debugging
        console.log('[CapacitorAuth] signInWithPhoneNumber result:', JSON.stringify(result, null, 2));

        // Check if result exists
        if (!result) {
            console.error('[CapacitorAuth] Empty response from plugin');
            return { success: false, error: 'Empty response from authentication plugin' };
        }

        // Check for verificationId (standard response for phone auth)
        if (result.verificationId) {
            console.log('[CapacitorAuth] Got verificationId:', result.verificationId);
            return {
                success: true,
                verificationId: result.verificationId,
            };
        }

        // Check if auto-verification happened (Android feature with Google Play Services)
        // In this case, user is already signed in
        if (result.user) {
            console.log('[CapacitorAuth] Auto-verified! User:', result.user.uid);
            return {
                success: true,
                autoVerified: true,
            };
        }

        // Unknown response format - log and return error
        console.warn('[CapacitorAuth] Unexpected response format:', result);
        return {
            success: false,
            error: 'Unexpected response: ' + JSON.stringify(result),
        };

    } catch (error: any) {
        console.error('[CapacitorAuth] Error sending verification:', error);
        console.error('[CapacitorAuth] Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack,
        });

        // Map error codes to Thai messages
        let errorMessage = error.message || 'ไม่สามารถส่ง OTP ได้';

        if (error.code === 'invalid-phone-number' || error.message?.includes('invalid')) {
            errorMessage = 'เบอร์โทรศัพท์ไม่ถูกต้อง';
        } else if (error.code === 'too-many-requests' || error.message?.includes('too-many')) {
            errorMessage = 'ส่ง OTP บ่อยเกินไป กรุณารอสักครู่';
        } else if (error.code === 'quota-exceeded') {
            errorMessage = 'เกินโควต้าการส่ง SMS';
        } else if (error.message?.includes('null object reference')) {
            errorMessage = 'Plugin initialization failed. Please check google-services.json';
        }

        return { success: false, error: errorMessage };
    }
};

// Phone number sign in - Step 2: Confirm verification code
export const capacitorConfirmPhoneVerification = async (
    verificationId: string,
    verificationCode: string
): Promise<{ success: boolean; error?: string }> => {
    if (!isCapacitor()) {
        return { success: false, error: 'Not running in Capacitor' };
    }

    if (!FirebaseAuthentication) {
        return { success: false, error: 'FirebaseAuthentication plugin not loaded' };
    }

    try {
        console.log('[CapacitorAuth] Confirming verification code...');

        await FirebaseAuthentication.confirmVerificationCode({
            verificationId: verificationId,
            verificationCode: verificationCode,
        });

        console.log('[CapacitorAuth] Phone authentication successful!');

        // Sync native auth to web SDK using custom token
        console.log('[CapacitorAuth] Syncing phone auth to web SDK...');
        const synced = await syncNativeAuthToWeb();

        if (synced) {
            console.log('[CapacitorAuth] Phone auth synced to web SDK successfully!');
        } else {
            console.warn('[CapacitorAuth] Failed to sync phone auth to web SDK');
        }

        return { success: true };
    } catch (error: any) {
        console.error('[CapacitorAuth] Error confirming code:', error);

        let errorMessage = 'รหัส OTP ไม่ถูกต้อง';

        if (error.code === 'invalid-verification-code' || error.message?.includes('invalid')) {
            errorMessage = 'รหัส OTP ไม่ถูกต้อง กรุณาลองใหม่';
        } else if (error.code === 'code-expired' || error.message?.includes('expired')) {
            errorMessage = 'รหัส OTP หมดอายุ กรุณาขอรหัสใหม่';
        }

        return { success: false, error: errorMessage };
    }
};

// Get current user from Capacitor Firebase Auth
export const capacitorGetCurrentUser = async (): Promise<any | null> => {
    if (!isCapacitor() || !FirebaseAuthentication) {
        return null;
    }

    try {
        const result = await FirebaseAuthentication.getCurrentUser();
        return result.user;
    } catch (error) {
        console.error('[CapacitorAuth] Error getting current user:', error);
        return null;
    }
};

// Sign out from Capacitor Firebase Auth
export const capacitorSignOut = async (): Promise<boolean> => {
    if (!isCapacitor() || !FirebaseAuthentication) {
        return false;
    }

    try {
        await FirebaseAuthentication.signOut();
        return true;
    } catch (error) {
        console.error('[CapacitorAuth] Error signing out:', error);
        return false;
    }
};

// Add auth state listener
export const addCapacitorAuthStateListener = (
    callback: (user: any) => void
): (() => void) => {
    if (!isCapacitor() || !FirebaseAuthentication) {
        return () => {};
    }

    const listener = FirebaseAuthentication.addListener('authStateChange', (change: any) => {
        console.log('[CapacitorAuth] Auth state changed:', change.user?.uid || 'null');
        callback(change.user);
    });

    return () => {
        listener.then((l: any) => l.remove());
    };
};

// Google Sign-in via Capacitor native plugin
export const capacitorSignInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    if (!isCapacitor()) {
        return { success: false, error: 'Not running in Capacitor' };
    }

    if (!FirebaseAuthentication) {
        await initCapacitorAuth();
    }

    if (!FirebaseAuthentication) {
        return { success: false, error: 'FirebaseAuthentication plugin not loaded' };
    }

    try {
        console.log('[CapacitorAuth] Starting Google Sign-in...');

        const result = await FirebaseAuthentication.signInWithGoogle();

        console.log('[CapacitorAuth] Google Sign-in result:', JSON.stringify(result, null, 2));

        if (result?.user) {
            console.log('[CapacitorAuth] Native Google Sign-in successful! User:', result.user.uid);

            // Sync native auth to web SDK using custom token
            console.log('[CapacitorAuth] Syncing auth to web SDK...');
            const synced = await syncNativeAuthToWeb();

            if (synced) {
                console.log('[CapacitorAuth] Auth synced to web SDK successfully!');
                return { success: true };
            } else {
                console.warn('[CapacitorAuth] Failed to sync auth to web SDK');
                // Still return success - native auth worked
                return { success: true };
            }
        }

        return { success: false, error: 'No user returned from Google Sign-in' };
    } catch (error: any) {
        console.error('[CapacitorAuth] Google Sign-in error:', error);
        console.error('[CapacitorAuth] Error code:', error.code);
        console.error('[CapacitorAuth] Error message:', error.message);

        let errorMessage = 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้';

        // Handle specific error cases
        if (error.message?.includes('No credentials available') ||
            error.message?.includes('NoCredentialException')) {
            // No Google account on device
            errorMessage = 'กรุณาเพิ่มบัญชี Google ในอุปกรณ์ก่อน (Settings → Accounts → Add Google)';
        } else if (error.code === 'auth/popup-closed-by-user' || error.message?.includes('cancel')) {
            errorMessage = 'ยกเลิกการเข้าสู่ระบบ';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต';
        } else if (error.message?.includes('missing initial state')) {
            // Web redirect failed - sessionStorage issue
            errorMessage = 'กรุณาเพิ่มบัญชี Google ในอุปกรณ์ก่อน (Settings → Accounts → Add Google)';
        }

        return { success: false, error: errorMessage };
    }
};
