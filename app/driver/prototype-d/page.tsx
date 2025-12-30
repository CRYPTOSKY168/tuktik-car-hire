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
        pickupDate: '29 ธ.ค. 2567',
        pickupTime: '14:00',
        totalCost: 2500,
        status: 'driver_assigned',
        isUrgent: true,
    },
    {
        id: '2',
        firstName: 'Victoria',
        lastName: 'Chen',
        phone: '0899876543',
        pickupLocation: 'Mandarin Oriental',
        dropoffLocation: 'สนามบินดอนเมือง (DMK)',
        pickupDate: '29 ธ.ค. 2567',
        pickupTime: '18:30',
        totalCost: 1800,
        status: 'driver_en_route',
        isUrgent: false,
    },
];

// Aurora Background Component
function AuroraBackground() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
            {/* Base gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />

            {/* Aurora layers */}
            <div className="absolute inset-0">
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-[120px] animate-aurora1" />
                <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-violet-500/20 rounded-full blur-[100px] animate-aurora2" />
                <div className="absolute bottom-0 left-0 w-[700px] h-[400px] bg-cyan-500/15 rounded-full blur-[120px] animate-aurora3" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[80px] animate-aurora4" />
            </div>

            {/* Floating particles */}
            {[...Array(30)].map((_, i) => (
                <div
                    key={i}
                    className="absolute rounded-full animate-floatParticle"
                    style={{
                        width: `${2 + Math.random() * 4}px`,
                        height: `${2 + Math.random() * 4}px`,
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        background: `rgba(255, 255, 255, ${0.1 + Math.random() * 0.3})`,
                        animationDelay: `${Math.random() * 10}s`,
                        animationDuration: `${10 + Math.random() * 20}s`,
                    }}
                />
            ))}

            {/* Shooting stars */}
            <div className="absolute top-20 left-1/3 w-32 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-50 animate-shootingStar" />
            <div className="absolute top-40 right-1/4 w-24 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent opacity-40 animate-shootingStar2" />
        </div>
    );
}

// Breathing Glow Component
function BreathingGlow({ color = 'emerald', children, className = '' }: { color?: string; children: React.ReactNode; className?: string }) {
    const colors: Record<string, string> = {
        emerald: 'shadow-emerald-500/50',
        amber: 'shadow-amber-500/50',
        violet: 'shadow-violet-500/50',
        cyan: 'shadow-cyan-500/50',
        rose: 'shadow-rose-500/50',
    };

    return (
        <div className={`relative ${className}`}>
            <div className={`absolute -inset-1 rounded-3xl ${colors[color]} blur-xl animate-breathe opacity-60`} />
            {children}
        </div>
    );
}

// Animated Counter with glow
function LuxuryCounter({ end, prefix = '', suffix = '' }: { end: number; prefix?: string; suffix?: string }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number;
        const duration = 2000;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4); // Ease out quart
            setCount(Math.floor(eased * end));

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [end]);

    return (
        <span className="bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent">
            {prefix}{count.toLocaleString()}{suffix}
        </span>
    );
}

