/**
 * Capacitor Push Notifications Integration
 * ใช้สำหรับ Android/iOS native apps
 */

// Dynamic import เพื่อไม่ให้ error บน web browser ปกติ
let PushNotifications: any = null;
let Capacitor: any = null;

// Check if running in Capacitor
export const isCapacitor = (): boolean => {
    if (typeof window === 'undefined') return false;
    return !!(window as any).Capacitor?.isNativePlatform?.();
};

// Initialize Capacitor plugins
export const initCapacitorPlugins = async () => {
    if (!isCapacitor()) {
        console.log('[Push] Not running in Capacitor, skipping native initialization');
        return;
    }

    try {
        // Dynamic import Capacitor modules
        const capacitorCore = await import('@capacitor/core');
        const pushModule = await import('@capacitor/push-notifications');

        Capacitor = capacitorCore.Capacitor;
        PushNotifications = pushModule.PushNotifications;

        console.log('[Push] Capacitor plugins loaded successfully');
    } catch (error) {
        console.error('[Push] Failed to load Capacitor plugins:', error);
    }
};

// Request notification permissions
export const requestNotificationPermission = async (): Promise<boolean> => {
    if (!isCapacitor() || !PushNotifications) {
        console.log('[Push] Not in Capacitor or PushNotifications not loaded');
        return false;
    }

    try {
        // Check current permission status
        let permStatus = await PushNotifications.checkPermissions();
        console.log('[Push] Current permission status:', permStatus.receive);

        if (permStatus.receive === 'prompt') {
            // Request permission
            permStatus = await PushNotifications.requestPermissions();
            console.log('[Push] Permission after request:', permStatus.receive);
        }

        if (permStatus.receive !== 'granted') {
            console.log('[Push] Notification permission not granted');
            return false;
        }

        // Register with FCM
        await PushNotifications.register();
        console.log('[Push] Registered with FCM');
        return true;
    } catch (error) {
        console.error('[Push] Error requesting permission:', error);
        return false;
    }
};

// Setup push notification listeners
export const setupPushListeners = (callbacks: {
    onRegistration?: (token: string) => void;
    onNotificationReceived?: (notification: any) => void;
    onNotificationAction?: (notification: any) => void;
    onRegistrationError?: (error: any) => void;
}) => {
    if (!isCapacitor() || !PushNotifications) {
        console.log('[Push] Not in Capacitor, skipping listener setup');
        return () => {};
    }

    const listeners: any[] = [];

    // Registration success - receive FCM token
    listeners.push(
        PushNotifications.addListener('registration', (token: any) => {
            console.log('[Push] FCM Token received:', token.value);
            callbacks.onRegistration?.(token.value);
        })
    );

    // Registration error
    listeners.push(
        PushNotifications.addListener('registrationError', (error: any) => {
            console.error('[Push] Registration error:', error);
            callbacks.onRegistrationError?.(error);
        })
    );

    // Notification received while app is in foreground
    listeners.push(
        PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
            console.log('[Push] Notification received:', notification);
            callbacks.onNotificationReceived?.(notification);
        })
    );

    // Notification action performed (user tapped on notification)
    listeners.push(
        PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => {
            console.log('[Push] Notification action:', notification);
            callbacks.onNotificationAction?.(notification);
        })
    );

    // Return cleanup function
    return async () => {
        for (const listener of listeners) {
            try {
                const resolved = await listener;
                resolved?.remove?.();
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    };
};

// Full initialization
export const initializePushNotifications = async (
    onToken?: (token: string) => void
): Promise<string | null> => {
    console.log('[Push] Starting initialization...');
    console.log('[Push] Is Capacitor:', isCapacitor());

    if (!isCapacitor()) {
        return null;
    }

    await initCapacitorPlugins();

    return new Promise((resolve) => {
        // Setup listeners first
        setupPushListeners({
            onRegistration: (token) => {
                console.log('[Push] Got FCM token:', token.substring(0, 30) + '...');
                onToken?.(token);
                resolve(token);
            },
            onRegistrationError: (error) => {
                console.error('[Push] Registration failed:', error);
                resolve(null);
            },
            onNotificationReceived: (notification) => {
                console.log('[Push] Foreground notification:', notification.title);
                // Show local alert for foreground notifications
                if (typeof window !== 'undefined' && notification.title) {
                    // You could show a toast or in-app notification here
                    console.log(`[Push] ${notification.title}: ${notification.body}`);
                }
            },
            onNotificationAction: (action) => {
                console.log('[Push] User tapped notification:', action.notification?.data);
                // Handle navigation based on notification data
                const data = action.notification?.data;
                if (data?.bookingId) {
                    window.location.href = `/dashboard?booking=${data.bookingId}`;
                }
            },
        });

        // Request permission and register
        requestNotificationPermission().then((granted) => {
            if (!granted) {
                console.log('[Push] Permission not granted, resolving with null');
                resolve(null);
            }
            // If granted, the registration listener will resolve
        });

        // Timeout after 10 seconds
        setTimeout(() => {
            console.log('[Push] Timeout waiting for registration');
            resolve(null);
        }, 10000);
    });
};
