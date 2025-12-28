'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/lib/contexts/NotificationContext';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function NotificationPermissionPrompt() {
    const { language } = useLanguage();
    const { user } = useAuth();
    const { permissionGranted, permissionDenied, requestPermission } = useNotifications();
    const [showPrompt, setShowPrompt] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Only show prompt if user is logged in and hasn't granted/denied yet
        if (user && !permissionGranted && !permissionDenied) {
            // Check if user has dismissed before
            const dismissed = localStorage.getItem('notification-prompt-dismissed');
            if (!dismissed) {
                // Show after a delay
                const timer = setTimeout(() => {
                    setShowPrompt(true);
                }, 10000); // 10 seconds after login
                return () => clearTimeout(timer);
            }
        }
    }, [user, permissionGranted, permissionDenied]);

    const handleAllow = async () => {
        setLoading(true);
        await requestPermission();
        setLoading(false);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('notification-prompt-dismissed', 'true');
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header with Icon */}
                <div className="p-8 text-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-xl shadow-blue-500/30 mb-4">
                        <span className="material-symbols-outlined text-white text-4xl">notifications_active</span>
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 dark:text-white">
                        {language === 'th' ? 'รับการแจ้งเตือน' : 'Enable Notifications'}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        {language === 'th'
                            ? 'ไม่พลาดทุกการอัปเดตสำคัญ'
                            : "Don't miss important updates"}
                    </p>
                </div>

                {/* Benefits */}
                <div className="p-6 space-y-4">
                    {[
                        {
                            icon: 'directions_car',
                            title: language === 'th' ? 'คนขับกำลังมา' : 'Driver arrival',
                            desc: language === 'th' ? 'รู้ทันทีเมื่อคนขับออกเดินทางมารับ' : 'Know instantly when your driver is on the way',
                            color: 'text-blue-500',
                        },
                        {
                            icon: 'verified',
                            title: language === 'th' ? 'ยืนยันการจอง' : 'Booking confirmation',
                            desc: language === 'th' ? 'รับการแจ้งเมื่อมีการยืนยันงาน' : 'Get notified when booking is confirmed',
                            color: 'text-green-500',
                        },
                        {
                            icon: 'schedule',
                            title: language === 'th' ? 'เตือนล่วงหน้า' : 'Trip reminders',
                            desc: language === 'th' ? 'เตือนก่อนถึงเวลารับ' : 'Reminders before your pickup time',
                            color: 'text-amber-500',
                        },
                    ].map((item, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0`}>
                                <span className={`material-symbols-outlined ${item.color}`}>{item.icon}</span>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-800 dark:text-white">{item.title}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="p-6 pt-0 flex gap-3">
                    <button
                        onClick={handleDismiss}
                        className="flex-1 py-3 px-4 font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        {language === 'th' ? 'ไว้ก่อน' : 'Not now'}
                    </button>
                    <button
                        onClick={handleAllow}
                        disabled={loading}
                        className="flex-1 py-3 px-4 font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-lg">check</span>
                                {language === 'th' ? 'อนุญาต' : 'Allow'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
