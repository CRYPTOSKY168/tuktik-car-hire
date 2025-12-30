'use client';

import { useState } from 'react';
import Link from 'next/link';

// Mock data
const mockBookings = [
    {
        id: '1',
        firstName: 'John',
        lastName: 'Smith',
        phone: '0891234567',
        pickupLocation: 'สนามบินสุวรรณภูมิ',
        dropoffLocation: 'โรงแรม Marriott สุขุมวิท',
        pickupDate: '29 ธ.ค.',
        pickupTime: '14:00',
        totalCost: 1500,
        status: 'driver_assigned',
        progress: 0,
    },
    {
        id: '2',
        firstName: 'Sarah',
        lastName: 'Johnson',
        phone: '0899876543',
        pickupLocation: 'Central World',
        dropoffLocation: 'สนามบินดอนเมือง',
        pickupDate: '29 ธ.ค.',
        pickupTime: '18:30',
        totalCost: 800,
        status: 'driver_en_route',
        progress: 33,
    },
    {
        id: '3',
        firstName: 'Mike',
        lastName: 'Wilson',
        phone: '0812345678',
        pickupLocation: 'Siam Paragon',
        dropoffLocation: 'ICON Siam',
        pickupDate: '29 ธ.ค.',
        pickupTime: '20:00',
        totalCost: 450,
        status: 'in_progress',
        progress: 66,
    },
];

// Micro-interaction Button Component
function MicroButton({
    children,
    onClick,
    variant = 'primary',
    icon,
    className = ''
}: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    icon?: string;
    className?: string;
}) {
    const [isPressed, setIsPressed] = useState(false);

    const variants = {
        primary: 'bg-slate-900 text-white hover:bg-slate-800',
        secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
        danger: 'bg-red-50 text-red-600 hover:bg-red-100',
    };

    return (
        <button
            onClick={onClick}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onMouseLeave={() => setIsPressed(false)}
            className={`
                relative overflow-hidden px-5 py-3 rounded-xl font-medium
                transition-all duration-200 ease-out
                ${variants[variant]}
                ${isPressed ? 'scale-95' : 'scale-100 hover:scale-[1.02]'}
                ${className}
            `}
        >
            <span className="flex items-center justify-center gap-2">
                {icon && <span className="material-symbols-outlined text-lg">{icon}</span>}
                {children}
            </span>
        </button>
    );
}

// Progress Ring Component
function ProgressRing({ progress, size = 48 }: { progress: number; size?: number }) {
    const strokeWidth = 3;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth={strokeWidth}
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#0f172a"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
            />
        </svg>
    );
}

