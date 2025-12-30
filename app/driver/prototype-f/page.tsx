'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Mock data
const mockBookings = [
    {
        id: '1',
        firstName: 'Alexander',
        lastName: 'Thompson',
        phone: '0891234567',
        pickupLocation: 'สนามบินสุวรรณภูมิ (BKK)',
        dropoffLocation: 'The Ritz-Carlton Bangkok',
        pickupDate: '29 ธ.ค.',
        pickupTime: '14:00',
        totalCost: 2500,
        status: 'driver_assigned',
        category: 'urgent',
    },
    {
        id: '2',
        firstName: 'Victoria',
        lastName: 'Chen',
        phone: '0899876543',
        pickupLocation: 'Mandarin Oriental',
        dropoffLocation: 'สนามบินดอนเมือง',
        pickupDate: '29 ธ.ค.',
        pickupTime: '18:30',
        totalCost: 1800,
        status: 'driver_en_route',
        category: 'in_progress',
    },
    {
        id: '3',
        firstName: 'James',
        lastName: 'Wilson',
        phone: '0812345678',
        pickupLocation: 'Central World',
        dropoffLocation: 'Siam Paragon',
        pickupDate: '29 ธ.ค.',
        pickupTime: '20:00',
        totalCost: 350,
        status: 'driver_assigned',
        category: 'scheduled',
    },
];

// Animated background gradient
function AnimatedBackground() {
    return (
        <div className="fixed inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100" />
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-indigo-100/50 to-purple-100/50 rounded-full blur-3xl animate-float1" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-emerald-100/50 to-cyan-100/50 rounded-full blur-3xl animate-float2" />
            <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-gradient-to-br from-amber-100/30 to-orange-100/30 rounded-full blur-3xl animate-float3" />
        </div>
    );
}

// Status Badge
function StatusBadge({ status }: { status: string }) {
    const configs: Record<string, { bg: string; text: string; label: string; dot: string }> = {
        driver_assigned: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'รอเริ่มงาน', dot: 'bg-amber-500' },
        driver_en_route: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'กำลังไปรับ', dot: 'bg-blue-500' },
        in_progress: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'กำลังเดินทาง', dot: 'bg-emerald-500' },
    };
    const config = configs[status] || configs.driver_assigned;

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
            {config.label}
        </span>
    );
}

