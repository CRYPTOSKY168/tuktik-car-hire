'use client';

import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { app } from './config';

let messaging: Messaging | null = null;

// Initialize messaging only on client side
export const initializeMessaging = (): Messaging | null => {
    if (typeof window === 'undefined') return null;

    if (!messaging && app) {
        try {
            messaging = getMessaging(app);
        } catch (error) {
            console.error('Failed to initialize Firebase Messaging:', error);
        }
    }
    return messaging;
};

// Request notification permission and get FCM token
export const requestNotificationPermission = async (): Promise<string | null> => {
    if (typeof window === 'undefined') return null;

    try {
        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.warn('Notifications not supported in this browser');
            return null;
        }

        // Request permission
        const permission = await Notification.requestPermission();

        if (permission !== 'granted') {
            console.warn('Notification permission denied');
            return null;
        }

        // Get FCM token
        const fcmMessaging = initializeMessaging();
        if (!fcmMessaging) return null;

        // Get VAPID key from environment
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

        if (!vapidKey) {
            console.warn('VAPID key not configured');
            return null;
        }

        const token = await getToken(fcmMessaging, { vapidKey });

        return token;
    } catch (error) {
        console.error('Error getting FCM token:', error);
        return null;
    }
};

// Listen for foreground messages
export const onForegroundMessage = (callback: (payload: any) => void): (() => void) | null => {
    const fcmMessaging = initializeMessaging();
    if (!fcmMessaging) return null;

    return onMessage(fcmMessaging, (payload) => {
        callback(payload);
    });
};

// Register service worker for FCM
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/',
        });
        return registration;
    } catch (error) {
        console.error('Service Worker registration failed:', error);
        return null;
    }
};

// Show local notification (for foreground messages)
export const showLocalNotification = (title: string, options: NotificationOptions): void => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
        // Note: vibrate is only supported in ServiceWorker notifications, not main thread
        new Notification(title, {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            ...options,
        });
    }
};

// Notification types for TukTik
export type NotificationType =
    | 'booking_created'
    | 'booking_confirmed'
    | 'driver_assigned'
    | 'driver_en_route'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'payment_success'
    | 'new_booking'
    | 'reminder';

// Get notification content based on type
export const getNotificationContent = (
    type: NotificationType,
    data?: { bookingId?: string; driverName?: string; driverPhone?: string; vehiclePlate?: string }
): { title: string; body: string } => {
    const contents: Record<NotificationType, { title: string; body: string }> = {
        booking_created: {
            title: 'จองสำเร็จ!',
            body: `การจอง #${data?.bookingId?.slice(-6).toUpperCase() || ''} ถูกสร้างแล้ว รอการยืนยัน`,
        },
        booking_confirmed: {
            title: 'ยืนยันการจองแล้ว!',
            body: `การจอง #${data?.bookingId?.slice(-6).toUpperCase() || ''} ได้รับการยืนยันแล้ว`,
        },
        driver_assigned: {
            title: 'มอบหมายคนขับแล้ว',
            body: `คนขับ ${data?.driverName || ''} (${data?.vehiclePlate || ''}) จะมารับคุณ`,
        },
        driver_en_route: {
            title: 'คนขับกำลังมา! 🚗',
            body: `${data?.driverName || 'คนขับ'} กำลังเดินทางมารับคุณ`,
        },
        in_progress: {
            title: 'เริ่มเดินทางแล้ว',
            body: 'ขอให้เดินทางปลอดภัย!',
        },
        completed: {
            title: 'เดินทางเสร็จสิ้น ✅',
            body: 'ขอบคุณที่ใช้บริการ TukTik!',
        },
        cancelled: {
            title: 'ยกเลิกการจอง',
            body: `การจอง #${data?.bookingId?.slice(-6).toUpperCase() || ''} ถูกยกเลิกแล้ว`,
        },
        payment_success: {
            title: 'ชำระเงินสำเร็จ 💳',
            body: 'ขอบคุณสำหรับการชำระเงิน',
        },
        new_booking: {
            title: 'งานจองใหม่! 🔔',
            body: `มีงานจองใหม่ #${data?.bookingId?.slice(-6).toUpperCase() || ''} รอดำเนินการ`,
        },
        reminder: {
            title: 'เตือนการเดินทาง ⏰',
            body: 'การเดินทางของคุณจะเริ่มในอีก 2 ชั่วโมง',
        },
    };

    return contents[type] || { title: 'TukTik', body: 'คุณมีการแจ้งเตือนใหม่' };
};
