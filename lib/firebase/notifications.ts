import { db } from './config';
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    updateDoc,
    doc,
    getDocs,
    Timestamp,
    writeBatch,
    limit,
    deleteDoc,
} from 'firebase/firestore';

const NOTIFICATIONS_COLLECTION = 'notifications';
const ADMIN_NOTIFICATIONS_COLLECTION = 'admin_notifications';

// User Notification interface (renamed to avoid conflict with browser Notification API)
export interface UserNotification {
    id: string;
    userId: string;
    type: 'booking' | 'payment' | 'status' | 'driver' | 'reminder' | 'promo' | 'system';
    title: string;
    message: string;
    data?: {
        bookingId?: string;
        status?: string;
        driverName?: string;
        driverPhone?: string;
        vehiclePlate?: string;
        amount?: number;
    };
    read: boolean;
    createdAt: Timestamp;
}

export interface AdminNotification {
    id: string;
    type: 'new_booking' | 'payment' | 'urgent' | 'cancelled' | 'system';
    title: string;
    message: string;
    bookingId?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    read: boolean;
    readBy?: string[];
    createdAt: Timestamp;
}

// ============================================
// CUSTOMER NOTIFICATIONS
// ============================================

export const NotificationService = {
    // Add notification for a user
    async addNotification(
        userId: string,
        notification: Omit<UserNotification, 'id' | 'userId' | 'read' | 'createdAt'>
    ): Promise<string | null> {
        if (!db) return null;

        try {
            const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
                userId,
                ...notification,
                read: false,
                createdAt: Timestamp.now(),
            });
            return docRef.id;
        } catch (error) {
            console.error('Error adding notification:', error);
            return null;
        }
    },

    // Subscribe to user's notifications (real-time)
    subscribeToNotifications(
        userId: string,
        callback: (notifications: UserNotification[]) => void
    ): () => void {
        if (!db) {
            callback([]);
            return () => {};
        }

        const q = query(
            collection(db, NOTIFICATIONS_COLLECTION),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        return onSnapshot(
            q,
            (snapshot) => {
                const notifications = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as UserNotification[];
                callback(notifications);
            },
            (error) => {
                console.error('Error subscribing to notifications:', error);
                callback([]);
            }
        );
    },

    // Get unread count
    async getUnreadCount(userId: string): Promise<number> {
        if (!db) return 0;

        try {
            const q = query(
                collection(db, NOTIFICATIONS_COLLECTION),
                where('userId', '==', userId),
                where('read', '==', false)
            );
            const snapshot = await getDocs(q);
            return snapshot.size;
        } catch (error) {
            console.error('Error getting unread count:', error);
            return 0;
        }
    },

    // Mark notification as read
    async markAsRead(notificationId: string): Promise<void> {
        if (!db) return;

        try {
            await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), {
                read: true,
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    },

    // Mark all as read
    async markAllAsRead(userId: string): Promise<void> {
        if (!db) {
            console.error('markAllAsRead: db is not initialized');
            throw new Error('Database not initialized');
        }

        try {
            console.log('markAllAsRead: Starting for userId:', userId);

            const q = query(
                collection(db, NOTIFICATIONS_COLLECTION),
                where('userId', '==', userId),
                where('read', '==', false)
            );
            const snapshot = await getDocs(q);

            console.log('markAllAsRead: Found', snapshot.docs.length, 'unread notifications');

            if (snapshot.empty) {
                console.log('markAllAsRead: No unread notifications to update');
                return;
            }

            const batch = writeBatch(db);
            snapshot.docs.forEach((docSnap) => {
                console.log('markAllAsRead: Updating doc:', docSnap.id);
                batch.update(docSnap.ref, { read: true });
            });
            await batch.commit();

            console.log('markAllAsRead: Successfully marked all as read');
        } catch (error: any) {
            console.error('Error marking all as read:', error);
            console.error('Error code:', error?.code);
            console.error('Error message:', error?.message);
            throw error; // Re-throw so caller can handle it
        }
    },

    // Delete notification
    async deleteNotification(notificationId: string): Promise<void> {
        if (!db) return;

        try {
            await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId));
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    },

    // Clear all notifications for user
    async clearAll(userId: string): Promise<void> {
        if (!db) return;

        try {
            const q = query(
                collection(db, NOTIFICATIONS_COLLECTION),
                where('userId', '==', userId)
            );
            const snapshot = await getDocs(q);

            const batch = writeBatch(db);
            snapshot.docs.forEach((docSnap) => {
                batch.delete(docSnap.ref);
            });
            await batch.commit();
        } catch (error) {
            console.error('Error clearing notifications:', error);
        }
    },
};

// ============================================
// ADMIN NOTIFICATIONS
// ============================================

