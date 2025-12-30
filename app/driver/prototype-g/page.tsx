'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Mock data
const mockBookings = [
    {
        id: 'TK-7842',
        firstName: 'Alexander',
        lastName: 'Thompson',
        phone: '0891234567',
        pickupLocation: 'Suvarnabhumi Airport',
        dropoffLocation: 'The Ritz-Carlton Bangkok',
        pickupDate: '29 DEC',
        pickupTime: '14:00',
        totalCost: 2500,
        distance: '35.2',
        duration: '45',
        passengers: 2,
        luggage: 3,
        isVIP: true,
    },
    {
        id: 'TK-7843',
        firstName: 'Victoria',
        lastName: 'Chen',
        phone: '0899876543',
        pickupLocation: 'Mandarin Oriental',
        dropoffLocation: 'Don Mueang Airport',
        pickupDate: '29 DEC',
        pickupTime: '18:30',
        totalCost: 1800,
        distance: '28.5',
        duration: '35',
        passengers: 1,
        luggage: 2,
        isVIP: false,
    },
];

// Cyberpunk Retro Background
function CyberpunkBackground() {
    return (
        <div className="fixed inset-0 overflow-hidden">
            {/* Deep space gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0014] via-[#0d0020] to-[#000000]" />

            {/* Animated gradient mesh */}
            <div className="absolute inset-0">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-fuchsia-900/20 via-transparent to-cyan-900/15 animate-meshSlow" />
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-purple-900/15 via-transparent to-rose-900/10 animate-meshSlow2" />
            </div>

            {/* Retro grid floor */}
            <div className="absolute bottom-0 left-0 right-0 h-[60%] perspective-[500px]">
                <div
                    className="absolute inset-0 origin-bottom"
                    style={{
                        transform: 'rotateX(75deg)',
                        backgroundImage: `
                            linear-gradient(to right, rgba(236,72,153,0.3) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(236,72,153,0.3) 1px, transparent 1px)
                        `,
                        backgroundSize: '60px 60px',
                        maskImage: 'linear-gradient(to top, black 20%, transparent 80%)',
                        WebkitMaskImage: 'linear-gradient(to top, black 20%, transparent 80%)',
                    }}
                />
                {/* Grid glow */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-fuchsia-500/20 to-transparent blur-xl" />
            </div>

            {/* Sun/Moon retro circle */}
            <div className="absolute top-20 left-1/2 -translate-x-1/2">
                <div className="relative w-48 h-48">
                    {/* Outer glow */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-b from-orange-500/40 via-fuchsia-500/30 to-purple-500/20 blur-3xl animate-pulse" />
                    {/* Sun circle with scan lines */}
                    <div className="absolute inset-4 rounded-full bg-gradient-to-b from-orange-400 via-fuchsia-500 to-purple-600 overflow-hidden">
                        {/* Horizontal lines */}
                        <div className="absolute inset-0" style={{
                            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(0,0,0,0.3) 4px, rgba(0,0,0,0.3) 8px)',
                        }} />
                    </div>
                    {/* Chrome ring */}
                    <div className="absolute inset-2 rounded-full border-2 border-white/20" />
                </div>
            </div>

            {/* Floating particles */}
            <div className="absolute inset-0 overflow-hidden">
                {[...Array(30)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 rounded-full bg-cyan-400/60 animate-floatParticle"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${10 + Math.random() * 20}s`,
                        }}
                    />
                ))}
            </div>

            {/* Scan line overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
            }} />

            {/* Horizontal scan beam */}
            <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent animate-scanBeam" />

            {/* Corner chrome accents */}
            <div className="absolute top-0 left-0 w-32 h-32">
                <div className="absolute top-4 left-4 w-20 h-[2px] bg-gradient-to-r from-cyan-400 to-transparent" />
                <div className="absolute top-4 left-4 w-[2px] h-20 bg-gradient-to-b from-cyan-400 to-transparent" />
            </div>
            <div className="absolute top-0 right-0 w-32 h-32">
                <div className="absolute top-4 right-4 w-20 h-[2px] bg-gradient-to-l from-fuchsia-400 to-transparent" />
                <div className="absolute top-4 right-4 w-[2px] h-20 bg-gradient-to-b from-fuchsia-400 to-transparent" />
            </div>
        </div>
    );
}

