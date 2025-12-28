// ====================================
// TukTik Car Rental - Notification Service
// ====================================

import { db } from '../config';
import {
    collection,
    addDoc,
    Timestamp,
    getDocs,
    writeBatch,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    onSnapshot
} from 'firebase/firestore';
import { Notification, NotificationType } from '@/lib/types';
import { COLLECTIONS } from '@/lib/constants';

export const NotificationService = {
    async getUserNotifications(userId: string): Promise<Notification[]> {
        if (!db) return [];
        try {
            const q = query(
                collection(db!, COLLECTIONS.USERS, userId, 'notifications'),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[];
        } catch {
            return [];
        }
    },

    subscribeToUserNotifications(userId: string, callback: (notifications: Notification[]) => void): () => void {
        if (!db) {
            callback([]);
            return () => { };
        }

        const q = query(
            collection(db!, COLLECTIONS.USERS, userId, 'notifications'),
            orderBy('createdAt', 'desc')
        );

        return onSnapshot(q, (snapshot) => {
            const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[];
            callback(notifications);
        }, () => {
            callback([]);
        });
    },

    async addNotification(userId: string, notification: {
        type: NotificationType | 'booking' | 'payment' | 'promo' | 'system';
        title: string;
        message: string;
        data?: any;
    }): Promise<string> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            const docRef = await addDoc(collection(db!, COLLECTIONS.USERS, userId, 'notifications'), {
                ...notification,
                read: false,
                createdAt: Timestamp.now()
            });
            return docRef.id;
        } catch (error) {
            throw error;
        }
    },

    async markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
        if (!db) return;
        try {
            const notifRef = doc(db!, COLLECTIONS.USERS, userId, 'notifications', notificationId);
            await updateDoc(notifRef, { read: true });
        } catch { /* ignore */ }
    },

    async markAllNotificationsAsRead(userId: string): Promise<void> {
        if (!db) return;
        try {
            const q = query(
                collection(db!, COLLECTIONS.USERS, userId, 'notifications'),
                where('read', '==', false)
            );
            const snapshot = await getDocs(q);
            const batch = writeBatch(db!);
            snapshot.docs.forEach(docSnap => {
                batch.update(docSnap.ref, { read: true });
            });
            await batch.commit();
        } catch { /* ignore */ }
    },

    async deleteNotification(userId: string, notificationId: string): Promise<void> {
        if (!db) return;
        try {
            await deleteDoc(doc(db!, COLLECTIONS.USERS, userId, 'notifications', notificationId));
        } catch { /* ignore */ }
    },

    async clearAllNotifications(userId: string): Promise<void> {
        if (!db) return;
        try {
            const q = query(collection(db!, COLLECTIONS.USERS, userId, 'notifications'));
            const snapshot = await getDocs(q);
            const batch = writeBatch(db!);
            snapshot.docs.forEach(docSnap => {
                batch.delete(docSnap.ref);
            });
            await batch.commit();
        } catch { /* ignore */ }
    }
};
