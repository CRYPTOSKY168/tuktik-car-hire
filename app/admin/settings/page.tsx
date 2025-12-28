'use client';

import { useEffect, useState } from 'react';
import { FirestoreService } from '@/lib/firebase/firestore';

interface Settings {
    businessName: string;
    businessPhone: string;
    businessEmail: string;
    businessAddress: string;
    currency: string;
    timezone: string;
    workingHours: { start: string; end: string };
    autoConfirmBookings: boolean;
    requirePaymentUpfront: boolean;
    notifyAdminNewBooking: boolean;
    notifyCustomerStatusChange: boolean;
}

const DEFAULT_SETTINGS: Settings = {
    businessName: 'TukTik Transfer',
    businessPhone: '',
    businessEmail: '',
    businessAddress: '',
    currency: 'THB',
    timezone: 'Asia/Bangkok',
    workingHours: { start: '06:00', end: '22:00' },
    autoConfirmBookings: false,
    requirePaymentUpfront: true,
    notifyAdminNewBooking: true,
    notifyCustomerStatusChange: true,
};

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedMessage, setSavedMessage] = useState(false);
    const [activeTab, setActiveTab] = useState<'business' | 'booking' | 'notifications'>('business');

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const data = await FirestoreService.getSettings();
                if (data) {
                    setSettings({ ...DEFAULT_SETTINGS, ...data });
                }
            } catch (error) {
                console.error("Failed to load settings:", error);
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await FirestoreService.updateSettings(settings);
            setSavedMessage(true);
            setTimeout(() => setSavedMessage(false), 3000);
        } catch (error) {
            console.error("Failed to save settings:", error);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-blue-200 rounded-full"></div>
                        <div className="w-12 h-12 border-4 border-blue-600 rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
                    </div>
                    <p className="text-gray-500 font-medium">Loading settings...</p>
                </div>
            </div>
        );
    }

    const TABS = [
        { id: 'business', label: 'Business Info', icon: 'store' },
        { id: 'booking', label: 'Booking Settings', icon: 'book_online' },
        { id: 'notifications', label: 'Notifications', icon: 'notifications' },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your business settings and preferences</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-sm font-medium text-white hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50"
                >
                    {saving ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Saving...
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-lg">save</span>
                            Save Changes
                        </>
                    )}
                </button>
            </div>

            {/* Saved Message */}
            {savedMessage && (
                <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700">
                    <span className="material-symbols-outlined">check_circle</span>
                    <span className="text-sm font-medium">Settings saved successfully!</span>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Tabs - Sidebar on desktop, horizontal on mobile */}
                <div className="lg:w-64 flex-shrink-0">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="flex lg:flex-col">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex-1 lg:flex-none flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all ${
                                        activeTab === tab.id
                                            ? 'bg-blue-50 text-blue-600 border-b-2 lg:border-b-0 lg:border-l-4 border-blue-600'
                                            : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        {activeTab === 'business' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-800 mb-1">Business Information</h2>
                                    <p className="text-sm text-gray-500">Basic information about your business</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">store</span>
                                            <input
                                                type="text"
                                                value={settings.businessName}
                                                onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                placeholder="Your business name"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
                                            <div className="relative">
                                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">call</span>
                                                <input
                                                    type="tel"
                                                    value={settings.businessPhone}
                                                    onChange={(e) => setSettings({ ...settings, businessPhone: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                    placeholder="08X-XXX-XXXX"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                                            <div className="relative">
                                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">email</span>
                                                <input
                                                    type="email"
                                                    value={settings.businessEmail}
                                                    onChange={(e) => setSettings({ ...settings, businessEmail: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                    placeholder="contact@business.com"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Business Address</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3 top-3 text-gray-400">location_on</span>
                                            <textarea
                                                value={settings.businessAddress}
                                                onChange={(e) => setSettings({ ...settings, businessAddress: e.target.value })}
                                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                                                rows={3}
                                                placeholder="Your business address"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                                            <select
                                                value={settings.currency}
                                                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            >
                                                <option value="THB">THB - Thai Baht (฿)</option>
                                                <option value="USD">USD - US Dollar ($)</option>
                                                <option value="EUR">EUR - Euro (€)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                                            <select
                                                value={settings.timezone}
                                                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            >
                                                <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
                                                <option value="UTC">UTC (GMT+0)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'booking' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-800 mb-1">Booking Settings</h2>
                                    <p className="text-sm text-gray-500">Configure how bookings are handled</p>
                                </div>

                                <div className="space-y-4">
                                    {/* Working Hours */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-3">Working Hours</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Opening Time</label>
                                                <input
                                                    type="time"
                                                    value={settings.workingHours.start}
                                                    onChange={(e) => setSettings({
                                                        ...settings,
                                                        workingHours: { ...settings.workingHours, start: e.target.value }
                                                    })}
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Closing Time</label>
                                                <input
                                                    type="time"
                                                    value={settings.workingHours.end}
                                                    onChange={(e) => setSettings({
                                                        ...settings,
                                                        workingHours: { ...settings.workingHours, end: e.target.value }
                                                    })}
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Toggle Settings */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-blue-600">verified</span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800">Auto-confirm Bookings</p>
                                                    <p className="text-xs text-gray-500">Automatically confirm new bookings without admin approval</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setSettings({ ...settings, autoConfirmBookings: !settings.autoConfirmBookings })}
                                                className={`w-14 h-8 rounded-full transition-colors relative ${settings.autoConfirmBookings ? 'bg-blue-600' : 'bg-gray-300'}`}
                                            >
                                                <div className={`w-6 h-6 bg-white rounded-full shadow-sm absolute top-1 transition-all ${settings.autoConfirmBookings ? 'left-7' : 'left-1'}`}></div>
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-emerald-600">payments</span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800">Require Payment Upfront</p>
                                                    <p className="text-xs text-gray-500">Customers must pay before booking is confirmed</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setSettings({ ...settings, requirePaymentUpfront: !settings.requirePaymentUpfront })}
                                                className={`w-14 h-8 rounded-full transition-colors relative ${settings.requirePaymentUpfront ? 'bg-blue-600' : 'bg-gray-300'}`}
                                            >
                                                <div className={`w-6 h-6 bg-white rounded-full shadow-sm absolute top-1 transition-all ${settings.requirePaymentUpfront ? 'left-7' : 'left-1'}`}></div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-800 mb-1">Notification Settings</h2>
                                    <p className="text-sm text-gray-500">Configure when and how notifications are sent</p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                                <span className="material-symbols-outlined text-amber-600">admin_panel_settings</span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800">Notify Admin on New Booking</p>
                                                <p className="text-xs text-gray-500">Receive notification when a new booking is created</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSettings({ ...settings, notifyAdminNewBooking: !settings.notifyAdminNewBooking })}
                                            className={`w-14 h-8 rounded-full transition-colors relative ${settings.notifyAdminNewBooking ? 'bg-blue-600' : 'bg-gray-300'}`}
                                        >
                                            <div className={`w-6 h-6 bg-white rounded-full shadow-sm absolute top-1 transition-all ${settings.notifyAdminNewBooking ? 'left-7' : 'left-1'}`}></div>
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                                <span className="material-symbols-outlined text-purple-600">person</span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800">Notify Customer on Status Change</p>
                                                <p className="text-xs text-gray-500">Send notification to customers when booking status changes</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSettings({ ...settings, notifyCustomerStatusChange: !settings.notifyCustomerStatusChange })}
                                            className={`w-14 h-8 rounded-full transition-colors relative ${settings.notifyCustomerStatusChange ? 'bg-blue-600' : 'bg-gray-300'}`}
                                        >
                                            <div className={`w-6 h-6 bg-white rounded-full shadow-sm absolute top-1 transition-all ${settings.notifyCustomerStatusChange ? 'left-7' : 'left-1'}`}></div>
                                        </button>
                                    </div>
                                </div>

                                {/* Info Box */}
                                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                    <span className="material-symbols-outlined text-blue-600">info</span>
                                    <div>
                                        <p className="text-sm font-medium text-blue-800">About Notifications</p>
                                        <p className="text-xs text-blue-700 mt-1">
                                            Notifications are sent in-app. For email or SMS notifications, additional integration is required.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
