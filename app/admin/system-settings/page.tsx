'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { ConfigService } from '@/lib/firebase/services';
import { SystemConfig, DEFAULT_SYSTEM_CONFIG } from '@/lib/types';

type TabType = 'booking' | 'pricing' | 'payment' | 'rating' | 'rateLimit' | 'driver' | 'map' | 'passenger';

export default function AdminSystemSettingsPage() {
    const router = useRouter();
    const { user, isAdmin, loading: authLoading } = useAuth();

    const [config, setConfig] = useState<SystemConfig>(DEFAULT_SYSTEM_CONFIG);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedMessage, setSavedMessage] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('booking');

    // Admin check
    useEffect(() => {
        if (!authLoading && (!user || !isAdmin)) {
            router.replace('/admin');
        }
    }, [user, isAdmin, authLoading, router]);

    // Load config
    useEffect(() => {
        const loadConfig = async () => {
            try {
                const data = await ConfigService.getConfig();
                setConfig(data);
            } catch (error) {
                console.error('Failed to load config:', error);
            } finally {
                setLoading(false);
            }
        };
        loadConfig();
    }, []);

    const handleSave = async () => {
        if (!user?.email) return;

        setSaving(true);
        try {
            await ConfigService.updateConfig(config, user.email);
            setSavedMessage(true);
            setTimeout(() => setSavedMessage(false), 3000);
        } catch (error) {
            console.error('Failed to save config:', error);
            alert('ไม่สามารถบันทึกได้ กรุณาลองใหม่');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!user?.email) return;
        if (!confirm('คุณต้องการรีเซ็ตเป็นค่าเริ่มต้นหรือไม่?')) return;

        setSaving(true);
        try {
            await ConfigService.resetToDefaults(user.email);
            setConfig(DEFAULT_SYSTEM_CONFIG);
            setSavedMessage(true);
            setTimeout(() => setSavedMessage(false), 3000);
        } catch (error) {
            console.error('Failed to reset config:', error);
            alert('ไม่สามารถรีเซ็ตได้ กรุณาลองใหม่');
        } finally {
            setSaving(false);
        }
    };

    // Status checkbox handler
    const handleStatusChange = (status: string) => {
        const currentStatuses = config.booking.cancellableStatuses;
        const newStatuses = currentStatuses.includes(status)
            ? currentStatuses.filter(s => s !== status)
            : [...currentStatuses, status];
        setConfig({
            ...config,
            booking: { ...config.booking, cancellableStatuses: newStatuses }
        });
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-blue-200 rounded-full"></div>
                        <div className="w-12 h-12 border-4 border-blue-600 rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
                    </div>
                    <p className="text-gray-500 font-medium">กำลังโหลด...</p>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return null;
    }

    const TABS = [
        { id: 'booking', label: 'การจอง', icon: 'book_online' },
        { id: 'pricing', label: 'ราคา', icon: 'payments' },
        { id: 'payment', label: 'ชำระเงิน', icon: 'credit_card' },
        { id: 'rating', label: 'คะแนน', icon: 'star' },
        { id: 'rateLimit', label: 'Rate Limit', icon: 'speed' },
        { id: 'driver', label: 'คนขับ', icon: 'badge' },
        { id: 'map', label: 'แผนที่', icon: 'map' },
        { id: 'passenger', label: 'ผู้โดยสาร', icon: 'person' },
    ];

    const CANCELLABLE_STATUSES = [
        { value: 'pending', label: 'รอยืนยัน (Pending)' },
        { value: 'confirmed', label: 'ยืนยันแล้ว (Confirmed)' },
        { value: 'driver_assigned', label: 'มอบหมายคนขับแล้ว (Driver Assigned)' },
    ];

    // Toggle switch component
    const ToggleSwitch = ({ checked, onChange, label, description, icon, iconBg }: {
        checked: boolean;
        onChange: (checked: boolean) => void;
        label: string;
        description: string;
        icon: string;
        iconBg: string;
    }) => (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${iconBg} rounded-lg flex items-center justify-center`}>
                    <span className="material-symbols-outlined text-2xl">{icon}</span>
                </div>
                <div>
                    <h4 className="font-medium text-gray-800">{label}</h4>
                    <p className="text-sm text-gray-500">{description}</p>
                </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
        </div>
    );

    // Number input component
    const NumberInput = ({ label, value, onChange, min, max, unit, helpText, prefix }: {
        label: string;
        value: number;
        onChange: (value: number) => void;
        min?: number;
        max?: number;
        unit?: string;
        helpText?: string;
        prefix?: string;
    }) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <div className="relative">
                {prefix && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">{prefix}</span>}
                <input
                    type="number"
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                    className={`w-full ${prefix ? 'pl-10' : 'px-4'} py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
                {unit && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{unit}</span>}
            </div>
            {helpText && <p className="text-xs text-gray-400 mt-1">{helpText}</p>}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">ตั้งค่าระบบ</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        ตั้งค่ากฎและ configuration ของระบบ
                        {config.updatedAt && (
                            <span className="ml-2 text-xs text-gray-400">
                                (อัปเดตล่าสุดโดย {config.updatedBy})
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleReset}
                        disabled={saving}
                        className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                        รีเซ็ต
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                กำลังบันทึก...
                            </>
                        ) : savedMessage ? (
                            <>
                                <span className="material-symbols-outlined text-[18px]">check</span>
                                บันทึกแล้ว!
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[18px]">save</span>
                                บันทึกการตั้งค่า
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Tabs - Scrollable on mobile */}
            <div className="overflow-x-auto">
                <div className="flex gap-1 bg-white p-1.5 rounded-xl shadow-sm border border-gray-100 min-w-max">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                {/* Booking Tab */}
                {activeTab === 'booking' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-600">sync</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">Re-matching Configuration</h2>
                                <p className="text-sm text-gray-500">ตั้งค่าการหาคนขับใหม่เมื่อถูกปฏิเสธ</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <NumberInput
                                label="จำนวนครั้งสูงสุดในการหาคนขับใหม่"
                                value={config.booking.maxRematchAttempts}
                                onChange={(v) => setConfig({ ...config, booking: { ...config.booking, maxRematchAttempts: v } })}
                                min={1} max={10} unit="ครั้ง"
                                helpText="ถ้าคนขับปฏิเสธ ระบบจะหาคนขับใหม่กี่ครั้ง"
                            />
                            <NumberInput
                                label="เวลารอคนขับกดรับงาน"
                                value={config.booking.driverResponseTimeout / 1000}
                                onChange={(v) => setConfig({ ...config, booking: { ...config.booking, driverResponseTimeout: v * 1000 } })}
                                min={10} max={120} unit="วินาที"
                                helpText="ถ้าคนขับไม่ตอบภายในเวลานี้ จะถือว่าปฏิเสธ"
                            />
                            <NumberInput
                                label="เวลารวมในการหาคนขับ"
                                value={config.booking.totalSearchTimeout / 1000}
                                onChange={(v) => setConfig({ ...config, booking: { ...config.booking, totalSearchTimeout: v * 1000 } })}
                                min={60} max={600} unit="วินาที"
                                helpText="เวลารวมสูงสุดในการค้นหาคนขับทั้งหมด"
                            />
                            <NumberInput
                                label="เวลารอก่อนหาคนขับใหม่"
                                value={config.booking.delayBetweenMatches / 1000}
                                onChange={(v) => setConfig({ ...config, booking: { ...config.booking, delayBetweenMatches: v * 1000 } })}
                                min={1} max={30} unit="วินาที"
                                helpText="รอกี่วินาทีก่อนหาคนขับคนถัดไป"
                            />
                        </div>

                        {/* Cancellable Statuses */}
                        <div className="pt-6 border-t border-gray-100">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                    <span className="material-symbols-outlined text-red-600">cancel</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800">สถานะที่ยกเลิกได้</h3>
                                    <p className="text-sm text-gray-500">เลือกสถานะที่ลูกค้าสามารถยกเลิกการจองได้</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {CANCELLABLE_STATUSES.map((status) => (
                                    <label
                                        key={status.value}
                                        className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                            config.booking.cancellableStatuses.includes(status.value)
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={config.booking.cancellableStatuses.includes(status.value)}
                                            onChange={() => handleStatusChange(status.value)}
                                            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">{status.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Pricing Tab */}
                {activeTab === 'pricing' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-green-600">payments</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">Pricing Configuration</h2>
                                <p className="text-sm text-gray-500">ตั้งค่าราคาและค่าบริการ</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <NumberInput
                                label="ค่าโดยสารขั้นต่ำ (Base Fare)"
                                value={config.pricing.baseFare}
                                onChange={(v) => setConfig({ ...config, pricing: { ...config.pricing, baseFare: v } })}
                                min={0} max={1000} prefix="฿"
                                helpText="ค่าโดยสารเริ่มต้นต่อเที่ยว"
                            />
                            <NumberInput
                                label="ราคาต่อกิโลเมตร"
                                value={config.pricing.perKmRate}
                                onChange={(v) => setConfig({ ...config, pricing: { ...config.pricing, perKmRate: v } })}
                                min={0} max={100} prefix="฿" unit="/กม."
                                helpText="ค่าโดยสารเพิ่มเติมต่อกิโลเมตร"
                            />
                            <NumberInput
                                label="ค่า Platform Fee"
                                value={config.pricing.platformFeePercent}
                                onChange={(v) => setConfig({ ...config, pricing: { ...config.pricing, platformFeePercent: v } })}
                                min={0} max={50} unit="%"
                                helpText="เปอร์เซ็นต์ค่าบริการที่หักจากคนขับ"
                            />
                            <NumberInput
                                label="ยอดจองขั้นต่ำ"
                                value={config.pricing.minBookingAmount}
                                onChange={(v) => setConfig({ ...config, pricing: { ...config.pricing, minBookingAmount: v } })}
                                min={0} max={10000} prefix="฿"
                                helpText="ยอดจองขั้นต่ำที่รับ (0 = ไม่จำกัด)"
                            />
                        </div>

                        {/* Price Preview */}
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">ตัวอย่างการคำนวณราคา</h4>
                            <div className="flex flex-wrap gap-4">
                                {[5, 10, 20, 50].map((km) => (
                                    <div key={km} className="bg-white px-4 py-2 rounded-lg border border-gray-200">
                                        <span className="text-sm text-gray-500">{km} กม.</span>
                                        <span className="ml-2 font-semibold text-gray-800">
                                            ฿{(config.pricing.baseFare + config.pricing.perKmRate * km).toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Payment Tab */}
                {activeTab === 'payment' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-purple-600">credit_card</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">Payment Configuration</h2>
                                <p className="text-sm text-gray-500">ตั้งค่าวิธีการชำระเงิน</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <ToggleSwitch
                                checked={config.payment.enableCash}
                                onChange={(v) => setConfig({ ...config, payment: { ...config.payment, enableCash: v } })}
                                label="ชำระเงินสด"
                                description="ลูกค้าจ่ายเงินสดกับคนขับ"
                                icon="payments"
                                iconBg="bg-green-100 text-green-600"
                            />
                            <ToggleSwitch
                                checked={config.payment.enableCard}
                                onChange={(v) => setConfig({ ...config, payment: { ...config.payment, enableCard: v } })}
                                label="ชำระผ่านบัตร (Stripe)"
                                description="ลูกค้าจ่ายผ่านบัตรเครดิต/เดบิต"
                                icon="credit_card"
                                iconBg="bg-blue-100 text-blue-600"
                            />
                            <ToggleSwitch
                                checked={config.payment.autoRefundOnCancel}
                                onChange={(v) => setConfig({ ...config, payment: { ...config.payment, autoRefundOnCancel: v } })}
                                label="คืนเงินอัตโนมัติ"
                                description="คืนเงินอัตโนมัติเมื่อยกเลิก (เฉพาะจ่ายบัตร)"
                                icon="currency_exchange"
                                iconBg="bg-yellow-100 text-yellow-600"
                            />
                        </div>

                        {!config.payment.enableCash && !config.payment.enableCard && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                                <span className="material-symbols-outlined text-red-600">warning</span>
                                <p className="text-sm text-red-600">
                                    คุณปิดวิธีชำระเงินทั้งหมด ลูกค้าจะไม่สามารถจองได้!
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Rating Tab */}
                {activeTab === 'rating' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-yellow-600">star</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">Rating Configuration</h2>
                                <p className="text-sm text-gray-500">ตั้งค่าระบบให้คะแนนและทิป</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <NumberInput
                                label="ทิปสูงสุดต่อเที่ยว"
                                value={config.rating.maxTipAmount}
                                onChange={(v) => setConfig({ ...config, rating: { ...config.rating, maxTipAmount: v } })}
                                min={0} max={100000} prefix="฿"
                                helpText="จำนวนเงินทิปสูงสุดที่ลูกค้าสามารถให้ได้"
                            />
                            <NumberInput
                                label="ความยาว Comment สูงสุด"
                                value={config.rating.maxCommentLength}
                                onChange={(v) => setConfig({ ...config, rating: { ...config.rating, maxCommentLength: v } })}
                                min={50} max={2000} unit="ตัวอักษร"
                                helpText="จำนวนตัวอักษรสูงสุดในความคิดเห็น"
                            />
                            <NumberInput
                                label="Bayesian Prior Mean"
                                value={config.rating.bayesianPriorMean}
                                onChange={(v) => setConfig({ ...config, rating: { ...config.rating, bayesianPriorMean: v } })}
                                min={1} max={5} unit="ดาว"
                                helpText="ค่าเริ่มต้น rating สำหรับคนขับใหม่ (Bayesian Average)"
                            />
                            <NumberInput
                                label="Bayesian Min Reviews"
                                value={config.rating.bayesianMinReviews}
                                onChange={(v) => setConfig({ ...config, rating: { ...config.rating, bayesianMinReviews: v } })}
                                min={1} max={50} unit="รีวิว"
                                helpText="จำนวน review ขั้นต่ำก่อนแสดง rating จริง"
                            />
                            <NumberInput
                                label="Low Rating Threshold"
                                value={config.rating.lowRatingThreshold}
                                onChange={(v) => setConfig({ ...config, rating: { ...config.rating, lowRatingThreshold: v } })}
                                min={1} max={5} unit="ดาว"
                                helpText="ถ้าให้คะแนนต่ำกว่านี้ ต้องระบุเหตุผล"
                            />
                        </div>
                    </div>
                )}

                {/* Rate Limit Tab */}
                {activeTab === 'rateLimit' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-orange-600">speed</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">Rate Limiting Configuration</h2>
                                <p className="text-sm text-gray-500">ตั้งค่าจำกัดจำนวน requests ต่อนาที (ป้องกัน brute force)</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <NumberInput
                                label="Standard API Limit"
                                value={config.rateLimit.standardApiLimit}
                                onChange={(v) => setConfig({ ...config, rateLimit: { ...config.rateLimit, standardApiLimit: v } })}
                                min={5} max={100} unit="req/min"
                                helpText="จำนวน requests สูงสุดสำหรับ API ทั่วไป"
                            />
                            <NumberInput
                                label="Auth API Limit"
                                value={config.rateLimit.authApiLimit}
                                onChange={(v) => setConfig({ ...config, rateLimit: { ...config.rateLimit, authApiLimit: v } })}
                                min={3} max={20} unit="req/min"
                                helpText="จำนวน requests สูงสุดสำหรับ login (เข้มงวดกว่า)"
                            />
                            <NumberInput
                                label="Payment API Limit"
                                value={config.rateLimit.paymentApiLimit}
                                onChange={(v) => setConfig({ ...config, rateLimit: { ...config.rateLimit, paymentApiLimit: v } })}
                                min={5} max={50} unit="req/min"
                                helpText="จำนวน requests สูงสุดสำหรับ payment"
                            />
                            <NumberInput
                                label="Driver Location API Limit"
                                value={config.rateLimit.driverLocationApiLimit}
                                onChange={(v) => setConfig({ ...config, rateLimit: { ...config.rateLimit, driverLocationApiLimit: v } })}
                                min={30} max={120} unit="req/min"
                                helpText="จำนวน requests สูงสุดสำหรับ GPS updates (ต้องสูงกว่าปกติ)"
                            />
                            <NumberInput
                                label="Sensitive API Limit"
                                value={config.rateLimit.sensitiveApiLimit}
                                onChange={(v) => setConfig({ ...config, rateLimit: { ...config.rateLimit, sensitiveApiLimit: v } })}
                                min={1} max={10} unit="req/min"
                                helpText="จำนวน requests สูงสุดสำหรับ sensitive operations"
                            />
                        </div>
                    </div>
                )}

                {/* Driver Tab */}
                {activeTab === 'driver' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-indigo-600">badge</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">Driver Rules</h2>
                                <p className="text-sm text-gray-500">ตั้งค่ากฎสำหรับคนขับ</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <ToggleSwitch
                                checked={config.driver.allowSelfBooking}
                                onChange={(v) => setConfig({ ...config, driver: { ...config.driver, allowSelfBooking: v } })}
                                label="อนุญาตให้คนขับจองตัวเอง"
                                description="คนขับสามารถสร้าง booking ให้ตัวเองได้"
                                icon="person"
                                iconBg="bg-red-100 text-red-600"
                            />
                            <ToggleSwitch
                                checked={config.driver.allowMultipleJobs}
                                onChange={(v) => setConfig({ ...config, driver: { ...config.driver, allowMultipleJobs: v } })}
                                label="อนุญาตให้รับหลายงานพร้อมกัน"
                                description="คนขับสามารถรับงานใหม่ขณะมีงานอยู่"
                                icon="content_copy"
                                iconBg="bg-orange-100 text-orange-600"
                            />
                        </div>

                        <div className="pt-6 border-t border-gray-100">
                            <NumberInput
                                label="Auto Resume Delay"
                                value={config.driver.autoResumeDelayMs / 1000}
                                onChange={(v) => setConfig({ ...config, driver: { ...config.driver, autoResumeDelayMs: v * 1000 } })}
                                min={0} max={60} unit="วินาที"
                                helpText="เวลารอก่อน resume status หลังเสร็จงาน"
                            />
                        </div>
                    </div>
                )}

                {/* Map Tab */}
                {activeTab === 'map' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-teal-600">map</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">Map Configuration</h2>
                                <p className="text-sm text-gray-500">ตั้งค่าแผนที่และ GPS</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <NumberInput
                                label="Default Center Latitude"
                                value={config.map.defaultCenterLat}
                                onChange={(v) => setConfig({ ...config, map: { ...config.map, defaultCenterLat: v } })}
                                min={-90} max={90}
                                helpText="ละติจูดศูนย์กลางแผนที่ (กทม. = 13.7563)"
                            />
                            <NumberInput
                                label="Default Center Longitude"
                                value={config.map.defaultCenterLng}
                                onChange={(v) => setConfig({ ...config, map: { ...config.map, defaultCenterLng: v } })}
                                min={-180} max={180}
                                helpText="ลองจิจูดศูนย์กลางแผนที่ (กทม. = 100.5018)"
                            />
                            <NumberInput
                                label="Default Zoom Level"
                                value={config.map.defaultZoom}
                                onChange={(v) => setConfig({ ...config, map: { ...config.map, defaultZoom: v } })}
                                min={1} max={20}
                                helpText="ระดับ zoom เริ่มต้น (1-20)"
                            />
                            <NumberInput
                                label="GPS Timeout"
                                value={config.map.gpsTimeoutMs / 1000}
                                onChange={(v) => setConfig({ ...config, map: { ...config.map, gpsTimeoutMs: v * 1000 } })}
                                min={5} max={60} unit="วินาที"
                                helpText="เวลารอ GPS response"
                            />
                        </div>

                        {/* Map Preview */}
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">ศูนย์กลางปัจจุบัน</h4>
                            <p className="text-sm text-gray-500">
                                Lat: {config.map.defaultCenterLat}, Lng: {config.map.defaultCenterLng} (Zoom: {config.map.defaultZoom})
                            </p>
                        </div>
                    </div>
                )}

                {/* Passenger Tab */}
                {activeTab === 'passenger' && (
                    <div className="space-y-6">
                        {/* Cancellation Rules Section */}
                        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-red-600">cancel</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">Cancellation Rules</h2>
                                <p className="text-sm text-gray-500">ตั้งค่ากฎการยกเลิกการจอง</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <ToggleSwitch
                                checked={config.passenger.enableCancellationFee}
                                onChange={(v) => setConfig({ ...config, passenger: { ...config.passenger, enableCancellationFee: v } })}
                                label="เก็บค่าธรรมเนียมยกเลิก"
                                description="เก็บค่าธรรมเนียมเมื่อลูกค้ายกเลิกหลังหมดเวลา"
                                icon="payments"
                                iconBg="bg-red-100 text-red-600"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <NumberInput
                                label="ระยะเวลายกเลิกฟรี"
                                value={config.passenger.freeCancellationWindowMs / 60000}
                                onChange={(v) => setConfig({ ...config, passenger: { ...config.passenger, freeCancellationWindowMs: v * 60000 } })}
                                min={1} max={30} unit="นาที"
                                helpText="ยกเลิกฟรีภายในกี่นาทีหลังได้คนขับ"
                            />
                            <NumberInput
                                label="ค่าธรรมเนียมยกเลิก"
                                value={config.passenger.lateCancellationFee}
                                onChange={(v) => setConfig({ ...config, passenger: { ...config.passenger, lateCancellationFee: v } })}
                                min={0} max={500} prefix="฿"
                                helpText="ค่าธรรมเนียมเมื่อยกเลิกหลังหมดเวลา"
                            />
                        </div>

                        {/* No-Show Rules Section */}
                        <div className="flex items-center gap-3 pb-4 pt-6 border-t border-b border-gray-100">
                            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-orange-600">person_off</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">No-Show Rules</h2>
                                <p className="text-sm text-gray-500">ตั้งค่าเมื่อลูกค้าไม่มารับรถ</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <ToggleSwitch
                                checked={config.passenger.enableNoShowFee}
                                onChange={(v) => setConfig({ ...config, passenger: { ...config.passenger, enableNoShowFee: v } })}
                                label="เก็บค่าธรรมเนียม No-Show"
                                description="เก็บค่าธรรมเนียมเมื่อลูกค้าไม่มารับรถ"
                                icon="person_off"
                                iconBg="bg-orange-100 text-orange-600"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <NumberInput
                                label="เวลารอลูกค้า"
                                value={config.passenger.noShowWaitTimeMs / 60000}
                                onChange={(v) => setConfig({ ...config, passenger: { ...config.passenger, noShowWaitTimeMs: v * 60000 } })}
                                min={1} max={30} unit="นาที"
                                helpText="คนขับรอลูกค้ากี่นาทีก่อนแจ้ง no-show"
                            />
                            <NumberInput
                                label="ค่าธรรมเนียม No-Show"
                                value={config.passenger.noShowFee}
                                onChange={(v) => setConfig({ ...config, passenger: { ...config.passenger, noShowFee: v } })}
                                min={0} max={500} prefix="฿"
                                helpText="ค่าธรรมเนียมเมื่อลูกค้าไม่มา"
                            />
                        </div>

                        {/* Fee Distribution Section */}
                        <div className="flex items-center gap-3 pb-4 pt-6 border-t border-b border-gray-100">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-green-600">account_balance_wallet</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">Fee Distribution</h2>
                                <p className="text-sm text-gray-500">ตั้งค่าการแบ่งค่าธรรมเนียมให้คนขับ</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <NumberInput
                                label="% ค่ายกเลิกให้คนขับ"
                                value={config.passenger.cancellationFeeToDriverPercent}
                                onChange={(v) => setConfig({ ...config, passenger: { ...config.passenger, cancellationFeeToDriverPercent: v } })}
                                min={0} max={100} unit="%"
                                helpText="เปอร์เซ็นต์ค่ายกเลิกที่คนขับได้รับ"
                            />
                            <NumberInput
                                label="% ค่า No-Show ให้คนขับ"
                                value={config.passenger.noShowFeeToDriverPercent}
                                onChange={(v) => setConfig({ ...config, passenger: { ...config.passenger, noShowFeeToDriverPercent: v } })}
                                min={0} max={100} unit="%"
                                helpText="เปอร์เซ็นต์ค่า no-show ที่คนขับได้รับ"
                            />
                        </div>

                        {/* Driver Late Waiver Section */}
                        <div className="flex items-center gap-3 pb-4 pt-6 border-t border-b border-gray-100">
                            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-yellow-600">schedule</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">Driver Late Waiver</h2>
                                <p className="text-sm text-gray-500">ยกเว้นค่าธรรมเนียมเมื่อคนขับมาช้า</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <ToggleSwitch
                                checked={config.passenger.enableDriverLateWaiver}
                                onChange={(v) => setConfig({ ...config, passenger: { ...config.passenger, enableDriverLateWaiver: v } })}
                                label="ยกเว้นค่าธรรมเนียมเมื่อคนขับมาช้า"
                                description="ลูกค้ายกเลิกฟรีถ้าคนขับมาช้าเกินกำหนด"
                                icon="timer_off"
                                iconBg="bg-yellow-100 text-yellow-600"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <NumberInput
                                label="คนขับมาช้าเกินกี่นาที"
                                value={config.passenger.driverLateThresholdMs / 60000}
                                onChange={(v) => setConfig({ ...config, passenger: { ...config.passenger, driverLateThresholdMs: v * 60000 } })}
                                min={1} max={30} unit="นาที"
                                helpText="ถ้าคนขับมาช้าเกินนี้ ลูกค้ายกเลิกฟรี"
                            />
                        </div>

                        {/* Booking Limits Section */}
                        <div className="flex items-center gap-3 pb-4 pt-6 border-t border-b border-gray-100">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-purple-600">block</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">Booking Limits</h2>
                                <p className="text-sm text-gray-500">จำกัดจำนวนการจองและการยกเลิก</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <ToggleSwitch
                                checked={config.passenger.enableCancellationLimit}
                                onChange={(v) => setConfig({ ...config, passenger: { ...config.passenger, enableCancellationLimit: v } })}
                                label="จำกัดจำนวนยกเลิกต่อวัน"
                                description="ป้องกันการยกเลิกมากเกินไป"
                                icon="block"
                                iconBg="bg-purple-100 text-purple-600"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <NumberInput
                                label="จอง Active สูงสุด"
                                value={config.passenger.maxActiveBookings}
                                onChange={(v) => setConfig({ ...config, passenger: { ...config.passenger, maxActiveBookings: v } })}
                                min={1} max={5} unit="รายการ"
                                helpText="จำนวน booking ที่กำลังดำเนินการได้พร้อมกัน"
                            />
                            <NumberInput
                                label="ยกเลิกสูงสุดต่อวัน"
                                value={config.passenger.maxCancellationsPerDay}
                                onChange={(v) => setConfig({ ...config, passenger: { ...config.passenger, maxCancellationsPerDay: v } })}
                                min={1} max={10} unit="ครั้ง"
                                helpText="จำนวนครั้งสูงสุดที่ยกเลิกได้ต่อวัน"
                            />
                        </div>

                        {/* Dispute Rules Section */}
                        <div className="flex items-center gap-3 pb-4 pt-6 border-t border-b border-gray-100">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-600">gavel</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">Dispute Rules</h2>
                                <p className="text-sm text-gray-500">ตั้งค่าระบบอุทธรณ์</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <ToggleSwitch
                                checked={config.passenger.enableDispute}
                                onChange={(v) => setConfig({ ...config, passenger: { ...config.passenger, enableDispute: v } })}
                                label="เปิดระบบอุทธรณ์"
                                description="ลูกค้าสามารถอุทธรณ์ค่าธรรมเนียมได้"
                                icon="gavel"
                                iconBg="bg-blue-100 text-blue-600"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <NumberInput
                                label="ระยะเวลาอุทธรณ์"
                                value={config.passenger.disputeWindowHours}
                                onChange={(v) => setConfig({ ...config, passenger: { ...config.passenger, disputeWindowHours: v } })}
                                min={1} max={168} unit="ชั่วโมง"
                                helpText="ยื่นอุทธรณ์ได้ภายในกี่ชั่วโมงหลังเสร็จ trip"
                            />
                        </div>

                        {/* Summary Preview */}
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">สรุปกฎผู้โดยสาร</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                    <span className="text-gray-500">ยกเลิกฟรี</span>
                                    <p className="font-semibold text-gray-800">{config.passenger.freeCancellationWindowMs / 60000} นาที</p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                    <span className="text-gray-500">ค่ายกเลิก</span>
                                    <p className="font-semibold text-gray-800">฿{config.passenger.lateCancellationFee}</p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                    <span className="text-gray-500">รอ No-Show</span>
                                    <p className="font-semibold text-gray-800">{config.passenger.noShowWaitTimeMs / 60000} นาที</p>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                    <span className="text-gray-500">ค่า No-Show</span>
                                    <p className="font-semibold text-gray-800">฿{config.passenger.noShowFee}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