// Chrome/Gold Text Component
function ChromeText({ children, variant = 'chrome', size = 'base', className = '' }: {
    children: React.ReactNode;
    variant?: 'chrome' | 'gold' | 'neon-cyan' | 'neon-pink';
    size?: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
    className?: string;
}) {
    const variants = {
        chrome: 'bg-gradient-to-b from-white via-slate-300 to-slate-500 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]',
        gold: 'bg-gradient-to-b from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]',
        'neon-cyan': 'text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)] [text-shadow:0_0_10px_rgba(34,211,238,0.8),0_0_20px_rgba(34,211,238,0.6),0_0_30px_rgba(34,211,238,0.4)]',
        'neon-pink': 'text-fuchsia-400 drop-shadow-[0_0_20px_rgba(232,121,249,0.8)] [text-shadow:0_0_10px_rgba(232,121,249,0.8),0_0_20px_rgba(232,121,249,0.6),0_0_30px_rgba(232,121,249,0.4)]',
    };

    const sizes = {
        sm: 'text-sm',
        base: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
        '2xl': 'text-2xl',
        '3xl': 'text-3xl',
    };

    return (
        <span className={`font-bold ${variants[variant]} ${sizes[size]} ${className}`}>
            {children}
        </span>
    );
}

// Holographic Card
function HoloCard({ children, variant = 'default', className = '' }: {
    children: React.ReactNode;
    variant?: 'default' | 'gold' | 'vip';
    className?: string;
}) {
    const borderColors = {
        default: 'from-cyan-500/50 via-fuchsia-500/50 to-cyan-500/50',
        gold: 'from-amber-400/60 via-yellow-300/60 to-amber-400/60',
        vip: 'from-fuchsia-500/60 via-rose-400/60 to-fuchsia-500/60',
    };

    return (
        <div className={`relative group ${className}`}>
            {/* Animated border glow */}
            <div className={`absolute -inset-[1px] rounded-2xl bg-gradient-to-r ${borderColors[variant]} opacity-75 blur-sm group-hover:opacity-100 transition-opacity animate-borderGlow`} />

            {/* Card body */}
            <div className="relative rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 overflow-hidden">
                {/* Holographic shine effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Chrome corners */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-400/50 rounded-tl-2xl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-fuchsia-400/50 rounded-tr-2xl" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-fuchsia-400/50 rounded-bl-2xl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-400/50 rounded-br-2xl" />

                {children}
            </div>
        </div>
    );
}

// Cyber Button
function CyberButton({ children, variant = 'primary', icon, onClick, className = '' }: {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'gold';
    icon?: string;
    onClick?: () => void;
    className?: string;
}) {
    const variants = {
        primary: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:shadow-[0_0_40px_rgba(34,211,238,0.6)]',
        secondary: 'bg-white/5 border border-white/20 hover:bg-white/10 hover:border-white/30',
        gold: 'bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 shadow-[0_0_30px_rgba(251,191,36,0.4)] hover:shadow-[0_0_40px_rgba(251,191,36,0.6)]',
    };

    return (
        <button
            onClick={onClick}
            className={`
                relative overflow-hidden px-6 py-4 rounded-xl font-bold uppercase tracking-wider text-sm
                text-white transition-all duration-300 active:scale-95
                ${variants[variant]} ${className}
            `}
        >
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />

            <span className="relative flex items-center justify-center gap-2">
                {icon && <span className="material-symbols-outlined">{icon}</span>}
                {children}
            </span>
        </button>
    );
}

// VIP Job Card
function JobCard({ booking }: { booking: typeof mockBookings[0] }) {
    return (
        <HoloCard variant={booking.isVIP ? 'vip' : 'default'}>
            {/* VIP Banner */}
            {booking.isVIP && (
                <div className="relative py-2 px-4 bg-gradient-to-r from-fuchsia-500/20 via-rose-500/20 to-fuchsia-500/20 border-b border-fuchsia-500/30">
                    <div className="flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-amber-400 text-lg animate-pulse">diamond</span>
                        <ChromeText variant="gold" size="sm">VIP PRIORITY</ChromeText>
                        <span className="material-symbols-outlined text-amber-400 text-lg animate-pulse">diamond</span>
                    </div>
                </div>
            )}

            {/* Gradient accent line */}
            <div className="h-1 bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-cyan-500 animate-gradientX" />

            <div className="p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="absolute inset-0 bg-cyan-500/30 rounded-xl blur-lg animate-pulse" />
                            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 border border-cyan-500/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-cyan-400 text-2xl">local_taxi</span>
                            </div>
                        </div>
                        <div>
                            <ChromeText variant="neon-cyan" size="lg">NEW RIDE</ChromeText>
                            <p className="text-white/40 text-sm font-mono">#{booking.id}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <ChromeText variant="gold" size="2xl">฿{booking.totalCost.toLocaleString()}</ChromeText>
                        <p className="text-white/40 text-sm">{booking.distance} km • {booking.duration} min</p>
                    </div>
                </div>

                {/* Customer */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 mb-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/40 to-cyan-500/40 rounded-full blur-md" />
                        <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center text-white text-xl font-bold border-2 border-white/30">
                            {booking.firstName.charAt(0)}
                        </div>
                    </div>
                    <div className="flex-1">
                        <p className="text-white font-semibold text-lg">{booking.firstName} {booking.lastName}</p>
                        <div className="flex items-center gap-4 mt-1 text-white/50 text-sm">
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm text-cyan-400">person</span>
                                {booking.passengers}
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm text-fuchsia-400">luggage</span>
                                {booking.luggage}
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm text-amber-400">schedule</span>
                                {booking.pickupTime}
                            </span>
                        </div>
                    </div>
                    <a
                        href={`tel:${booking.phone}`}
                        className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/30 transition-all hover:scale-105"
                    >
                        <span className="material-symbols-outlined">call</span>
                    </a>
                </div>

                {/* Route */}
                <div className="relative p-4 rounded-xl bg-white/5 border border-white/10 mb-5">
                    {/* Animated line */}
                    <div className="absolute left-8 top-[44px] w-[2px] h-[calc(100%-70px)] overflow-hidden">
                        <div className="w-full h-full bg-gradient-to-b from-cyan-500 to-fuchsia-500" />
                        <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-transparent animate-lineFlow" />
                    </div>

                    {/* Pickup */}
                    <div className="flex items-start gap-4 mb-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-cyan-500/50 rounded-full blur-md animate-pulse" />
                            <div className="relative w-4 h-4 rounded-full bg-cyan-400 ring-4 ring-cyan-400/20" />
                        </div>
                        <div className="flex-1">
                            <p className="text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">PICKUP</p>
                            <p className="text-white font-semibold">{booking.pickupLocation}</p>
                        </div>
                    </div>

                    {/* Dropoff */}
                    <div className="flex items-start gap-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-fuchsia-500/50 rounded-full blur-md animate-pulse" />
                            <div className="relative w-4 h-4 rounded-full bg-fuchsia-400 ring-4 ring-fuchsia-400/20" />
                        </div>
                        <div className="flex-1">
                            <p className="text-fuchsia-400 text-xs font-bold uppercase tracking-wider mb-1">DESTINATION</p>
                            <p className="text-white font-semibold">{booking.dropoffLocation}</p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <CyberButton variant="secondary" className="flex-1">
                        Decline
                    </CyberButton>
                    <CyberButton variant={booking.isVIP ? 'gold' : 'primary'} icon="check_circle" className="flex-[2]">
                        Accept
                    </CyberButton>
                </div>
            </div>
        </HoloCard>
    );
}

// Stats Display
function StatsRing({ value, label, color }: { value: string; label: string; color: 'cyan' | 'fuchsia' | 'gold' }) {
    const colors = {
        cyan: { ring: 'stroke-cyan-400', glow: 'drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]', text: 'text-cyan-400' },
        fuchsia: { ring: 'stroke-fuchsia-400', glow: 'drop-shadow-[0_0_10px_rgba(232,121,249,0.5)]', text: 'text-fuchsia-400' },
        gold: { ring: 'stroke-amber-400', glow: 'drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]', text: 'text-amber-400' },
    };

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-20 h-20">
                <svg className={`w-full h-full -rotate-90 ${colors[color].glow}`}>
                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                    <circle
                        cx="40" cy="40" r="34"
                        fill="none"
                        className={colors[color].ring}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray="214"
                        strokeDashoffset="50"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`font-bold text-lg ${colors[color].text}`}>{value}</span>
                </div>
            </div>
            <span className="text-white/50 text-xs uppercase tracking-wider mt-2">{label}</span>
        </div>
    );
}

