'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Mock data
const mockDriver = {
    name: 'สมชาย ใจดี',
    vehiclePlate: 'กข 1234',
    vehicleModel: 'Toyota Camry',
    status: 'available',
};

const mockBookings = [
    {
        id: '1',
        firstName: 'John',
        lastName: 'Smith',
        phone: '0891234567',
        pickupLocation: 'สนามบินสุวรรณภูมิ',
        dropoffLocation: 'โรงแรม Marriott สุขุมวิท',
        pickupDate: '29 ธ.ค. 2567',
        pickupTime: '14:00',
        totalCost: 1500,
        status: 'driver_assigned',
    },
    {
        id: '2',
        firstName: 'Sarah',
        lastName: 'Johnson',
        phone: '0899876543',
        pickupLocation: 'Central World',
        dropoffLocation: 'สนามบินดอนเมือง',
        pickupDate: '29 ธ.ค. 2567',
        pickupTime: '18:30',
        totalCost: 800,
        status: 'driver_en_route',
    },
];

// Animated Counter Component
function AnimatedCounter({ end, duration = 1000, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            setCount(Math.floor(progress * end));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration]);

    return <span>{count.toLocaleString()}{suffix}</span>;
}

// Floating Particles Component
function FloatingParticles() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
                <div
                    key={i}
                    className="absolute w-2 h-2 bg-white/20 rounded-full animate-float"
                    style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 5}s`,
                        animationDuration: `${3 + Math.random() * 4}s`,
                    }}
                />
            ))}
        </div>
    );
}

// Shimmer Effect Component
function ShimmerEffect() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
    );
}

export default function PrototypeA() {
    const [isOnline, setIsOnline] = useState(true);
    const [showRipple, setShowRipple] = useState(false);

    const handleToggle = () => {
        setShowRipple(true);
        setTimeout(() => setShowRipple(false), 600);
        setIsOnline(!isOnline);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 pb-24">
            {/* Back Button */}
            <Link href="/driver" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors">
                <span className="material-symbols-outlined">arrow_back</span>
                <span>กลับ</span>
            </Link>

            {/* Header */}
            <div className="text-center mb-6">
                <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full">
                    PROTOTYPE A - Heavy Animation
                </span>
            </div>

            {/* Status Card with Particles & Shimmer */}
            <div className={`relative rounded-3xl p-6 mb-6 overflow-hidden transition-all duration-500 ${
                isOnline
                    ? 'bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600'
                    : 'bg-gradient-to-br from-slate-600 via-slate-500 to-slate-600'
            }`}>
                <FloatingParticles />
                <ShimmerEffect />

                <div className="relative z-10">
                    <div className="flex items-center justify-between">
                        <div className="text-white">
                            <p className="text-sm opacity-80 mb-1">สถานะของคุณ</p>
                            <h2 className="text-3xl font-bold animate-pulse">
                                {isOnline ? 'พร้อมรับงาน' : 'ออฟไลน์'}
                            </h2>
                            <p className="text-sm opacity-70 mt-2">
                                {isOnline ? 'คุณจะได้รับการแจ้งเตือนงานใหม่' : 'คุณจะไม่ได้รับงานใหม่'}
                            </p>
                        </div>

                        {/* 3D Toggle */}
                        <button
                            onClick={handleToggle}
                            className="relative w-24 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 transition-all hover:scale-105 active:scale-95"
                            style={{ perspective: '200px' }}
                        >
                            {showRipple && (
                                <div className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
                            )}
                            <div
                                className={`absolute top-1 w-10 h-10 rounded-full bg-white shadow-lg transition-all duration-500 flex items-center justify-center ${
                                    isOnline ? 'left-[52px]' : 'left-1'
                                }`}
                                style={{
                                    transform: isOnline ? 'rotateY(0deg)' : 'rotateY(180deg)',
                                    transformStyle: 'preserve-3d',
                                }}
                            >
                                <span className={`material-symbols-outlined transition-colors ${
                                    isOnline ? 'text-green-500' : 'text-slate-400'
                                }`}>
                                    {isOnline ? 'check' : 'power_settings_new'}
                                </span>
                            </div>
                        </button>
                    </div>

                    {/* Animated Status Bar */}
                    <div className="mt-4 h-1 bg-white/20 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${
                            isOnline ? 'w-full bg-white animate-pulse' : 'w-0'
                        }`} />
                    </div>
                </div>
            </div>

            {/* Stats with Animated Counters */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                    { icon: 'pending_actions', label: 'รอดำเนินการ', value: 2, color: 'from-violet-500 to-purple-600' },
                    { icon: 'check_circle', label: 'เสร็จวันนี้', value: 5, color: 'from-emerald-500 to-teal-600' },
                    { icon: 'payments', label: 'รายได้', value: 4500, color: 'from-amber-500 to-orange-600', suffix: '฿' },
                ].map((stat, i) => (
                    <div
                        key={stat.label}
                        className={`relative bg-gradient-to-br ${stat.color} rounded-2xl p-4 text-white overflow-hidden group hover:scale-105 transition-transform cursor-pointer`}
                        style={{ animationDelay: `${i * 100}ms` }}
                    >
                        {/* Hover glow effect */}
                        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />

                        <span className="material-symbols-outlined text-2xl opacity-80 mb-2 block">
                            {stat.icon}
                        </span>
                        <p className="text-2xl font-bold">
                            {stat.suffix === '฿' ? '฿' : ''}
                            <AnimatedCounter end={stat.value} duration={1500} />
                        </p>
                        <p className="text-xs opacity-70 mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Active Bookings with Staggered Animation */}
            <div className="mb-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400">local_taxi</span>
                    งานที่กำลังดำเนินการ
                </h3>

                <div className="space-y-4">
                    {mockBookings.map((booking, index) => (
                        <div
                            key={booking.id}
                            className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 animate-slideUp hover:bg-white/15 transition-all hover:scale-[1.02] cursor-pointer"
                            style={{
                                animationDelay: `${index * 150}ms`,
                                animationFillMode: 'backwards',
                            }}
                        >
                            {/* Status with pulse */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full animate-pulse ${
                                        booking.status === 'driver_assigned' ? 'bg-amber-400' :
                                        booking.status === 'driver_en_route' ? 'bg-blue-400' : 'bg-green-400'
                                    }`} />
                                    <span className="text-white/80 text-sm font-medium">
                                        {booking.status === 'driver_assigned' ? 'รอเริ่มงาน' :
                                         booking.status === 'driver_en_route' ? 'กำลังไปรับ' : 'กำลังเดินทาง'}
                                    </span>
                                </div>
                                <span className="text-white/60 text-sm">
                                    {booking.pickupTime}
                                </span>
                            </div>

                            {/* Customer */}
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                    <span className="material-symbols-outlined text-white text-2xl">person</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-white font-semibold text-lg">
                                        {booking.firstName} {booking.lastName}
                                    </p>
                                    <a href={`tel:${booking.phone}`} className="text-indigo-400 text-sm flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">call</span>
                                        {booking.phone}
                                    </a>
                                </div>
                                <a
                                    href={`tel:${booking.phone}`}
                                    className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 hover:scale-110 transition-transform"
                                >
                                    <span className="material-symbols-outlined text-white">call</span>
                                </a>
                            </div>

                            {/* Animated Route */}
                            <div className="bg-white/5 rounded-xl p-4 mb-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex flex-col items-center">
                                        <div className="w-4 h-4 bg-emerald-400 rounded-full shadow-lg shadow-emerald-400/50 animate-pulse" />
                                        <div className="relative w-0.5 h-12 bg-gradient-to-b from-emerald-400 to-rose-400 overflow-hidden">
                                            {/* Animated dot moving down */}
                                            <div className="absolute w-2 h-2 bg-white rounded-full -left-[3px] animate-moveDot" />
                                        </div>
                                        <div className="w-4 h-4 bg-rose-400 rounded-full shadow-lg shadow-rose-400/50 animate-pulse" />
                                    </div>
                                    <div className="flex-1 space-y-6">
                                        <div>
                                            <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">จุดรับ</p>
                                            <p className="text-white font-medium">{booking.pickupLocation}</p>
                                        </div>
                                        <div>
                                            <p className="text-rose-400 text-xs font-semibold uppercase tracking-wider">จุดส่ง</p>
                                            <p className="text-white font-medium">{booking.dropoffLocation}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Price & Action */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-white/60 text-xs">ค่าบริการ</p>
                                    <p className="text-2xl font-bold text-white">฿{booking.totalCost.toLocaleString()}</p>
                                </div>
                                <button className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                                    <span className="material-symbols-outlined">navigation</span>
                                    เริ่มงาน
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Custom CSS for animations */}
            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.5; }
                    50% { transform: translateY(-20px) rotate(180deg); opacity: 1; }
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes moveDot {
                    0% { top: 0; }
                    100% { top: 100%; }
                }
                .animate-float {
                    animation: float 5s ease-in-out infinite;
                }
                .animate-shimmer {
                    animation: shimmer 3s ease-in-out infinite;
                }
                .animate-slideUp {
                    animation: slideUp 0.5s ease-out;
                }
                .animate-moveDot {
                    animation: moveDot 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}
