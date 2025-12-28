/**
 * TukTik Firebase Cloud Functions
 * ================================
 * Push Notification System for Airport Transfer Bookings
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

// ============================================
// NOTIFICATION CONTENT (Thai + English)
// ============================================

interface NotificationContent {
    title: { th: string; en: string };
    body: { th: string; en: string };
}

const getStatusNotification = (
    status: string,
    bookingId: string,
    driverInfo?: { name?: string; vehiclePlate?: string }
): NotificationContent => {
    const shortId = bookingId.slice(-6).toUpperCase();

    const notifications: Record<string, NotificationContent> = {
        confirmed: {
            title: { th: 'ยืนยันการจองแล้ว!', en: 'Booking Confirmed!' },
            body: {
                th: `การจอง #${shortId} ได้รับการยืนยันแล้ว`,
                en: `Booking #${shortId} has been confirmed`
            }
        },
        driver_assigned: {
            title: { th: 'มอบหมายคนขับแล้ว', en: 'Driver Assigned' },
            body: {
                th: `คนขับ ${driverInfo?.name || ''} ทะเบียน ${driverInfo?.vehiclePlate || ''} จะมารับคุณ`,
                en: `Driver ${driverInfo?.name || ''} (${driverInfo?.vehiclePlate || ''}) will pick you up`
            }
        },
        driver_en_route: {
            title: { th: 'คนขับกำลังมา!', en: 'Driver On The Way!' },
            body: {
                th: `${driverInfo?.name || 'คนขับ'} กำลังเดินทางมารับคุณแล้ว`,
                en: `${driverInfo?.name || 'Your driver'} is on the way to pick you up`
            }
        },
        in_progress: {
            title: { th: 'เริ่มเดินทางแล้ว', en: 'Trip Started' },
            body: {
                th: 'ขอให้เดินทางปลอดภัย!',
                en: 'Have a safe trip!'
            }
        },
        completed: {
            title: { th: 'เดินทางเสร็จสิ้น', en: 'Trip Completed' },
            body: {
                th: 'ขอบคุณที่ใช้บริการ TukTik!',
                en: 'Thank you for using TukTik!'
            }
        },
        cancelled: {
            title: { th: 'ยกเลิกการจอง', en: 'Booking Cancelled' },
            body: {
                th: `การจอง #${shortId} ถูกยกเลิกแล้ว`,
                en: `Booking #${shortId} has been cancelled`
            }
        }
    };

    return notifications[status] || {
        title: { th: 'อัปเดตการจอง', en: 'Booking Update' },
        body: {
            th: `สถานะการจอง #${shortId} มีการเปลี่ยนแปลง`,
            en: `Booking #${shortId} status has been updated`
        }
    };
};

// ============================================
// CLOUD FUNCTION: On Booking Status Change
// ============================================

export const onBookingStatusChange = functions.firestore
    .document('bookings/{bookingId}')
    .onUpdate(async (change, context) => {
        const bookingId = context.params.bookingId;
        const beforeData = change.before.data();
        const afterData = change.after.data();

        // Check if status actually changed
        if (beforeData.status === afterData.status) {
            return null;
        }

        const newStatus = afterData.status;
        const userId = afterData.userId;

        if (!userId) {
            console.log('No userId found for booking:', bookingId);
            return null;
        }

        // Get user's FCM tokens
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();

        if (!userData?.fcmTokens || userData.fcmTokens.length === 0) {
            console.log('No FCM tokens found for user:', userId);
            return null;
        }

        // Get notification content
        const driverInfo = afterData.driver || afterData.driverInfo;
        const notification = getStatusNotification(newStatus, bookingId, driverInfo);

        // Prepare message payload
        const message: admin.messaging.MulticastMessage = {
            tokens: userData.fcmTokens,
            notification: {
                title: notification.title.th, // Default to Thai
                body: notification.body.th,
            },
            data: {
                bookingId: bookingId,
                status: newStatus,
                type: 'status_update',
                click_action: `/confirmation?bookingId=${bookingId}`,
            },
            android: {
                notification: {
                    icon: 'ic_notification',
                    color: '#2563eb',
                    channelId: 'tuktik_bookings',
                    priority: 'high' as const,
                },
            },
            apns: {
                payload: {
                    aps: {
                        badge: 1,
                        sound: 'default',
                        category: 'BOOKING_UPDATE',
                    },
                },
            },
            webpush: {
                headers: {
                    Urgency: 'high',
                },
                notification: {
                    icon: '/icons/icon-192x192.png',
                    badge: '/icons/icon-72x72.png',
                    vibrate: [200, 100, 200],
                    requireInteraction: true,
                    actions: [
                        { action: 'view', title: 'ดูรายละเอียด' },
                        { action: 'dismiss', title: 'ปิด' },
                    ],
                },
                fcmOptions: {
                    link: `/confirmation?bookingId=${bookingId}`,
                },
            },
        };

        try {
            const response = await messaging.sendEachForMulticast(message);
            console.log(`Sent ${response.successCount} messages for booking ${bookingId}`);

            // Remove invalid tokens
            if (response.failureCount > 0) {
                const invalidTokens: string[] = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const error = resp.error;
                        if (
                            error?.code === 'messaging/invalid-registration-token' ||
                            error?.code === 'messaging/registration-token-not-registered'
                        ) {
                            invalidTokens.push(userData.fcmTokens[idx]);
                        }
                    }
                });

                if (invalidTokens.length > 0) {
                    const validTokens = userData.fcmTokens.filter(
                        (token: string) => !invalidTokens.includes(token)
                    );
                    await db.collection('users').doc(userId).update({
                        fcmTokens: validTokens,
                    });
                    console.log(`Removed ${invalidTokens.length} invalid tokens`);
                }
            }
        } catch (error) {
            console.error('Error sending push notification:', error);
        }

        return null;
    });

// ============================================
// CLOUD FUNCTION: On New Booking (Admin Alert)
// ============================================

export const onNewBooking = functions.firestore
    .document('bookings/{bookingId}')
    .onCreate(async (snapshot, context) => {
        const bookingId = context.params.bookingId;
        const bookingData = snapshot.data();

        // Get all admin users
        const adminsSnapshot = await db.collection('users')
            .where('role', '==', 'admin')
            .get();

        const adminTokens: string[] = [];
        adminsSnapshot.forEach((doc) => {
            const adminData = doc.data();
            if (adminData.fcmTokens) {
                adminTokens.push(...adminData.fcmTokens);
            }
        });

        if (adminTokens.length === 0) {
            console.log('No admin FCM tokens found');
            return null;
        }

        const customerName = bookingData.passengerName || bookingData.contactName || 'ลูกค้า';
        const route = `${bookingData.pickupLocation?.name || 'ต้นทาง'} → ${bookingData.dropoffLocation?.name || 'ปลายทาง'}`;
        const amount = bookingData.totalCost?.toLocaleString() || '0';

        const message: admin.messaging.MulticastMessage = {
            tokens: adminTokens,
            notification: {
                title: 'งานจองใหม่!',
                body: `${customerName} - ${route} (฿${amount})`,
            },
            data: {
                bookingId: bookingId,
                type: 'new_booking',
                click_action: `/admin/bookings?highlight=${bookingId}`,
            },
            webpush: {
                headers: {
                    Urgency: 'high',
                },
                notification: {
                    icon: '/icons/icon-192x192.png',
                    badge: '/icons/icon-72x72.png',
                    vibrate: [300, 100, 300],
                    requireInteraction: true,
                    tag: 'new-booking',
                },
                fcmOptions: {
                    link: `/admin/bookings?highlight=${bookingId}`,
                },
            },
        };

        try {
            const response = await messaging.sendEachForMulticast(message);
            console.log(`Sent new booking alert to ${response.successCount} admins`);
        } catch (error) {
            console.error('Error sending admin notification:', error);
        }

        return null;
    });

// ============================================
// CLOUD FUNCTION: Send Trip Reminder
// ============================================

export const sendTripReminders = functions.pubsub
    .schedule('every 30 minutes')
    .onRun(async () => {
        const now = new Date();
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
        const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

        // Find bookings starting in the next 30-60 minutes
        const bookingsSnapshot = await db.collection('bookings')
            .where('status', 'in', ['confirmed', 'driver_assigned'])
            .where('reminderSent', '!=', true)
            .get();

        const reminders: Promise<void>[] = [];

        bookingsSnapshot.forEach((doc) => {
            const booking = doc.data();

            // Parse pickup datetime
            const pickupDate = booking.pickupDate;
            const pickupTime = booking.pickupTime;

            if (!pickupDate || !pickupTime) return;

            let pickupDateTime: Date;
            if (pickupDate.toDate) {
                pickupDateTime = pickupDate.toDate();
            } else {
                pickupDateTime = new Date(`${pickupDate} ${pickupTime}`);
            }

            // Check if pickup is within 30-60 minutes
            if (pickupDateTime >= thirtyMinutesFromNow && pickupDateTime <= oneHourFromNow) {
                reminders.push(sendReminderForBooking(doc.id, booking));
            }
        });

        await Promise.all(reminders);
        console.log(`Processed ${reminders.length} trip reminders`);

        return null;
    });

async function sendReminderForBooking(bookingId: string, booking: any): Promise<void> {
    const userId = booking.userId;
    if (!userId) return;

    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData?.fcmTokens || userData.fcmTokens.length === 0) return;

    const message: admin.messaging.MulticastMessage = {
        tokens: userData.fcmTokens,
        notification: {
            title: 'เตรียมตัวให้พร้อม!',
            body: `อีกไม่นานคนขับจะมาถึงแล้ว กรุณาเตรียมตัวให้พร้อม`,
        },
        data: {
            bookingId: bookingId,
            type: 'reminder',
        },
        webpush: {
            notification: {
                icon: '/icons/icon-192x192.png',
                vibrate: [100, 50, 100],
                tag: `reminder-${bookingId}`,
            },
        },
    };

    try {
        await messaging.sendEachForMulticast(message);
        await db.collection('bookings').doc(bookingId).update({
            reminderSent: true,
        });
    } catch (error) {
        console.error(`Error sending reminder for booking ${bookingId}:`, error);
    }
}

// ============================================
// CLOUD FUNCTION: Cleanup Old Notifications
// ============================================

export const cleanupOldNotifications = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const batch = db.batch();
        let count = 0;

        // Cleanup user notifications
        const userNotificationsSnapshot = await db.collection('notifications')
            .where('createdAt', '<', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
            .limit(500)
            .get();

        userNotificationsSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
            count++;
        });

        // Cleanup admin notifications
        const adminNotificationsSnapshot = await db.collection('admin_notifications')
            .where('createdAt', '<', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
            .limit(500)
            .get();

        adminNotificationsSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
            count++;
        });

        if (count > 0) {
            await batch.commit();
            console.log(`Cleaned up ${count} old notifications`);
        }

        return null;
    });