export default function PrototypeG() {
    const [isOnline, setIsOnline] = useState(true);
    const [time, setTime] = useState('');

    useEffect(() => {
        const updateTime = () => {
            setTime(new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }));
        };
        updateTime();
        const timer = setInterval(updateTime, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="min-h-screen text-white">
            <CyberpunkBackground />

            <div className="relative z-10 min-h-screen pb-32">
                {/* Header */}
                <div className="sticky top-0 z-20 backdrop-blur-xl bg-black/40 border-b border-white/10">
                    <div className="px-5 py-4">
                        <div className="flex items-center justify-between">
                            <Link href="/driver" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all">
                                <span className="material-symbols-outlined">arrow_back</span>
                            </Link>

                            <div className="flex items-center gap-2">
                                <div className="h-8 px-4 rounded-full bg-gradient-to-r from-fuchsia-500/20 to-cyan-500/20 border border-fuchsia-500/30 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-fuchsia-400 animate-pulse" />
                                    <span className="text-xs font-bold uppercase tracking-widest bg-gradient-to-r from-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                                        TUKTIK PRO
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-white/40 font-mono text-sm">
                                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                {time}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-5">
                    {/* Driver Card */}
                    <HoloCard className="mb-6">
                        <div className="p-5">
                            <div className="flex items-center gap-4">
                                {/* Avatar */}
                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/50 to-fuchsia-500/50 rounded-2xl blur-lg animate-pulse" />
                                    <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-fuchsia-500 flex items-center justify-center text-white text-2xl font-bold border-2 border-white/30">
                                        S
                                    </div>
                                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-black flex items-center justify-center ${isOnline ? 'bg-emerald-400' : 'bg-slate-500'}`}>
                                        <span className="material-symbols-outlined text-black text-xs">
                                            {isOnline ? 'check' : 'remove'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <ChromeText variant="chrome" size="xl">SOMCHAI</ChromeText>
                                    <p className="text-white/40 text-sm font-mono mt-1">ID: DRV-2847</p>
                                </div>

                                {/* Online Toggle */}
                                <button
                                    onClick={() => setIsOnline(!isOnline)}
                                    className={`
                                        relative h-10 px-5 rounded-full font-bold uppercase tracking-wider text-sm transition-all
                                        ${isOnline
                                            ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)]'
                                            : 'bg-white/5 border border-white/20 text-white/50'
                                        }
                                    `}
                                >
                                    <span className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-white/40'}`} />
                                        {isOnline ? 'ONLINE' : 'OFFLINE'}
                                    </span>
                                </button>
                            </div>

                            {/* Stats */}
                            <div className="flex justify-around mt-6 pt-5 border-t border-white/10">
                                <StatsRing value="12" label="Trips" color="cyan" />
                                <StatsRing value="4.9" label="Rating" color="gold" />
                                <StatsRing value="87%" label="Accept" color="fuchsia" />
                            </div>
                        </div>
                    </HoloCard>

                    {/* Jobs Section */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-amber-500/50 rounded-lg blur-md animate-pulse" />
                                    <div className="relative w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-amber-400">notifications_active</span>
                                    </div>
                                </div>
                                <ChromeText variant="neon-pink" size="lg">INCOMING RIDES</ChromeText>
                            </div>
                            <div className="h-8 px-4 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center">
                                <span className="text-amber-400 text-sm font-bold">{mockBookings.length} NEW</span>
                            </div>
                        </div>

                        {/* Job Cards */}
                        <div className="space-y-5">
                            {mockBookings.map((booking) => (
                                <JobCard key={booking.id} booking={booking} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom Navigation */}
                <div className="fixed bottom-0 left-0 right-0 p-4">
                    <div className="relative">
                        {/* Glow */}
                        <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/20 via-fuchsia-500/20 to-cyan-500/20 rounded-3xl blur-xl" />

                        <div className="relative rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 p-2">
                            <div className="flex justify-around">
                                {[
                                    { icon: 'space_dashboard', label: 'Dashboard', active: true },
                                    { icon: 'history', label: 'History', active: false },
                                    { icon: 'analytics', label: 'Stats', active: false },
                                    { icon: 'person', label: 'Profile', active: false },
                                ].map((item) => (
                                    <button
                                        key={item.label}
                                        className={`
                                            flex flex-col items-center py-3 px-4 rounded-xl transition-all
                                            ${item.active
                                                ? 'text-cyan-400 bg-cyan-500/10'
                                                : 'text-white/40 hover:text-white/60'
                                            }
                                        `}
                                    >
                                        {item.active && (
                                            <div className="absolute -top-1 w-8 h-1 rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500" />
                                        )}
                                        <span className="material-symbols-outlined">{item.icon}</span>
                                        <span className="text-xs mt-1 font-medium">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Animations */}
            <style jsx>{`
                @keyframes meshSlow {
                    0%, 100% { transform: translate(0, 0) rotate(0deg); }
                    50% { transform: translate(-3%, 3%) rotate(1deg); }
                }
                @keyframes meshSlow2 {
                    0%, 100% { transform: translate(0, 0) rotate(0deg); }
                    50% { transform: translate(3%, -3%) rotate(-1deg); }
                }
                @keyframes scanBeam {
                    0% { top: -2px; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                @keyframes floatParticle {
                    0%, 100% { transform: translate(0, 0); opacity: 0.3; }
                    50% { transform: translate(20px, -30px); opacity: 0.8; }
                }
                @keyframes borderGlow {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 1; }
                }
                @keyframes gradientX {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 200% 50%; }
                }
                @keyframes lineFlow {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(200%); }
                }
                .animate-meshSlow { animation: meshSlow 30s ease-in-out infinite; }
                .animate-meshSlow2 { animation: meshSlow2 35s ease-in-out infinite; }
                .animate-scanBeam { animation: scanBeam 6s linear infinite; }
                .animate-floatParticle { animation: floatParticle 15s ease-in-out infinite; }
                .animate-borderGlow { animation: borderGlow 3s ease-in-out infinite; }
                .animate-gradientX { background-size: 200% 100%; animation: gradientX 3s linear infinite; }
                .animate-lineFlow { animation: lineFlow 2s ease-in-out infinite; }
            `}</style>
        </div>
    );
}
