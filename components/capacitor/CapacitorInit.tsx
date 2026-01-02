'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';

/**
 * Component ที่ initialize Capacitor Push Notifications
 * ต้อง mount ใน layout เพื่อให้ทำงานบน Android/iOS
 */
export default function CapacitorInit() {
    const { user } = useAuth();
    const [fcmToken, setFcmToken] = useState<string | null>(null);
    const [isCapacitor, setIsCapacitor] = useState(false);

    useEffect(() => {
        // Check if running in Capacitor
        const checkCapacitor = () => {
            const inCapacitor = !!(window as any).Capacitor?.isNativePlatform?.();
            setIsCapacitor(inCapacitor);
            console.log('[Capacitor] Running in Capacitor:', inCapacitor);
            return inCapacitor;
        };

        if (!checkCapacitor()) {
            return;
        }

        // Initialize Push Notifications
        const initPush = async () => {
            try {
                // Dynamic import to avoid SSR issues
                const { PushNotifications } = await import('@capacitor/push-notifications');

                console.log('[Capacitor] Initializing Push Notifications...');

                // Check permissions
                let permStatus = await PushNotifications.checkPermissions();
                console.log('[Capacitor] Current permission:', permStatus.receive);

                if (permStatus.receive === 'prompt') {
                    permStatus = await PushNotifications.requestPermissions();
                    console.log('[Capacitor] Permission after request:', permStatus.receive);
                }

                if (permStatus.receive !== 'granted') {
                    console.log('[Capacitor] Notification permission denied');
                    return;
                }

                // Add listeners BEFORE registering
                await PushNotifications.addListener('registration', (token) => {
                    console.log('[Capacitor] 🔑 FCM Token:', token.value);
                    setFcmToken(token.value);

                    // Save token to Firestore if user is logged in
                    if (user?.uid) {
                        saveFcmToken(user.uid, token.value);
                    }
                });

                await PushNotifications.addListener('registrationError', (error) => {
                    console.error('[Capacitor] Registration error:', error);
                });

                await PushNotifications.addListener('pushNotificationReceived', (notification) => {
                    console.log('[Capacitor] 📬 Notification received:', notification);
                    // Show in-app notification
                    showInAppNotification(notification.title || '', notification.body || '');
                });

                await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
                    console.log('[Capacitor] 👆 Notification tapped:', action);
                    // Navigate based on notification data
                    handleNotificationAction(action.notification.data);
                });

                // Register with FCM
                await PushNotifications.register();
                console.log('[Capacitor] Registered with FCM');

            } catch (error) {
                console.error('[Capacitor] Error initializing push:', error);
            }
        };

        initPush();
    }, [user]);

    // Save FCM token when user logs in
    useEffect(() => {
        if (user?.uid && fcmToken && isCapacitor) {
            saveFcmToken(user.uid, fcmToken);
        }
    }, [user?.uid, fcmToken, isCapacitor]);

    return null; // This component doesn't render anything
}

// Save FCM token to Firestore
async function saveFcmToken(userId: string, token: string) {
    try {
        const { doc, setDoc, getFirestore } = await import('firebase/firestore');
        const { getApp } = await import('firebase/app');

        const db = getFirestore(getApp());
        await setDoc(doc(db, 'users', userId), {
            fcmToken: token,
            fcmTokenUpdatedAt: new Date(),
            platform: 'android', // or detect platform
        }, { merge: true });

        console.log('[Capacitor] FCM token saved to Firestore');
    } catch (error) {
        console.error('[Capacitor] Error saving FCM token:', error);
    }
}

// Show in-app notification (simple alert for now)
function showInAppNotification(title: string, body: string) {
    // You could use a toast component here
    if (typeof window !== 'undefined') {
        // Simple notification for demo
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 left-4 right-4 bg-white rounded-xl shadow-2xl p-4 z-[9999] animate-slide-down';
        notification.innerHTML = `
            <div class="flex items-start gap-3">
                <div class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span class="material-symbols-outlined text-white">notifications</span>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="font-semibold text-gray-900">${title}</p>
                    <p class="text-sm text-gray-600">${body}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="text-gray-400 hover:text-gray-600">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
        `;
        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => notification.remove(), 5000);
    }
}

// Handle notification tap action
function handleNotificationAction(data: any) {
    if (!data) return;

    // Navigate based on notification type
    if (data.bookingId) {
        window.location.href = `/dashboard?booking=${data.bookingId}`;
    } else if (data.type === 'new_job') {
        window.location.href = '/driver';
    }
}
