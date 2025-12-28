'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
    requestNotificationPermission,
    onForegroundMessage,
    registerServiceWorker,
    showLocalNotification,
    getNotificationContent,
    NotificationType,
} from '@/lib/firebase/messaging';
import { NotificationService, UserNotification } from '@/lib/firebase/notifications';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

interface NotificationContextType {
    // Permission state
    permissionGranted: boolean;
    permissionDenied: boolean;
    fcmToken: string | null;

    // Request permission
    requestPermission: () => Promise<boolean>;

    // Notification state
    notifications: UserNotification[];
    unreadCount: number;

    // Actions
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;

    // Show notification toast
    showNotification: (type: NotificationType, data?: any) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [fcmToken, setFcmToken] = useState<string | null>(null);
    const [notifications, setNotifications] = useState<UserNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Check permission status on mount
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            const permission = Notification.permission;
            setPermissionGranted(permission === 'granted');
            setPermissionDenied(permission === 'denied');
        }
    }, []);

    // Subscribe to notifications when user is logged in
    useEffect(() => {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        const unsubscribe = NotificationService.subscribeToNotifications(user.uid, (data) => {
            setNotifications(data);
            setUnreadCount(data.filter((n) => !n.read).length);
        });

        return () => unsubscribe();
    }, [user]);

    // Request notification permission
    const requestPermission = useCallback(async (): Promise<boolean> => {
        try {
            // Register service worker first
            await registerServiceWorker();

            // Request permission and get token
            const token = await requestNotificationPermission();

            if (token) {
                setFcmToken(token);
                setPermissionGranted(true);
                setPermissionDenied(false);

                // Save token to user's document in Firestore
                if (user && db) {
                    try {
                        await updateDoc(doc(db, 'users', user.uid), {
                            fcmTokens: arrayUnion(token),
                            notificationsEnabled: true,
                        });
                    } catch (e) {
                        console.warn('Failed to save FCM token:', e);
                    }
                }

                return true;
            } else {
                if (Notification.permission === 'denied') {
                    setPermissionDenied(true);
                }
                return false;
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    }, [user]);

    // Setup foreground message listener
    useEffect(() => {
        if (!permissionGranted) return;

        const unsubscribe = onForegroundMessage((payload) => {
            // Show local notification
            const title = payload.notification?.title || payload.data?.title || 'TukTik';
            const body = payload.notification?.body || payload.data?.body || '';

            showLocalNotification(title, {
                body,
                tag: payload.data?.tag || 'tuktik-foreground',
                data: payload.data,
            });
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [permissionGranted]);

    // Mark notification as read
    const markAsRead = useCallback(async (notificationId: string) => {
        await NotificationService.markAsRead(notificationId);
    }, []);

    // Mark all as read
    const markAllAsRead = useCallback(async () => {
        if (user) {
            await NotificationService.markAllAsRead(user.uid);
        }
    }, [user]);

    // Show notification (for manual triggers)
    const showNotification = useCallback((type: NotificationType, data?: any) => {
        const { title, body } = getNotificationContent(type, data);

        if (permissionGranted) {
            showLocalNotification(title, { body, data });
        }

        // Also add to Firestore if user is logged in
        if (user) {
            NotificationService.addNotification(user.uid, {
                type: 'status',
                title,
                message: body,
                data,
            });
        }
    }, [permissionGranted, user]);

    return (
        <NotificationContext.Provider
            value={{
                permissionGranted,
                permissionDenied,
                fcmToken,
                requestPermission,
                notifications,
                unreadCount,
                markAsRead,
                markAllAsRead,
                showNotification,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}
