/**
 * Push Notification Utility
 * ส่ง Push Notification ผ่าน Firebase Cloud Messaging (FCM)
 */

import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// Initialize Firebase Admin if not already initialized
function getAdminApp(): App {
    if (getApps().length > 0) {
        return getApps()[0];
    }

    return initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

export interface PushNotificationPayload {
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
}

/**
 * ส่ง Push Notification ไปยัง user โดยใช้ userId
 */
export async function sendPushNotificationToUser(
    userId: string,
    payload: PushNotificationPayload
): Promise<{ success: boolean; error?: string }> {
    try {
        const app = getAdminApp();
        const db = getFirestore(app);
        const messaging = getMessaging(app);

        // Get user's FCM token from Firestore
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();

        if (!userData?.fcmToken) {
            console.log(`[Push] No FCM token for user ${userId}`);
            return { success: false, error: 'No FCM token found' };
        }

        const fcmToken = userData.fcmToken;

        // Build the message
        const message = {
            token: fcmToken,
            notification: {
                title: payload.title,
                body: payload.body,
                ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
            },
            data: payload.data || {},
            android: {
                priority: 'high' as const,
                notification: {
                    sound: 'default',
                    channelId: 'default',
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                    },
                },
            },
        };

        // Send the notification
        const response = await messaging.send(message);
        console.log(`[Push] ✅ Sent to user ${userId}:`, payload.title);
        return { success: true };

    } catch (error: any) {
        console.error(`[Push] ❌ Error sending to user ${userId}:`, error.message);

        // Handle invalid token (user uninstalled app or token expired)
        if (error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered') {
            // Optionally: Remove invalid token from Firestore
            try {
                const app = getAdminApp();
                const db = getFirestore(app);
                await db.collection('users').doc(userId).update({
                    fcmToken: null,
                    fcmTokenInvalidAt: new Date(),
                });
                console.log(`[Push] Removed invalid FCM token for user ${userId}`);
            } catch (e) {
                // Ignore cleanup errors
            }
        }

        return { success: false, error: error.message };
    }
}

/**
 * ส่ง Push Notification ไปยังหลาย users
 */
export async function sendPushNotificationToUsers(
    userIds: string[],
    payload: PushNotificationPayload
): Promise<{ successCount: number; failCount: number }> {
    let successCount = 0;
    let failCount = 0;

    for (const userId of userIds) {
        const result = await sendPushNotificationToUser(userId, payload);
        if (result.success) {
            successCount++;
        } else {
            failCount++;
        }
    }

    return { successCount, failCount };
}

/**
 * ส่ง Push Notification สำหรับ Booking Status Update
 */
export async function sendBookingStatusNotification(
    userId: string,
    bookingId: string,
    status: string,
    driverName?: string
): Promise<{ success: boolean; error?: string }> {
    // Define messages for each status
    const statusConfig: Record<string, { title: string; body: string; emoji: string }> = {
        'confirmed': {
            title: 'การจองได้รับการยืนยัน',
            body: 'การจองของคุณได้รับการยืนยันแล้ว กำลังหาคนขับให้',
            emoji: '✅'
        },
        'driver_assigned': {
            title: 'พบคนขับแล้ว!',
            body: driverName ? `${driverName} จะเป็นคนขับของคุณ` : 'มีคนขับรับงานของคุณแล้ว',
            emoji: '🚗'
        },
        'driver_en_route': {
            title: 'คนขับกำลังมา',
            body: driverName ? `${driverName} กำลังเดินทางมารับคุณ` : 'คนขับกำลังเดินทางมารับคุณ',
            emoji: '🚙'
        },
        'in_progress': {
            title: 'เริ่มเดินทางแล้ว',
            body: 'กำลังเดินทางไปยังจุดหมาย',
            emoji: '🛣️'
        },
        'completed': {
            title: 'ถึงปลายทางแล้ว!',
            body: 'ขอบคุณที่ใช้บริการ TukTik',
            emoji: '🎉'
        },
        'cancelled': {
            title: 'การจองถูกยกเลิก',
            body: 'การจองของคุณถูกยกเลิกแล้ว',
            emoji: '❌'
        },
    };

    const config = statusConfig[status];
    if (!config) {
        console.log(`[Push] No notification config for status: ${status}`);
        return { success: false, error: 'Unknown status' };
    }

    return sendPushNotificationToUser(userId, {
        title: `${config.emoji} ${config.title}`,
        body: config.body,
        data: {
            type: 'booking_status',
            bookingId: bookingId,
            status: status,
        },
    });
}

/**
 * ส่ง Push Notification ให้คนขับเมื่อมีงานใหม่
 */
export async function sendNewJobNotification(
    driverUserId: string,
    bookingId: string,
    pickupLocation: string,
    dropoffLocation: string
): Promise<{ success: boolean; error?: string }> {
    return sendPushNotificationToUser(driverUserId, {
        title: '🔔 มีงานใหม่!',
        body: `${pickupLocation} → ${dropoffLocation}`,
        data: {
            type: 'new_job',
            bookingId: bookingId,
        },
    });
}
