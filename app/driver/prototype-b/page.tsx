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

export default function PrototypeB() {
    const [isOnline, setIsOnline] = useState(true);
    const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Animated Gradient Background */}
            <div className="fixed inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 animate-gradientShift" />

            {/* Floating Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-pink-500/30 rounded-full blur-3xl animate-pulse" />
                <div className="absolute top-1/2 -left-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute -bottom-40 right-1/4 w-72 h-72 bg-amber-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* Content */}
            <div className="relative z-10 p-4 pb-24">
                {/* Back Button */}
                <Link href="/driver" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                    <span>กลับ</span>
                </Link>

                {/* Header */}
                <div className="text-center mb-6">
                    <span className="px-3 py-1 bg-white/10 backdrop-blur-sm text-white text-xs font-medium rounded-full border border-white/20">
                        PROTOTYPE B - Glassmorphism
                    </span>
                </div>

                {/* Profile Card - Glass */}
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 mb-6 border border-white/20 shadow-2xl">
                    <div className="flex items-center gap-4 mb-6">
                        {/* Avatar with ring */}
                        <div className="relative">
                            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30">
                                <span className="material-symbols-outlined text-white text-4xl">person</span>
                            </div>
                            {/* Online indicator */}
                            <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-white ${
                                isOnline ? 'bg-emerald-400' : 'bg-slate-400'
                            }`} />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-white text-xl font-bold">สมชาย ใจดี</h2>
                            <p className="text-white/60 text-sm">Toyota Camry • กข 1234</p>
                            <div className="flex items-center gap-1 mt-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <span key={star} className="material-symbols-outlined text-amber-400 text-sm">
                                        {star <= 4 ? 'star' : 'star_half'}
                                    </span>
                                ))}
                                <span className="text-white/60 text-xs ml-1">4.8</span>
                            </div>
                        </div>
                    </div>

                    {/* Status Toggle - Glass Style */}
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/60 text-sm">สถานะการทำงาน</p>
                                <p className="text-white text-lg font-semibold">
                                    {isOnline ? 'พร้อมรับงาน' : 'ออฟไลน์'}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsOnline(!isOnline)}
                                className={`relative w-16 h-8 rounded-full transition-all duration-300 ${
                                    isOnline
                                        ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                                        : 'bg-white/20'
                                }`}
                            >
                                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-lg transition-all duration-300 ${
                                    isOnline ? 'left-9' : 'left-1'
                                }`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Row - Glass Cards */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                        { icon: 'route', value: '2', label: 'งานวันนี้', gradient: 'from-cyan-400 to-blue-500' },
                        { icon: 'payments', value: '฿4.5K', label: 'รายได้', gradient: 'from-emerald-400 to-teal-500' },
                        { icon: 'star', value: '4.8', label: 'คะแนน', gradient: 'from-amber-400 to-orange-500' },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center hover:bg-white/15 transition-all cursor-pointer group"
                        >
                            <div className={`w-12 h-12 mx-auto mb-2 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                                <span className="material-symbols-outlined text-white">{stat.icon}</span>
                            </div>
                            <p className="text-white text-xl font-bold">{stat.value}</p>
                            <p className="text-white/50 text-xs">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Tabs - Glass */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-1.5 mb-6 border border-white/10 flex">
                    {(['active', 'completed'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                activeTab === tab
                                    ? 'bg-white text-purple-600 shadow-lg'
                                    : 'text-white/70 hover:text-white'
                            }`}
                        >
                            {tab === 'active' ? 'กำลังดำเนินการ' : 'เสร็จสิ้น'}
                        </button>
                    ))}
                </div>

                {/* Booking Cards - Glass */}
                <div className="space-y-4">
                    {mockBookings.map((booking) => (
                        <div
                            key={booking.id}
                            className="bg-white/10 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/10 shadow-xl hover:shadow-2xl transition-all hover:bg-white/15"
                        >
                            {/* Header with gradient */}
                            <div className={`px-5 py-3 ${
                                booking.status === 'driver_assigned'
                                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20'
                                    : 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${
                                            booking.status === 'driver_assigned' ? 'bg-amber-400' : 'bg-blue-400'
                                        } animate-pulse`} />
                                        <span className="text-white text-sm font-medium">
                                            {booking.status === 'driver_assigned' ? 'รอเริ่มงาน' : 'กำลังไปรับ'}
                                        </span>
                                    </div>
                                    <span className="text-white/60 text-sm">
                                        {booking.pickupDate} • {booking.pickupTime}
                                    </span>
                                </div>
                            </div>

                            <div className="p-5">
                                {/* Customer Info */}
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="w-14 h-14 bg-gradient-to-br from-violet-400 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                                        <span className="material-symbols-outlined text-white text-2xl">person</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-white font-semibold text-lg">
                                            {booking.firstName} {booking.lastName}
                                        </p>
                                        <p className="text-white/50 text-sm">{booking.phone}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <a
                                            href={`tel:${booking.phone}`}
                                            className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 hover:bg-white/20 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-white">call</span>
                                        </a>
                                        <a
                                            href={`sms:${booking.phone}`}
                                            className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 hover:bg-white/20 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-white">chat</span>
                                        </a>
                                    </div>
                                </div>

                                {/* Route - Glass Card */}
                                <div className="bg-white/5 rounded-2xl p-4 mb-5 border border-white/5">
                                    <div className="flex items-start gap-4">
                                        <div className="flex flex-col items-center pt-1">
                                            <div className="w-3 h-3 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
                                            <div className="w-px h-10 bg-gradient-to-b from-emerald-400 to-rose-400 my-1" />
                                            <div className="w-3 h-3 rounded-full bg-rose-400 ring-4 ring-rose-400/20" />
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <p className="text-emerald-400/80 text-xs uppercase tracking-wider mb-0.5">รับที่</p>
                                                <p className="text-white font-medium">{booking.pickupLocation}</p>
                                            </div>
                                            <div>
                                                <p className="text-rose-400/80 text-xs uppercase tracking-wider mb-0.5">ส่งที่</p>
                                                <p className="text-white font-medium">{booking.dropoffLocation}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Action */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-white/40 text-xs">ค่าบริการ</p>
                                        <p className="text-white text-2xl font-bold">
                                            ฿{booking.totalCost.toLocaleString()}
                                        </p>
                                    </div>
                                    <button className={`px-6 py-3.5 rounded-2xl text-white font-semibold shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2 ${
                                        booking.status === 'driver_assigned'
                                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/30'
                                            : 'bg-gradient-to-r from-blue-500 to-cyan-500 shadow-blue-500/30'
                                    }`}>
                                        <span className="material-symbols-outlined">
                                            {booking.status === 'driver_assigned' ? 'play_arrow' : 'navigation'}
                                        </span>
                                        {booking.status === 'driver_assigned' ? 'เริ่มงาน' : 'นำทาง'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty State Example */}
                {activeTab === 'completed' && (
                    <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/10 text-center">
                        <div className="w-20 h-20 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-white/50 text-4xl">inbox</span>
                        </div>
                        <p className="text-white/70 text-lg font-medium">ยังไม่มีงานที่เสร็จสิ้น</p>
                        <p className="text-white/40 text-sm mt-1">งานที่เสร็จแล้วจะแสดงที่นี่</p>
                    </div>
                )}
            </div>

            {/* Bottom Nav - Glass */}
            <div className="fixed bottom-0 left-0 right-0 p-4">
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-2 flex justify-around shadow-2xl">
                    {[
                        { icon: 'home', label: 'หน้าหลัก', active: true },
                        { icon: 'history', label: 'ประวัติ', active: false },
                        { icon: 'person', label: 'โปรไฟล์', active: false },
                    ].map((item) => (
                        <button
                            key={item.label}
                            className={`flex flex-col items-center py-2 px-6 rounded-xl transition-all ${
                                item.active
                                    ? 'bg-white/20 text-white'
                                    : 'text-white/50 hover:text-white/70'
                            }`}
                        >
                            <span className="material-symbols-outlined">{item.icon}</span>
                            <span className="text-xs mt-1">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Custom CSS */}
            <style jsx>{`
                @keyframes gradientShift {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                .animate-gradientShift {
                    background-size: 200% 200%;
                    animation: gradientShift 15s ease infinite;
                }
            `}</style>
        </div>
    );
}