// Expandable Card Component
function BookingCard({ booking }: { booking: typeof mockBookings[0] }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const statusText = {
        driver_assigned: 'รอเริ่มงาน',
        driver_en_route: 'กำลังไปรับ',
        in_progress: 'กำลังเดินทาง',
    }[booking.status] || booking.status;

    return (
        <div
            className={`
                bg-white rounded-2xl border border-slate-100
                transition-all duration-300 ease-out cursor-pointer
                hover:shadow-lg hover:shadow-slate-200/50 hover:border-slate-200
                ${isExpanded ? 'shadow-xl shadow-slate-200/50' : 'shadow-sm'}
            `}
            onClick={() => setIsExpanded(!isExpanded)}
        >
            {/* Main Content */}
            <div className="p-5">
                <div className="flex items-center gap-4">
                    {/* Progress Ring */}
                    <div className="relative">
                        <ProgressRing progress={booking.progress} />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-semibold text-slate-700">
                                {booking.progress}%
                            </span>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900 truncate">
                                {booking.firstName} {booking.lastName}
                            </h3>
                            <span className="flex-shrink-0 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                                {statusText}
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm truncate">
                            {booking.pickupLocation} → {booking.dropoffLocation}
                        </p>
                    </div>

                    {/* Price & Time */}
                    <div className="text-right flex-shrink-0">
                        <p className="font-bold text-slate-900">฿{booking.totalCost.toLocaleString()}</p>
                        <p className="text-slate-400 text-sm">{booking.pickupTime}</p>
                    </div>

                    {/* Expand Icon */}
                    <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${
                        isExpanded ? 'rotate-180' : ''
                    }`}>
                        expand_more
                    </span>
                </div>
            </div>

            {/* Expanded Content */}
            <div className={`
                overflow-hidden transition-all duration-300 ease-out
                ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
            `}>
                <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                    {/* Route Detail */}
                    <div className="flex gap-4 mb-5">
                        <div className="flex flex-col items-center pt-1">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <div className="w-px h-12 bg-slate-200 my-1.5" />
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                        </div>
                        <div className="flex-1 space-y-5">
                            <div>
                                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">จุดรับ</p>
                                <p className="text-slate-900 font-medium">{booking.pickupLocation}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">จุดส่ง</p>
                                <p className="text-slate-900 font-medium">{booking.dropoffLocation}</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
                        <a
                            href={`tel:${booking.phone}`}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">call</span>
                            โทร
                        </a>
                        <MicroButton variant="primary" icon="navigation" className="flex-1">
                            {booking.status === 'driver_assigned' ? 'เริ่มงาน' : 'นำทาง'}
                        </MicroButton>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PrototypeC() {
    const [isOnline, setIsOnline] = useState(true);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-20">
                <div className="px-5 py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/driver" className="text-slate-400 hover:text-slate-600 transition-colors">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </Link>
                        <span className="px-3 py-1 bg-slate-100 text-slate-500 text-xs font-medium rounded-full">
                            PROTOTYPE C - Minimal
                        </span>
                        <button className="text-slate-400 hover:text-slate-600 transition-colors">
                            <span className="material-symbols-outlined">settings</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-5 pb-28">
                {/* Greeting */}
                <div className="mb-6">
                    <p className="text-slate-400 text-sm">สวัสดีตอนบ่าย</p>
                    <h1 className="text-2xl font-bold text-slate-900">สมชาย</h1>
                </div>

                {/* Status Toggle - Minimal */}
                <div className="bg-white rounded-2xl p-5 mb-6 border border-slate-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`
                                w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300
                                ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}
                            `}>
                                <span className="material-symbols-outlined">
                                    {isOnline ? 'radio_button_checked' : 'radio_button_unchecked'}
                                </span>
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900">
                                    {isOnline ? 'กำลังออนไลน์' : 'ออฟไลน์'}
                                </p>
                                <p className="text-slate-400 text-sm">
                                    {isOnline ? 'พร้อมรับงานใหม่' : 'ไม่รับงาน'}
                                </p>
                            </div>
                        </div>

                        {/* Minimal Toggle */}
                        <button
                            onClick={() => setIsOnline(!isOnline)}
                            className={`
                                relative w-14 h-8 rounded-full transition-all duration-300
                                ${isOnline ? 'bg-emerald-500' : 'bg-slate-200'}
                            `}
                        >
                            <div className={`
                                absolute top-1 w-6 h-6 rounded-full bg-white shadow-sm
                                transition-all duration-300 ease-out
                                ${isOnline ? 'left-7' : 'left-1'}
                            `} />
                        </button>
                    </div>
                </div>

                {/* Quick Stats - Horizontal Scroll */}
                <div className="flex gap-3 mb-6 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
                    {[
                        { icon: 'pending_actions', value: '3', label: 'รอดำเนินการ', color: 'bg-amber-50 text-amber-600' },
                        { icon: 'check_circle', value: '7', label: 'เสร็จวันนี้', color: 'bg-emerald-50 text-emerald-600' },
                        { icon: 'payments', value: '฿4,500', label: 'รายได้', color: 'bg-blue-50 text-blue-600' },
                        { icon: 'star', value: '4.9', label: 'คะแนน', color: 'bg-purple-50 text-purple-600' },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="flex-shrink-0 bg-white rounded-2xl p-4 border border-slate-100 min-w-[130px] hover:shadow-md hover:shadow-slate-200/50 transition-all cursor-pointer"
                        >
                            <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
                                <span className="material-symbols-outlined text-lg">{stat.icon}</span>
                            </div>
                            <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                            <p className="text-slate-400 text-xs">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Section Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-slate-900">งานของคุณ</h2>
                    <button className="text-slate-400 text-sm hover:text-slate-600 transition-colors flex items-center gap-1">
                        ดูทั้งหมด
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                </div>

                {/* Booking Cards */}
                <div className="space-y-3">
                    {mockBookings.map((booking) => (
                        <BookingCard key={booking.id} booking={booking} />
                    ))}
                </div>

                {/* Empty State Example */}
                <div className="mt-6 bg-white rounded-2xl p-8 border border-dashed border-slate-200 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-400 text-2xl">add_circle</span>
                    </div>
                    <p className="text-slate-500 font-medium mb-1">พร้อมรับงานใหม่</p>
                    <p className="text-slate-400 text-sm">งานใหม่จะแสดงที่นี่เมื่อได้รับมอบหมาย</p>
                </div>
            </div>

            {/* Bottom Navigation - Minimal */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3">
                <div className="flex justify-around">
                    {[
                        { icon: 'home', label: 'หน้าหลัก', active: true },
                        { icon: 'history', label: 'ประวัติ', active: false },
                        { icon: 'person', label: 'โปรไฟล์', active: false },
                    ].map((item) => (
                        <button
                            key={item.label}
                            className={`
                                flex flex-col items-center py-2 px-4 rounded-xl transition-all
                                ${item.active
                                    ? 'text-slate-900'
                                    : 'text-slate-400 hover:text-slate-600'
                                }
                            `}
                        >
                            <span className={`material-symbols-outlined ${item.active ? '' : ''}`}>
                                {item.icon}
                            </span>
                            <span className="text-xs mt-1 font-medium">{item.label}</span>
                            {item.active && (
                                <div className="w-1 h-1 bg-slate-900 rounded-full mt-1" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Hide Scrollbar */}
            <style jsx>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
