'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Mock data
const mockBookings = [
    {
        id: 'TRX-7842',
        firstName: 'Alexander',
        lastName: 'Thompson',
        phone: '0891234567',
        pickupLocation: 'สนามบินสุวรรณภูมิ (BKK)',
        dropoffLocation: 'The Ritz-Carlton Bangkok',
        pickupDate: '29 ธ.ค. 2567',
        pickupTime: '14:00',
        totalCost: 2500,
        status: 'driver_assigned',
        priority: 'high',
        eta: '15 min',
    },
    {
        id: 'TRX-7843',
        firstName: 'Victoria',
        lastName: 'Chen',
        phone: '0899876543',
        pickupLocation: 'Mandarin Oriental',
        dropoffLocation: 'สนามบินดอนเมือง (DMK)',
        pickupDate: '29 ธ.ค. 2567',
        pickupTime: '18:30',
        totalCost: 1800,
        status: 'driver_en_route',
        priority: 'normal',
        eta: '45 min',
    },
];

// Cyber Grid Background
function CyberGrid() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
            {/* Base */}
            <div className="absolute inset-0 bg-slate-950" />

            {/* Grid */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0" style={{
                    backgroundImage: `
                        linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '50px 50px',
                }} />
            </div>

            {/* Perspective grid at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-48 opacity-30" style={{
                background: 'linear-gradient(to top, rgba(0, 255, 255, 0.1), transparent)',
                transform: 'perspective(500px) rotateX(60deg)',
                transformOrigin: 'bottom',
            }} />

            {/* Scan lines */}
            <div className="absolute inset-0 animate-scanDown opacity-10"
                style={{
                    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 255, 0.03) 2px, rgba(0, 255, 255, 0.03) 4px)',
                }}
            />

            {/* Neon glow spots */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-500/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 right-1/3 w-32 h-32 bg-pink-500/10 rounded-full blur-[60px] animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
    );
}

// HUD Corner Component
function HUDCorner({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
    const positions = {
        tl: 'top-0 left-0 border-t-2 border-l-2',
        tr: 'top-0 right-0 border-t-2 border-r-2',
        bl: 'bottom-0 left-0 border-b-2 border-l-2',
        br: 'bottom-0 right-0 border-b-2 border-r-2',
    };

    return (
        <div className={`absolute w-4 h-4 border-cyan-400/50 ${positions[position]}`} />
    );
}

// Glitch Text Component
function GlitchText({ children, className = '' }: { children: string; className?: string }) {
    return (
        <span className={`relative inline-block ${className}`}>
            <span className="relative z-10">{children}</span>
            <span className="absolute top-0 left-0 -ml-0.5 text-cyan-400 opacity-70 animate-glitch1" aria-hidden>{children}</span>
            <span className="absolute top-0 left-0 ml-0.5 text-pink-400 opacity-70 animate-glitch2" aria-hidden>{children}</span>
        </span>
    );
}

// Neon Button
function NeonButton({ children, color = 'cyan', onClick, icon }: {
    children: React.ReactNode;
    color?: 'cyan' | 'pink' | 'green';
    onClick?: () => void;
    icon?: string;
}) {
    const colors = {
        cyan: 'from-cyan-400 to-blue-500 shadow-cyan-500/50 hover:shadow-cyan-500/70',
        pink: 'from-pink-400 to-purple-500 shadow-pink-500/50 hover:shadow-pink-500/70',
        green: 'from-green-400 to-emerald-500 shadow-green-500/50 hover:shadow-green-500/70',
    };

    return (
        <button
            onClick={onClick}
            className={`
                relative overflow-hidden px-6 py-3 rounded-lg
                bg-gradient-to-r ${colors[color]}
                text-white font-bold uppercase tracking-wider text-sm
                shadow-lg hover:shadow-xl transition-all duration-300
                hover:scale-105 active:scale-95
                border border-white/20
            `}
        >
            <div className="absolute inset-0 bg-white/20 animate-neonPulse" />
            <span className="relative flex items-center gap-2">
                {icon && <span className="material-symbols-outlined">{icon}</span>}
                {children}
            </span>
        </button>
    );
}

// Data Display Component
function DataDisplay({ label, value, unit = '', color = 'cyan' }: {
    label: string;
    value: string | number;
    unit?: string;
    color?: 'cyan' | 'pink' | 'green' | 'amber';
}) {
    const colors = {
        cyan: 'text-cyan-400 border-cyan-400/30',
        pink: 'text-pink-400 border-pink-400/30',
        green: 'text-green-400 border-green-400/30',
        amber: 'text-amber-400 border-amber-400/30',
    };

    return (
        <div className={`relative border ${colors[color]} bg-slate-900/50 backdrop-blur-sm rounded-lg p-3`}>
            <HUDCorner position="tl" />
            <HUDCorner position="br" />
            <p className="text-white/40 text-xs uppercase tracking-widest mb-1 font-mono">{label}</p>
            <p className={`text-2xl font-bold font-mono ${colors[color].split(' ')[0]}`}>
                {value}<span className="text-sm ml-1 opacity-70">{unit}</span>
            </p>
        </div>
    );
}

// Mission Card Component
function MissionCard({ booking, index }: { booking: typeof mockBookings[0]; index: number }) {
    const [isScanning, setIsScanning] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsScanning(false), 2000 + index * 500);
        return () => clearTimeout(timer);
    }, [index]);

    return (
        <div
            className="animate-slideIn"
            style={{ animationDelay: `${index * 200}ms` }}
        >
            <div className={`
                relative overflow-hidden rounded-xl
                bg-slate-900/80 backdrop-blur-xl
                border ${booking.priority === 'high' ? 'border-pink-500/50' : 'border-cyan-500/30'}
                transition-all duration-300 hover:border-cyan-400/50
            `}>
                {/* HUD Corners */}
                <HUDCorner position="tl" />
                <HUDCorner position="tr" />
                <HUDCorner position="bl" />
                <HUDCorner position="br" />

                {/* Scanning effect */}
                {isScanning && (
                    <div className="absolute inset-0 z-20 pointer-events-none">
                        <div className="absolute inset-0 bg-cyan-500/10" />
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scanHorizontal" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-cyan-400 font-mono text-sm animate-pulse">SCANNING...</span>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className={`
                    px-5 py-3 border-b flex items-center justify-between
                    ${booking.priority === 'high' ? 'border-pink-500/30 bg-pink-500/10' : 'border-cyan-500/20 bg-cyan-500/5'}
                `}>
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-cyan-400 text-sm">#{booking.id}</span>
                        {booking.priority === 'high' && (
                            <span className="px-2 py-0.5 bg-pink-500/20 border border-pink-500/50 rounded text-pink-400 text-xs font-bold uppercase animate-pulse">
                                ⚡ Priority
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-cyan-400/70 font-mono text-sm">
                        <span className="material-symbols-outlined text-base">schedule</span>
                        {booking.pickupTime}
                    </div>
                </div>

                <div className="p-5">
                    {/* Target Info */}
                    <div className="flex items-center gap-4 mb-5">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-cyan-400 text-3xl">person_pin</span>
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                                <span className="text-[8px] text-white">✓</span>
                            </div>
                        </div>
                        <div className="flex-1">
                            <p className="text-white font-bold text-lg">{booking.firstName} {booking.lastName}</p>
                            <p className="text-cyan-400/60 font-mono text-sm flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">phone</span>
                                {booking.phone}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <a href={`tel:${booking.phone}`} className="w-12 h-12 rounded-lg bg-green-500/20 border border-green-500/50 flex items-center justify-center text-green-400 hover:bg-green-500/30 transition-colors">
                                <span className="material-symbols-outlined">call</span>
                            </a>
                            <button className="w-12 h-12 rounded-lg bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/30 transition-colors">
                                <span className="material-symbols-outlined">chat</span>
                            </button>
                        </div>
                    </div>

                    {/* Route Terminal Style */}
                    <div className="bg-slate-950/80 rounded-lg p-4 mb-5 border border-cyan-500/20 font-mono text-sm">
                        <div className="flex items-center gap-2 text-cyan-400/50 mb-3">
                            <span className="material-symbols-outlined text-base">terminal</span>
                            ROUTE_DATA
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <span className="text-green-400">[ORIGIN]</span>
                                <div>
                                    <p className="text-white">{booking.pickupLocation}</p>
                                    <p className="text-cyan-400/40 text-xs">LAT: 13.6900° | LNG: 100.7501°</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-cyan-400/30">
                                <span>├──</span>
                                <span className="animate-pulse">●</span>
                                <span>──</span>
                                <span className="text-amber-400">ETA: {booking.eta}</span>
                                <span>──</span>
                                <span className="animate-pulse">●</span>
                                <span>──┤</span>
                            </div>

                            <div className="flex items-start gap-3">
                                <span className="text-pink-400">[DEST.]</span>
                                <div>
                                    <p className="text-white">{booking.dropoffLocation}</p>
                                    <p className="text-cyan-400/40 text-xs">LAT: 13.7437° | LNG: 100.5116°</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        <DataDisplay label="Distance" value="32.5" unit="km" color="cyan" />
                        <DataDisplay label="Duration" value="45" unit="min" color="green" />
                        <DataDisplay label="Fare" value={`฿${booking.totalCost.toLocaleString()}`} color="amber" />
                    </div>

                    {/* Action */}
                    <div className="flex gap-3">
                        <button className="flex-1 py-3 rounded-lg bg-slate-800/50 border border-white/10 text-white/50 font-bold uppercase tracking-wider text-sm hover:bg-slate-800 hover:text-white/70 transition-colors">
                            Decline
                        </button>
                        <NeonButton color={booking.priority === 'high' ? 'pink' : 'cyan'} icon="play_arrow">
                            {booking.status === 'driver_assigned' ? 'Start Mission' : 'Navigate'}
                        </NeonButton>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PrototypeE() {
    const [isOnline, setIsOnline] = useState(true);
    const [time, setTime] = useState(new Date());
    const [systemStatus, setSystemStatus] = useState('OPERATIONAL');

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="min-h-screen relative text-white overflow-hidden">
            <CyberGrid />

            {/* Content */}
            <div className="relative z-10 p-5 pb-32">
                {/* Top HUD Bar */}
                <div className="flex items-center justify-between mb-6 font-mono text-sm">
                    <Link href="/driver" className="text-cyan-400/70 hover:text-cyan-400 transition-colors flex items-center gap-2">
                        <span className="material-symbols-outlined">arrow_back</span>
                        <span>EXIT</span>
                    </Link>

                    <div className="flex items-center gap-4 text-cyan-400/50">
                        <span className="animate-pulse">●</span>
                        <span>{time.toLocaleTimeString('en-US', { hour12: false })}</span>
                        <span>|</span>
                        <span className="text-green-400">{systemStatus}</span>
                    </div>

                    <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-400 text-xs">
                        v2.0.85
                    </span>
                </div>

                {/* Label */}
                <div className="text-center mb-6">
                    <span className="px-4 py-1.5 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold rounded-full font-mono">
                        🚀 PROTOTYPE E - NEO FUTURISTIC
                    </span>
                </div>

                {/* Driver HUD */}
                <div className="relative mb-8 p-6 rounded-xl bg-slate-900/60 backdrop-blur-xl border border-cyan-500/20">
                    <HUDCorner position="tl" />
                    <HUDCorner position="tr" />
                    <HUDCorner position="bl" />
                    <HUDCorner position="br" />

                    <div className="flex items-center gap-6">
                        {/* Avatar */}
                        <div className="relative">
                            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border-2 border-cyan-500/50 flex items-center justify-center">
                                <span className="material-symbols-outlined text-cyan-400 text-4xl">person</span>
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-slate-900 flex items-center justify-center ${
                                isOnline ? 'bg-green-500' : 'bg-slate-500'
                            }`}>
                                <span className="text-[10px]">{isOnline ? '✓' : '−'}</span>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                            <p className="text-cyan-400/50 text-xs font-mono uppercase tracking-widest mb-1">Driver ID: DRV-0847</p>
                            <h1 className="text-2xl font-bold mb-1">
                                <GlitchText>SOMCHAI J.</GlitchText>
                            </h1>
                            <p className="text-white/40 text-sm font-mono">Toyota Camry • กข-1234</p>
                        </div>

                        {/* Status Toggle */}
                        <div className="text-right">
                            <p className="text-cyan-400/50 text-xs font-mono uppercase mb-2">Status</p>
                            <button
                                onClick={() => setIsOnline(!isOnline)}
                                className={`
                                    px-6 py-2 rounded-lg font-bold uppercase tracking-wider text-sm
                                    border transition-all duration-300
                                    ${isOnline
                                        ? 'bg-green-500/20 border-green-500/50 text-green-400 shadow-lg shadow-green-500/20'
                                        : 'bg-slate-800/50 border-white/10 text-white/40'
                                    }
                                `}
                            >
                                {isOnline ? '● ONLINE' : '○ OFFLINE'}
                            </button>
                        </div>
                    </div>

                    {/* Stats Bar */}
                    <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-cyan-500/20">
                        {[
                            { label: 'Missions', value: '2', icon: 'assignment', color: 'cyan' },
                            { label: 'Completed', value: '147', icon: 'check_circle', color: 'green' },
                            { label: 'Earnings', value: '฿8.7K', icon: 'payments', color: 'amber' },
                            { label: 'Rating', value: '4.9', icon: 'star', color: 'pink' },
                        ].map((stat) => (
                            <div key={stat.label} className="text-center">
                                <span className={`material-symbols-outlined text-${stat.color}-400 mb-1`}>{stat.icon}</span>
                                <p className="text-xl font-bold font-mono text-white">{stat.value}</p>
                                <p className="text-white/30 text-xs uppercase tracking-wider">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section Header */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-cyan-400">radar</span>
                        <span className="font-mono text-cyan-400 uppercase tracking-widest">Active Missions</span>
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/50 to-transparent" />
                    <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded font-mono text-cyan-400 text-sm">
                        {mockBookings.length} PENDING
                    </span>
                </div>

                {/* Mission Cards */}
                <div className="space-y-5">
                    {mockBookings.map((booking, index) => (
                        <MissionCard key={booking.id} booking={booking} index={index} />
                    ))}
                </div>

                {/* System Log */}
                <div className="mt-8 p-4 rounded-lg bg-slate-950/80 border border-cyan-500/20 font-mono text-xs">
                    <div className="flex items-center gap-2 text-cyan-400/50 mb-3">
                        <span className="material-symbols-outlined text-sm">terminal</span>
                        SYSTEM_LOG
                    </div>
                    <div className="space-y-1 text-white/40">
                        <p><span className="text-green-400">[INFO]</span> Connection established</p>
                        <p><span className="text-cyan-400">[SYNC]</span> Real-time updates active</p>
                        <p><span className="text-amber-400">[ALERT]</span> 2 new missions assigned</p>
                        <p className="animate-pulse"><span className="text-white">{'>'}</span> Awaiting input..._</p>
                    </div>
                </div>
            </div>

            {/* Bottom Nav - Cyber Style */}
            <div className="fixed bottom-0 left-0 right-0 p-4">
                <div className="relative bg-slate-900/90 backdrop-blur-xl rounded-xl border border-cyan-500/30 p-2 flex justify-around">
                    <HUDCorner position="tl" />
                    <HUDCorner position="tr" />

                    {[
                        { icon: 'dashboard', label: 'HUB', active: true },
                        { icon: 'history', label: 'LOG', active: false },
                        { icon: 'settings', label: 'SYS', active: false },
                    ].map((item) => (
                        <button
                            key={item.label}
                            className={`
                                flex flex-col items-center py-2 px-8 rounded-lg font-mono text-xs uppercase tracking-wider
                                transition-all duration-300
                                ${item.active
                                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                    : 'text-white/30 hover:text-white/50'
                                }
                            `}
                        >
                            <span className="material-symbols-outlined mb-1">{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Custom Animations */}
            <style jsx>{`
                @keyframes scanDown {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(100%); }
                }
                @keyframes scanHorizontal {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                @keyframes glitch1 {
                    0%, 100% { transform: translate(0); }
                    20% { transform: translate(-2px, 2px); }
                    40% { transform: translate(-2px, -2px); }
                    60% { transform: translate(2px, 2px); }
                    80% { transform: translate(2px, -2px); }
                }
                @keyframes glitch2 {
                    0%, 100% { transform: translate(0); }
                    20% { transform: translate(2px, -2px); }
                    40% { transform: translate(2px, 2px); }
                    60% { transform: translate(-2px, -2px); }
                    80% { transform: translate(-2px, 2px); }
                }
                @keyframes neonPulse {
                    0%, 100% { opacity: 0; }
                    50% { opacity: 0.3; }
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(-30px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-scanDown { animation: scanDown 8s linear infinite; }
                .animate-scanHorizontal { animation: scanHorizontal 1.5s ease-in-out infinite; }
                .animate-glitch1 { animation: glitch1 0.3s ease-in-out infinite; }
                .animate-glitch2 { animation: glitch2 0.3s ease-in-out infinite 0.15s; }
                .animate-neonPulse { animation: neonPulse 2s ease-in-out infinite; }
                .animate-slideIn { animation: slideIn 0.5s ease-out forwards; }
            `}</style>
        </div>
    );
}