// Category Section
function CategorySection({
    title,
    icon,
    count,
    color,
    children,
    defaultOpen = true
}: {
    title: string;
    icon: string;
    count: number;
    color: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const colors: Record<string, { bg: string; iconBg: string; text: string; border: string }> = {
        red: { bg: 'bg-red-50', iconBg: 'bg-red-500', text: 'text-red-700', border: 'border-red-200' },
        blue: { bg: 'bg-blue-50', iconBg: 'bg-blue-500', text: 'text-blue-700', border: 'border-blue-200' },
        slate: { bg: 'bg-slate-50', iconBg: 'bg-slate-500', text: 'text-slate-700', border: 'border-slate-200' },
    };
    const colorConfig = colors[color] || colors.slate;

    return (
        <div className="mb-6">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl ${colorConfig.bg} border ${colorConfig.border} transition-all hover:shadow-md`}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${colorConfig.iconBg} rounded-xl flex items-center justify-center shadow-lg`}>
                        <span className="material-symbols-outlined text-white">{icon}</span>
                    </div>
                    <div className="text-left">
                        <h3 className={`font-bold ${colorConfig.text}`}>{title}</h3>
                        <p className="text-slate-500 text-sm">{count} รายการ</p>
                    </div>
                </div>
                <span className={`material-symbols-outlined ${colorConfig.text} transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    expand_more
                </span>
            </button>

            <div className={`overflow-hidden transition-all duration-300 ease-out ${isOpen ? 'max-h-[2000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-4 pl-2">
                    {children}
                </div>
            </div>
        </div>
    );
}

// Featured Job Card (Prominent display)
function FeaturedJobCard({ booking }: { booking: typeof mockBookings[0] }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className="relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Glow effect for urgent */}
            {booking.category === 'urgent' && (
                <div className="absolute -inset-1 bg-gradient-to-r from-red-400 via-orange-400 to-amber-400 rounded-3xl blur-lg opacity-30 animate-pulse" />
            )}

            <div className={`
                relative overflow-hidden rounded-3xl bg-white
                shadow-lg hover:shadow-2xl transition-all duration-500
                border-2 ${booking.category === 'urgent' ? 'border-red-200' : 'border-transparent'}
                ${isHovered ? 'scale-[1.02]' : ''}
            `}>
                {/* Urgent Banner */}
                {booking.category === 'urgent' && (
                    <div className="bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 text-white py-2 px-4 flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-lg animate-bounce">priority_high</span>
                        <span className="font-bold text-sm uppercase tracking-wider">งานด่วน - ต้องเริ่มเร็วๆ นี้</span>
                        <span className="material-symbols-outlined text-lg animate-bounce">priority_high</span>
                    </div>
                )}

                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                                    booking.category === 'urgent'
                                        ? 'bg-gradient-to-br from-red-400 to-orange-500'
                                        : 'bg-gradient-to-br from-indigo-400 to-purple-500'
                                }`}>
                                    <span className="material-symbols-outlined text-white text-3xl">person</span>
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                                    <span className="text-white text-xs">✓</span>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">
                                    {booking.firstName} {booking.lastName}
                                </h3>
                                <p className="text-slate-500 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">call</span>
                                    {booking.phone}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <StatusBadge status={booking.status} />
                            <p className="text-slate-400 text-sm mt-2">
                                {booking.pickupDate} • {booking.pickupTime}
                            </p>
                        </div>
                    </div>

                    {/* Route - Visual Style */}
                    <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl p-5 mb-5">
                        <div className="flex items-center gap-4">
                            {/* Route visualization */}
                            <div className="flex flex-col items-center">
                                <div className="w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                                <div className="w-1 h-16 bg-gradient-to-b from-emerald-500 via-slate-300 to-rose-500 rounded-full my-1 relative">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center">
                                        <span className="text-xs">🚗</span>
                                    </div>
                                </div>
                                <div className="w-4 h-4 rounded-full bg-rose-500 ring-4 ring-rose-100" />
                            </div>

                            {/* Locations */}
                            <div className="flex-1 space-y-6">
                                <div>
                                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">จุดรับ</p>
                                    <p className="text-slate-900 font-semibold">{booking.pickupLocation}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">จุดส่ง</p>
                                    <p className="text-slate-900 font-semibold">{booking.dropoffLocation}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-xs uppercase tracking-wider">ค่าบริการ</p>
                            <p className="text-3xl font-bold text-slate-900">฿{booking.totalCost.toLocaleString()}</p>
                        </div>
                        <div className="flex gap-3">
                            <a
                                href={`tel:${booking.phone}`}
                                className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 hover:bg-emerald-100 hover:text-emerald-600 transition-colors"
                            >
                                <span className="material-symbols-outlined text-2xl">call</span>
                            </a>
                            <button className={`
                                px-8 py-4 rounded-2xl font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95
                                ${booking.category === 'urgent'
                                    ? 'bg-gradient-to-r from-red-500 to-orange-500 shadow-red-500/30'
                                    : 'bg-gradient-to-r from-indigo-500 to-purple-500 shadow-indigo-500/30'
                                }
                            `}>
                                <span className="flex items-center gap-2">
                                    <span className="material-symbols-outlined">play_arrow</span>
                                    เริ่มงาน
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Simple Job Card
function SimpleJobCard({ booking }: { booking: typeof mockBookings[0] }) {
    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all border border-slate-100 hover:border-slate-200">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-500">schedule</span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-900 truncate">{booking.firstName} {booking.lastName}</h4>
                        <StatusBadge status={booking.status} />
                    </div>
                    <p className="text-slate-500 text-sm truncate">
                        {booking.pickupLocation} → {booking.dropoffLocation}
                    </p>
                </div>
                <div className="text-right flex-shrink-0">
                    <p className="font-bold text-slate-900">฿{booking.totalCost.toLocaleString()}</p>
                    <p className="text-slate-400 text-sm">{booking.pickupTime}</p>
                </div>
                <button className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 hover:bg-indigo-100 transition-colors">
                    <span className="material-symbols-outlined">chevron_right</span>
                </button>
            </div>
        </div>
    );
}

export default function PrototypeF() {
    const [isOnline, setIsOnline] = useState(true);
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('สวัสดีตอนเช้า');
        else if (hour < 17) setGreeting('สวัสดีตอนบ่าย');
        else setGreeting('สวัสดีตอนเย็น');
    }, []);

    const urgentJobs = mockBookings.filter(b => b.category === 'urgent');
    const inProgressJobs = mockBookings.filter(b => b.category === 'in_progress');
    const scheduledJobs = mockBookings.filter(b => b.category === 'scheduled');

    return (
        <div className="min-h-screen relative">
            <AnimatedBackground />

            <div className="relative z-10 p-5 pb-28">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <Link href="/driver" className="text-slate-400 hover:text-slate-600 transition-colors">
                        <span className="material-symbols-outlined text-2xl">arrow_back</span>
                    </Link>
                    <span className="px-4 py-1.5 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 text-xs font-bold rounded-full">
                        📊 PROTOTYPE F - Pro Dashboard
                    </span>
                    <button className="relative text-slate-400 hover:text-slate-600 transition-colors">
                        <span className="material-symbols-outlined text-2xl">notifications</span>
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">3</span>
                    </button>
                </div>

                {/* Welcome & Status */}
                <div className="bg-white rounded-3xl p-6 shadow-lg mb-6 border border-slate-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                                    <span className="material-symbols-outlined text-white text-3xl">person</span>
                                </div>
                                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-slate-400'}`} />
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm">{greeting}</p>
                                <h1 className="text-2xl font-bold text-slate-900">สมชาย</h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-slate-400'}`}>
                                {isOnline ? 'ออนไลน์' : 'ออฟไลน์'}
                            </span>
                            <button
                                onClick={() => setIsOnline(!isOnline)}
                                className={`w-14 h-8 rounded-full transition-all duration-300 ${isOnline ? 'bg-green-500' : 'bg-slate-200'}`}
                            >
                                <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${isOnline ? 'ml-7' : 'ml-1'}`} />
                            </button>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
                        {[
                            { icon: 'pending_actions', value: '3', label: 'รอดำเนินการ', color: 'text-amber-600 bg-amber-50' },
                            { icon: 'local_taxi', value: '1', label: 'กำลังทำ', color: 'text-blue-600 bg-blue-50' },
                            { icon: 'check_circle', value: '12', label: 'เสร็จวันนี้', color: 'text-green-600 bg-green-50' },
                            { icon: 'payments', value: '฿8.7K', label: 'รายได้', color: 'text-purple-600 bg-purple-50' },
                        ].map((stat) => (
                            <div key={stat.label} className={`p-3 rounded-2xl ${stat.color.split(' ')[1]} text-center`}>
                                <span className={`material-symbols-outlined ${stat.color.split(' ')[0]}`}>{stat.icon}</span>
                                <p className={`text-xl font-bold ${stat.color.split(' ')[0]} mt-1`}>{stat.value}</p>
                                <p className="text-slate-500 text-xs">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Category: Urgent Jobs */}
                {urgentJobs.length > 0 && (
                    <CategorySection
                        title="งานด่วน"
                        icon="bolt"
                        count={urgentJobs.length}
                        color="red"
                        defaultOpen={true}
                    >
                        {urgentJobs.map((booking) => (
                            <FeaturedJobCard key={booking.id} booking={booking} />
                        ))}
                    </CategorySection>
                )}

                {/* Category: In Progress */}
                {inProgressJobs.length > 0 && (
                    <CategorySection
                        title="กำลังดำเนินการ"
                        icon="directions_car"
                        count={inProgressJobs.length}
                        color="blue"
                        defaultOpen={true}
                    >
                        {inProgressJobs.map((booking) => (
                            <FeaturedJobCard key={booking.id} booking={booking} />
                        ))}
                    </CategorySection>
                )}

                {/* Category: Scheduled */}
                {scheduledJobs.length > 0 && (
                    <CategorySection
                        title="งานที่นัดหมาย"
                        icon="event"
                        count={scheduledJobs.length}
                        color="slate"
                        defaultOpen={false}
                    >
                        {scheduledJobs.map((booking) => (
                            <SimpleJobCard key={booking.id} booking={booking} />
                        ))}
                    </CategorySection>
                )}

                {/* Summary Card */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg">สรุปวันนี้</h3>
                        <span className="material-symbols-outlined opacity-70">insights</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                            <p className="text-3xl font-bold">15</p>
                            <p className="text-white/70 text-sm">เที่ยว</p>
                        </div>
                        <div className="text-center border-x border-white/20">
                            <p className="text-3xl font-bold">4.9</p>
                            <p className="text-white/70 text-sm">คะแนน</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-bold">฿12.5K</p>
                            <p className="text-white/70 text-sm">รายได้</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 shadow-lg">
                <div className="flex justify-around">
                    {[
                        { icon: 'dashboard', label: 'แดชบอร์ด', active: true },
                        { icon: 'history', label: 'ประวัติ', active: false },
                        { icon: 'person', label: 'โปรไฟล์', active: false },
                    ].map((item) => (
                        <button
                            key={item.label}
                            className={`flex flex-col items-center py-2 px-6 rounded-xl transition-all ${
                                item.active
                                    ? 'text-indigo-600 bg-indigo-50'
                                    : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            <span className="material-symbols-outlined">{item.icon}</span>
                            <span className="text-xs mt-1 font-medium">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Custom Animations */}
            <style jsx>{`
                @keyframes float1 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(-30px, 20px) scale(1.1); }
                }
                @keyframes float2 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(40px, -30px) scale(1.05); }
                }
                @keyframes float3 {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); }
                    50% { transform: translate(-40%, -60%) scale(1.1); }
                }
                .animate-float1 { animation: float1 20s ease-in-out infinite; }
                .animate-float2 { animation: float2 25s ease-in-out infinite; }
                .animate-float3 { animation: float3 15s ease-in-out infinite; }
            `}</style>
        </div>
    );
}
