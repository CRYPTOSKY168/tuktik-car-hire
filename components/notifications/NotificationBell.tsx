'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import {
    NotificationService,
    AdminNotificationService,
    UserNotification,
    AdminNotification,
} from '@/lib/firebase/notifications';
import Link from 'next/link';

interface NotificationBellProps {
    isAdmin?: boolean;
}

export default function NotificationBell({ isAdmin = false }: NotificationBellProps) {
    const { user } = useAuth();
    const { language } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<(UserNotification | AdminNotification)[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Subscribe to notifications
    useEffect(() => {
        if (!user) return;

        let unsubscribe: () => void;

        if (isAdmin) {
            unsubscribe = AdminNotificationService.subscribeToNotifications((data) => {
                setNotifications(data);
                setUnreadCount(data.filter((n) => !n.read).length);
            });
        } else {
            unsubscribe = NotificationService.subscribeToNotifications(user.uid, (data) => {
                setNotifications(data);
                setUnreadCount(data.filter((n) => !n.read).length);
            });
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user, isAdmin]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Handle notification click
    const handleNotificationClick = async (notification: UserNotification | AdminNotification) => {
        if (!notification.read) {
            if (isAdmin) {
                await AdminNotificationService.markAsRead(notification.id, user?.uid || '');
            } else {
                await NotificationService.markAsRead(notification.id);
            }
        }
    };

    // Mark all as read
    const handleMarkAllRead = async () => {
        if (isAdmin) {
            await AdminNotificationService.markAllAsRead();
        } else if (user) {
            await NotificationService.markAllAsRead(user.uid);
        }
    };

    // Get notification icon
    const getNotificationIcon = (type: string) => {
        const icons: Record<string, { icon: string; color: string }> = {
            booking: { icon: 'confirmation_number', color: 'text-blue-500' },
            payment: { icon: 'payments', color: 'text-green-500' },
            status: { icon: 'sync', color: 'text-purple-500' },
            driver: { icon: 'directions_car', color: 'text-indigo-500' },
            reminder: { icon: 'schedule', color: 'text-amber-500' },
            promo: { icon: 'local_offer', color: 'text-pink-500' },
            system: { icon: 'info', color: 'text-gray-500' },
            new_booking: { icon: 'add_circle', color: 'text-blue-500' },
            urgent: { icon: 'priority_high', color: 'text-red-500' },
            cancelled: { icon: 'cancel', color: 'text-red-500' },
        };
        return icons[type] || { icon: 'notifications', color: 'text-gray-500' };
    };

    // Format time ago
    const formatTimeAgo = (timestamp: any) => {
        if (!timestamp) return '';

        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diff < 60) return language === 'th' ? 'เมื่อกี้' : 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)} ${language === 'th' ? 'นาที' : 'min'}`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} ${language === 'th' ? 'ชม.' : 'hr'}`;
        return `${Math.floor(diff / 86400)} ${language === 'th' ? 'วัน' : 'd'}`;
    };

    // Get notification link
    const getNotificationLink = (notification: UserNotification | AdminNotification): string => {
        const data = 'data' in notification ? notification.data : { bookingId: (notification as AdminNotification).bookingId };

        if (isAdmin && data?.bookingId) {
            return `/admin/bookings?highlight=${data.bookingId}`;
        }
        if (data?.bookingId) {
            return `/confirmation?bookingId=${data.bookingId}`;
        }
        return isAdmin ? '/admin/bookings' : '/dashboard';
    };

    if (!user) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Notifications"
            >
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-300">
                    {unreadCount > 0 ? 'notifications_active' : 'notifications'}
                </span>

                {/* Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-white">notifications</span>
                            <h3 className="font-bold text-white">
                                {language === 'th' ? 'การแจ้งเตือน' : 'Notifications'}
                            </h3>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-xs text-white/80 hover:text-white font-medium"
                            >
                                {language === 'th' ? 'อ่านทั้งหมด' : 'Mark all read'}
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="py-12 text-center text-gray-400">
                                <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
                                <p className="text-sm">
                                    {language === 'th' ? 'ไม่มีการแจ้งเตือน' : 'No notifications'}
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {notifications.slice(0, 10).map((notification) => {
                                    const { icon, color } = getNotificationIcon(notification.type);
                                    const link = getNotificationLink(notification);

                                    return (
                                        <Link
                                            key={notification.id}
                                            href={link}
                                            onClick={() => {
                                                handleNotificationClick(notification);
                                                setIsOpen(false);
                                            }}
                                            className={`flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                                                !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''
                                            }`}
                                        >
                                            {/* Icon */}
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                                !notification.read ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-gray-100 dark:bg-gray-700'
                                            }`}>
                                                <span className={`material-symbols-outlined ${color}`}>
                                                    {icon}
                                                </span>
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-semibold truncate ${
                                                    !notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'
                                                }`}>
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                                                    {notification.message}
                                                </p>
                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                                                    {formatTimeAgo(notification.createdAt)}
                                                </p>
                                            </div>

                                            {/* Unread indicator */}
                                            {!notification.read && (
                                                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shrink-0 mt-1"></div>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 10 && (
                        <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                            <Link
                                href={isAdmin ? '/admin/notifications' : '/dashboard?tab=notifications'}
                                onClick={() => setIsOpen(false)}
                                className="block text-center text-sm text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                            >
                                {language === 'th' ? 'ดูทั้งหมด' : 'View all'}
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