// Premium Job Card
function PremiumJobCard({ booking, index }: { booking: typeof mockBookings[0]; index: number }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className="animate-slideUpFade"
            style={{ animationDelay: `${index * 200}ms` }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <BreathingGlow color={booking.isUrgent ? 'amber' : 'emerald'}>
                <div className={`
                    relative overflow-hidden rounded-3xl
                    bg-gradient-to-br from-white/10 to-white/5
                    backdrop-blur-xl border border-white/10
                    transition-all duration-500
                    ${isHovered ? 'scale-[1.02] border-white/20' : ''}
                `}>
                    {/* Urgent badge */}
                    {booking.isUrgent && (
                        <div className="absolute top-4 right-4 z-10">
                            <div className="relative">
                                <div className="absolute inset-0 bg-amber-500 rounded-full blur-md animate-pulse" />
                                <div className="relative px-4 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full text-xs font-bold text-white flex items-center gap-1.5">
                                    <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                                    URGENT
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Shimmer effect on hover */}
                    <div className={`
                        absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent
                        transition-transform duration-1000
                        ${isHovered ? 'translate-x-full' : '-translate-x-full'}
                    `} />

                    {/* Top gradient bar */}
                    <div className={`h-1.5 ${
                        booking.isUrgent
                            ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500'
                            : 'bg-gradient-to-r from-emerald-400 via-cyan-500 to-blue-500'
                    } animate-gradientFlow`} />

                    <div className="p-6">
                        {/* Status & Time */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`
                                    relative w-3 h-3 rounded-full
                                    ${booking.status === 'driver_assigned' ? 'bg-amber-400' : 'bg-cyan-400'}
                                `}>
                                    <div className={`
                                        absolute inset-0 rounded-full animate-ping
                                        ${booking.status === 'driver_assigned' ? 'bg-amber-400' : 'bg-cyan-400'}
                                    `} />
                                </div>
                                <span className="text-white/90 font-medium">
                                    {booking.status === 'driver_assigned' ? 'รอเริ่มงาน' : 'กำลังไปรับ'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-white/60">
                                <span className="material-symbols-outlined text-lg">schedule</span>
                                <span className="font-medium">{booking.pickupTime}</span>
                            </div>
                        </div>

                        {/* Customer Info - Premium Style */}
                        <div className="flex items-center gap-5 mb-6">
                            <div className="relative">
                                <div className="absolute -inset-1 bg-gradient-to-br from-violet-400 to-purple-600 rounded-2xl blur-sm animate-breathe" />
                                <div className="relative w-18 h-18 bg-gradient-to-br from-violet-400 to-purple-600 rounded-2xl flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white text-3xl">person</span>
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-white mb-1">
                                    {booking.firstName} {booking.lastName}
                                </h3>
                                <p className="text-white/50 text-sm flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base">call</span>
                                    {booking.phone}
                                </p>
                            </div>
                            <a
                                href={`tel:${booking.phone}`}
                                className="relative group"
                            >
                                <div className="absolute -inset-2 bg-emerald-500/30 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-white text-2xl">call</span>
                                </div>
                            </a>
                        </div>

                        {/* Premium Route Display */}
                        <div className="relative bg-white/5 rounded-2xl p-5 mb-6 overflow-hidden">
                            {/* Animated background lines */}
                            <div className="absolute inset-0 opacity-20">
                                {[...Array(5)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="absolute h-px bg-gradient-to-r from-transparent via-white to-transparent animate-scanLine"
                                        style={{
                                            top: `${20 + i * 20}%`,
                                            animationDelay: `${i * 0.5}s`,
                                        }}
                                    />
                                ))}
                            </div>

                            <div className="relative flex items-start gap-4">
                                <div className="flex flex-col items-center">
                                    {/* Pickup point */}
                                    <div className="relative">
                                        <div className="absolute -inset-2 bg-emerald-400/30 rounded-full blur-md animate-pulse" />
                                        <div className="relative w-5 h-5 bg-gradient-to-br from-emerald-300 to-emerald-500 rounded-full border-2 border-white" />
                                    </div>

                                    {/* Animated connecting line */}
                                    <div className="relative w-0.5 h-16 my-2 bg-white/20 overflow-hidden rounded-full">
                                        <div className="absolute inset-0 bg-gradient-to-b from-emerald-400 to-rose-400 animate-lineFlow" />
                                        {/* Moving car icon */}
                                        <div className="absolute left-1/2 -translate-x-1/2 animate-carMove">
                                            <div className="w-3 h-3 bg-white rounded-sm flex items-center justify-center">
                                                <span className="text-slate-900 text-[8px]">🚗</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dropoff point */}
                                    <div className="relative">
                                        <div className="absolute -inset-2 bg-rose-400/30 rounded-full blur-md animate-pulse" />
                                        <div className="relative w-5 h-5 bg-gradient-to-br from-rose-300 to-rose-500 rounded-full border-2 border-white" />
                                    </div>
                                </div>

                                <div className="flex-1 space-y-8">
                                    <div>
                                        <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1">PICKUP</p>
                                        <p className="text-white font-semibold text-lg">{booking.pickupLocation}</p>
                                    </div>
                                    <div>
                                        <p className="text-rose-400 text-xs font-bold uppercase tracking-widest mb-1">DROPOFF</p>
                                        <p className="text-white font-semibold text-lg">{booking.dropoffLocation}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Price & Action */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Service Fee</p>
                                <p className="text-3xl font-bold">
                                    <LuxuryCounter end={booking.totalCost} prefix="฿" />
                                </p>
                            </div>
                            <button className={`
                                relative group overflow-hidden
                                px-8 py-4 rounded-2xl font-bold text-white
                                ${booking.isUrgent
                                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500'
                                    : 'bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500'
                                }
                                shadow-lg transition-all duration-300
                                hover:scale-105 hover:shadow-2xl active:scale-95
                            `}>
                                {/* Shine effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                <span className="relative flex items-center gap-2">
                                    <span className="material-symbols-outlined">play_arrow</span>
                                    เริ่มงาน
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </BreathingGlow>
        </div>
    );
}

export default function PrototypeD() {
    const [isOnline, setIsOnline] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="min-h-screen relative">
            <AuroraBackground />

            {/* Content */}
            <div className="relative z-10 p-5 pb-32">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <Link href="/driver" className="text-white/50 hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-2xl">arrow_back</span>
                    </Link>
                    <span className="px-4 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold rounded-full">
                        ✨ PROTOTYPE D - Living Luxury
                    </span>
                    <button className="text-white/50 hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-2xl">notifications</span>
                    </button>
                </div>

                {/* Welcome Section */}
                <div className="mb-8">
                    <p className="text-white/50 text-sm mb-1">
                        {currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        สวัสดี, <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent animate-shimmerText">สมชาย</span>
                    </h1>
                    <p className="text-white/60">พร้อมให้บริการลูกค้า VIP ของคุณ</p>
                </div>

                {/* Premium Status Card */}
                <BreathingGlow color={isOnline ? 'emerald' : 'violet'} className="mb-8">
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 p-6">
                        {/* Animated orbs inside */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl animate-floatSlow" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-500/20 rounded-full blur-2xl animate-floatSlow2" />

                        <div className="relative flex items-center justify-between">
                            <div>
                                <p className="text-white/50 text-sm mb-2">สถานะ</p>
                                <h2 className={`text-2xl font-bold ${
                                    isOnline
                                        ? 'bg-gradient-to-r from-emerald-300 to-cyan-300'
                                        : 'bg-gradient-to-r from-slate-300 to-slate-400'
                                } bg-clip-text text-transparent`}>
                                    {isOnline ? '● พร้อมรับงาน' : '○ ออฟไลน์'}
                                </h2>
                                <p className="text-white/40 text-sm mt-1">
                                    {isOnline ? 'ระบบจะแจ้งเตือนงานใหม่อัตโนมัติ' : 'คุณจะไม่ได้รับงานใหม่'}
                                </p>
                            </div>

                            {/* Luxury Toggle */}
                            <button
                                onClick={() => setIsOnline(!isOnline)}
                                className="relative w-24 h-12 rounded-full transition-all duration-500"
                            >
                                <div className={`
                                    absolute inset-0 rounded-full transition-all duration-500
                                    ${isOnline
                                        ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/30'
                                        : 'bg-white/10'
                                    }
                                `} />
                                <div className={`
                                    absolute top-1 w-10 h-10 rounded-full bg-white shadow-xl
                                    transition-all duration-500 flex items-center justify-center
                                    ${isOnline ? 'left-[52px]' : 'left-1'}
                                `}>
                                    <span className={`material-symbols-outlined transition-colors ${
                                        isOnline ? 'text-emerald-500' : 'text-slate-400'
                                    }`}>
                                        {isOnline ? 'bolt' : 'power_settings_new'}
                                    </span>
                                </div>
                            </button>
                        </div>
                    </div>
                </BreathingGlow>

                {/* Luxury Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {[
                        { icon: 'local_taxi', value: 2, label: 'งานรอ', color: 'from-amber-400 to-orange-500', glow: 'amber' },
                        { icon: 'paid', value: 8750, label: 'รายได้วันนี้', color: 'from-emerald-400 to-teal-500', glow: 'emerald', prefix: '฿' },
                        { icon: 'star', value: 4.9, label: 'คะแนน', color: 'from-violet-400 to-purple-500', glow: 'violet' },
                    ].map((stat, i) => (
                        <div
                            key={stat.label}
                            className="animate-slideUpFade"
                            style={{ animationDelay: `${i * 100}ms` }}
                        >
                            <div className="relative group cursor-pointer">
                                <div className={`
                                    absolute -inset-0.5 bg-gradient-to-r ${stat.color} rounded-2xl blur-sm opacity-50
                                    group-hover:opacity-100 transition-opacity animate-breathe
                                `} />
                                <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3 shadow-lg`}>
                                        <span className="material-symbols-outlined text-white">{stat.icon}</span>
                                    </div>
                                    <p className="text-2xl font-bold text-white">
                                        <LuxuryCounter end={stat.value} prefix={stat.prefix} />
                                    </p>
                                    <p className="text-white/40 text-xs">{stat.label}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Section Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="relative">
                        <div className="absolute -inset-1 bg-amber-500/30 rounded-lg blur-md animate-pulse" />
                        <div className="relative w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-lg">work</span>
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-white">งานของคุณ</h2>
                    <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent" />
                </div>

                {/* Job Cards */}
                <div className="space-y-5">
                    {mockBookings.map((booking, index) => (
                        <PremiumJobCard key={booking.id} booking={booking} index={index} />
                    ))}
                </div>
            </div>

            {/* Premium Bottom Nav */}
            <div className="fixed bottom-0 left-0 right-0 p-4">
                <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-violet-500/30 via-purple-500/30 to-pink-500/30 rounded-3xl blur-xl" />
                    <div className="relative bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-white/10 p-3 flex justify-around">
                        {[
                            { icon: 'home', label: 'หน้าหลัก', active: true },
                            { icon: 'history', label: 'ประวัติ', active: false },
                            { icon: 'person', label: 'โปรไฟล์', active: false },
                        ].map((item) => (
                            <button
                                key={item.label}
                                className={`
                                    relative flex flex-col items-center py-2 px-6 rounded-xl transition-all
                                    ${item.active ? 'text-white' : 'text-white/40 hover:text-white/60'}
                                `}
                            >
                                {item.active && (
                                    <>
                                        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-xl" />
                                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-violet-400 to-purple-400 rounded-full" />
                                    </>
                                )}
                                <span className="relative material-symbols-outlined">{item.icon}</span>
                                <span className="relative text-xs mt-1">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Custom Animations */}
            <style jsx>{`
                @keyframes aurora1 {
                    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
                    50% { transform: translate(50px, 30px) scale(1.2); opacity: 0.5; }
                }
                @keyframes aurora2 {
                    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; }
                    50% { transform: translate(-40px, 50px) scale(1.3); opacity: 0.4; }
                }
                @keyframes aurora3 {
                    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.2; }
                    50% { transform: translate(60px, -30px) scale(1.1); opacity: 0.35; }
                }
                @keyframes aurora4 {
                    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; }
                    50% { transform: translate(-30px, -40px) scale(1.2); opacity: 0.3; }
                }
                @keyframes floatParticle {
                    0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0.3; }
                    25% { transform: translate(20px, -30px) rotate(90deg); opacity: 0.6; }
                    50% { transform: translate(-10px, -50px) rotate(180deg); opacity: 0.4; }
                    75% { transform: translate(-30px, -20px) rotate(270deg); opacity: 0.7; }
                }
                @keyframes shootingStar {
                    0% { transform: translateX(-100px) translateY(0); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateX(300px) translateY(100px); opacity: 0; }
                }
                @keyframes shootingStar2 {
                    0% { transform: translateX(-50px) translateY(0); opacity: 0; }
                    10% { opacity: 0.8; }
                    90% { opacity: 0.8; }
                    100% { transform: translateX(250px) translateY(80px); opacity: 0; }
                }
                @keyframes breathe {
                    0%, 100% { opacity: 0.4; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.05); }
                }
                @keyframes slideUpFade {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes gradientFlow {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 200% 50%; }
                }
                @keyframes scanLine {
                    0% { transform: translateX(-100%); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateX(100%); opacity: 0; }
                }
                @keyframes lineFlow {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(100%); }
                }
                @keyframes carMove {
                    0% { top: 0; }
                    100% { top: calc(100% - 12px); }
                }
                @keyframes floatSlow {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(-20px, 20px); }
                }
                @keyframes floatSlow2 {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(20px, -20px); }
                }
                @keyframes shimmerText {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                .animate-aurora1 { animation: aurora1 15s ease-in-out infinite; }
                .animate-aurora2 { animation: aurora2 18s ease-in-out infinite; }
                .animate-aurora3 { animation: aurora3 20s ease-in-out infinite; }
                .animate-aurora4 { animation: aurora4 22s ease-in-out infinite; }
                .animate-floatParticle { animation: floatParticle 15s ease-in-out infinite; }
                .animate-shootingStar { animation: shootingStar 8s linear infinite; }
                .animate-shootingStar2 { animation: shootingStar2 12s linear infinite 3s; }
                .animate-breathe { animation: breathe 3s ease-in-out infinite; }
                .animate-slideUpFade { animation: slideUpFade 0.6s ease-out forwards; }
                .animate-gradientFlow { background-size: 200% 100%; animation: gradientFlow 3s linear infinite; }
                .animate-scanLine { animation: scanLine 3s ease-in-out infinite; }
                .animate-lineFlow { animation: lineFlow 2s ease-in-out infinite; }
                .animate-carMove { animation: carMove 2s ease-in-out infinite; }
                .animate-floatSlow { animation: floatSlow 8s ease-in-out infinite; }
                .animate-floatSlow2 { animation: floatSlow2 10s ease-in-out infinite; }
                .animate-shimmerText { background-size: 200% auto; animation: shimmerText 3s linear infinite; }
            `}</style>
        </div>
    );
}