export const AdminNotificationService = {
    // Add admin notification
    async addNotification(
        notification: Omit<AdminNotification, 'id' | 'read' | 'readBy' | 'createdAt'>
    ): Promise<string | null> {
        if (!db) return null;

        try {
            const docRef = await addDoc(collection(db, ADMIN_NOTIFICATIONS_COLLECTION), {
                ...notification,
                read: false,
                readBy: [],
                createdAt: Timestamp.now(),
            });
            return docRef.id;
        } catch (error) {
            console.error('Error adding admin notification:', error);
            return null;
        }
    },

    // Subscribe to admin notifications (real-time)
    subscribeToNotifications(
        callback: (notifications: AdminNotification[]) => void
    ): () => void {
        if (!db) {
            callback([]);
            return () => {};
        }

        const q = query(
            collection(db, ADMIN_NOTIFICATIONS_COLLECTION),
            orderBy('createdAt', 'desc'),
            limit(100)
        );

        return onSnapshot(
            q,
            (snapshot) => {
                const notifications = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as AdminNotification[];
                callback(notifications);
            },
            (error) => {
                console.error('Error subscribing to admin notifications:', error);
                callback([]);
            }
        );
    },

    // Get unread count for admin
    async getUnreadCount(): Promise<number> {
        if (!db) return 0;

        try {
            const q = query(
                collection(db, ADMIN_NOTIFICATIONS_COLLECTION),
                where('read', '==', false)
            );
            const snapshot = await getDocs(q);
            return snapshot.size;
        } catch (error) {
            console.error('Error getting admin unread count:', error);
            return 0;
        }
    },

    // Mark as read
    async markAsRead(notificationId: string, adminId: string): Promise<void> {
        if (!db) return;

        try {
            const docRef = doc(db, ADMIN_NOTIFICATIONS_COLLECTION, notificationId);
            await updateDoc(docRef, {
                read: true,
                [`readBy`]: [adminId], // Add admin to readBy array
            });
        } catch (error) {
            console.error('Error marking admin notification as read:', error);
        }
    },

    // Mark all as read
    async markAllAsRead(): Promise<void> {
        if (!db) {
            console.error('AdminNotificationService.markAllAsRead: db is not initialized');
            throw new Error('Database not initialized');
        }

        try {
            console.log('AdminNotificationService.markAllAsRead: Starting');

            const q = query(
                collection(db, ADMIN_NOTIFICATIONS_COLLECTION),
                where('read', '==', false)
            );
            const snapshot = await getDocs(q);

            console.log('AdminNotificationService.markAllAsRead: Found', snapshot.docs.length, 'unread notifications');

            if (snapshot.empty) {
                console.log('AdminNotificationService.markAllAsRead: No unread notifications to update');
                return;
            }

            const batch = writeBatch(db);
            snapshot.docs.forEach((docSnap) => {
                batch.update(docSnap.ref, { read: true });
            });
            await batch.commit();

            console.log('AdminNotificationService.markAllAsRead: Successfully marked all as read');
        } catch (error: any) {
            console.error('Error marking all admin notifications as read:', error);
            console.error('Error code:', error?.code);
            console.error('Error message:', error?.message);
            throw error; // Re-throw so caller can handle it
        }
    },

    // Delete old notifications (cleanup)
    async cleanupOld(daysOld: number = 30): Promise<void> {
        if (!db) return;

        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const q = query(
                collection(db, ADMIN_NOTIFICATIONS_COLLECTION),
                where('createdAt', '<', Timestamp.fromDate(cutoffDate))
            );
            const snapshot = await getDocs(q);

            const batch = writeBatch(db);
            snapshot.docs.forEach((docSnap) => {
                batch.delete(docSnap.ref);
            });
            await batch.commit();
        } catch (error) {
            console.error('Error cleaning up old notifications:', error);
        }
    },
};

// ============================================
// HELPER: Create notifications on status change
// ============================================

export const createStatusChangeNotification = async (
    userId: string,
    bookingId: string,
    newStatus: string,
    driverInfo?: { name: string; phone: string; vehiclePlate?: string }
): Promise<void> => {
    const statusMessages: Record<string, { title: string; message: string; type: UserNotification['type'] }> = {
        confirmed: {
            title: 'ยืนยันการจองแล้ว!',
            message: `การจอง #${bookingId.slice(-6).toUpperCase()} ได้รับการยืนยันแล้ว`,
            type: 'status',
        },
        driver_assigned: {
            title: 'มอบหมายคนขับแล้ว',
            message: `คนขับ ${driverInfo?.name || ''} จะมารับคุณ ทะเบียน ${driverInfo?.vehiclePlate || ''}`,
            type: 'driver',
        },
        driver_en_route: {
            title: 'คนขับกำลังมารับคุณ! 🚗',
            message: `${driverInfo?.name || 'คนขับ'} กำลังเดินทางมาแล้ว`,
            type: 'driver',
        },
        in_progress: {
            title: 'เริ่มเดินทางแล้ว',
            message: 'ขอให้เดินทางปลอดภัย!',
            type: 'status',
        },
        completed: {
            title: 'เดินทางเสร็จสิ้น ✅',
            message: 'ขอบคุณที่ใช้บริการ TukTik!',
            type: 'status',
        },
        cancelled: {
            title: 'ยกเลิกการจอง',
            message: `การจอง #${bookingId.slice(-6).toUpperCase()} ถูกยกเลิกแล้ว`,
            type: 'status',
        },
    };

    const notification = statusMessages[newStatus];
    if (notification) {
        // Build data object without undefined values (Firestore doesn't accept undefined)
        const data: Record<string, string> = {
            bookingId,
            status: newStatus,
        };
        if (driverInfo?.name) data.driverName = driverInfo.name;
        if (driverInfo?.phone) data.driverPhone = driverInfo.phone;
        if (driverInfo?.vehiclePlate) data.vehiclePlate = driverInfo.vehiclePlate;

        await NotificationService.addNotification(userId, {
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data,
        });
    }
};

// Create admin notification for new booking
export const createNewBookingAdminNotification = async (
    bookingId: string,
    customerName: string,
    amount: number,
    route: string
): Promise<void> => {
    await AdminNotificationService.addNotification({
        type: 'new_booking',
        title: 'งานจองใหม่!',
        message: `${customerName} จอง ${route} - ฿${amount.toLocaleString()}`,
        bookingId,
        priority: 'high',
    });
};
