'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// Mock data
const mockBookings = [
    {
        id: 'MSN-001',
        firstName: 'Alexander',
        lastName: 'Thompson',
        phone: '0891234567',
        pickupLocation: 'Suvarnabhumi Airport (BKK)',
        dropoffLocation: 'The Ritz-Carlton Bangkok',
        pickupDate: '29 DEC',
        pickupTime: '14:00',
        totalCost: 2500,
        distance: '35.2',
        duration: '45',
        status: 'driver_assigned',
        priority: 'high',
        coordinates: { pickup: '13.6900°N, 100.7501°E', dropoff: '13.7437°N, 100.5116°E' }
    },
    {
        id: 'MSN-002',
        firstName: 'Victoria',
        lastName: 'Chen',
        phone: '0899876543',
        pickupLocation: 'Mandarin Oriental',
        dropoffLocation: 'Don Mueang Airport (DMK)',
        pickupDate: '29 DEC',
        pickupTime: '18:30',
        totalCost: 1800,
        distance: '28.5',
        duration: '35',
        status: 'driver_en_route',
        priority: 'normal',
        coordinates: { pickup: '13.7245°N, 100.5147°E', dropoff: '13.9126°N, 100.6067°E' }
    },
];

// ===========================================
// CANVAS NEON CARS ANIMATION
// ===========================================
interface Car {
    x: number;
    y: number;
    speed: number;
    direction: 1 | -1;
    lane: number;
    color: string;
    trailLength: number;
    width: number;
    height: number;
}

function NeonCarsCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const carsRef = useRef<Car[]>([]);
    const animationRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const setCanvasSize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        setCanvasSize();
        window.addEventListener('resize', setCanvasSize);

        // Neon colors
        const neonColors = [
            '#22d3ee', // cyan
            '#e879f9', // fuchsia
            '#fbbf24', // gold
            '#34d399', // emerald
            '#f472b6', // pink
        ];

        // Initialize cars
        const initCars = () => {
            const cars: Car[] = [];
            const lanes = [
                { y: canvas.height * 0.55, direction: 1 as const },
                { y: canvas.height * 0.65, direction: -1 as const },
                { y: canvas.height * 0.75, direction: 1 as const },
                { y: canvas.height * 0.85, direction: -1 as const },
            ];

            lanes.forEach((lane, laneIndex) => {
                // 2-3 cars per lane
                const carsInLane = 2 + Math.floor(Math.random() * 2);
                for (let i = 0; i < carsInLane; i++) {
                    cars.push({
                        x: Math.random() * canvas.width,
                        y: lane.y,
                        speed: 1.5 + Math.random() * 2.5,
                        direction: lane.direction,
                        lane: laneIndex,
                        color: neonColors[Math.floor(Math.random() * neonColors.length)],
                        trailLength: 80 + Math.random() * 120,
                        width: 40 + Math.random() * 20,
                        height: 15 + Math.random() * 10,
                    });
                }
            });
            return cars;
        };

        carsRef.current = initCars();

        // Draw road lines
        const drawRoad = () => {
            if (!ctx || !canvas) return;

            // Perspective gradient for road
            const roadGradient = ctx.createLinearGradient(0, canvas.height * 0.5, 0, canvas.height);
            roadGradient.addColorStop(0, 'rgba(15, 23, 42, 0.3)');
            roadGradient.addColorStop(1, 'rgba(15, 23, 42, 0.8)');
            ctx.fillStyle = roadGradient;
            ctx.fillRect(0, canvas.height * 0.5, canvas.width, canvas.height * 0.5);

            // Road lines
            ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([30, 20]);

            [0.6, 0.7, 0.8].forEach(ratio => {
                ctx.beginPath();
                ctx.moveTo(0, canvas.height * ratio);
                ctx.lineTo(canvas.width, canvas.height * ratio);
                ctx.stroke();
            });

            ctx.setLineDash([]);
        };

        // Draw a single car with light trail
        const drawCar = (car: Car) => {
            if (!ctx) return;

            // Light trail (glow effect)
            const trailGradient = ctx.createLinearGradient(
                car.x - (car.direction === 1 ? car.trailLength : 0),
                0,
                car.x + (car.direction === -1 ? car.trailLength : 0),
                0
            );

            if (car.direction === 1) {
                trailGradient.addColorStop(0, 'transparent');
                trailGradient.addColorStop(1, car.color);
            } else {
                trailGradient.addColorStop(0, car.color);
                trailGradient.addColorStop(1, 'transparent');
            }

            ctx.fillStyle = trailGradient;
            ctx.globalAlpha = 0.4;

            if (car.direction === 1) {
                ctx.fillRect(car.x - car.trailLength, car.y - car.height / 4, car.trailLength, car.height / 2);
            } else {
                ctx.fillRect(car.x + car.width, car.y - car.height / 4, car.trailLength, car.height / 2);
            }

            ctx.globalAlpha = 1;

            // Car body (neon outline style)
            ctx.strokeStyle = car.color;
            ctx.lineWidth = 2;
            ctx.shadowColor = car.color;
            ctx.shadowBlur = 15;

            // Simple car shape
            ctx.beginPath();
            ctx.moveTo(car.x, car.y);
            ctx.lineTo(car.x + car.width * 0.2, car.y - car.height * 0.6);
            ctx.lineTo(car.x + car.width * 0.7, car.y - car.height * 0.6);
            ctx.lineTo(car.x + car.width, car.y);
            ctx.lineTo(car.x, car.y);
            ctx.stroke();

            // Bottom line
            ctx.beginPath();
            ctx.moveTo(car.x, car.y);
            ctx.lineTo(car.x + car.width, car.y);
            ctx.stroke();

            // Headlights/Taillights
            ctx.fillStyle = car.direction === 1 ? '#ffffff' : '#ef4444';
            ctx.shadowColor = car.direction === 1 ? '#ffffff' : '#ef4444';
            ctx.shadowBlur = 20;

            const lightX = car.direction === 1 ? car.x + car.width - 3 : car.x + 3;
            ctx.beginPath();
            ctx.arc(lightX, car.y - car.height * 0.2, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;

            // Reflection on road
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = car.color;
            ctx.fillRect(car.x, car.y + 5, car.width, car.height * 0.3);
            ctx.globalAlpha = 1;
        };

        // Animation loop
        const animate = () => {
            if (!ctx || !canvas) return;

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw road
            drawRoad();

            // Update and draw cars
            carsRef.current.forEach(car => {
                // Move car
                car.x += car.speed * car.direction;

                // Wrap around
                if (car.direction === 1 && car.x > canvas.width + car.trailLength) {
                    car.x = -car.width;
                } else if (car.direction === -1 && car.x < -car.width - car.trailLength) {
                    car.x = canvas.width;
                }

                drawCar(car);
            });

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', setCanvasSize);
            cancelAnimationFrame(animationRef.current);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0"
            style={{ background: 'transparent' }}
        />
    );
}

// ===========================================
// SYNTHWAVE BACKGROUND (Sun + Grid)
// ===========================================
function SynthwaveBackground() {
    return (
        <div className="fixed inset-0 overflow-hidden z-0">
            {/* Deep space gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0014] via-[#0d0020] to-[#050510]" />

            {/* Animated gradient mesh */}
            <div className="absolute inset-0">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-fuchsia-900/10 via-transparent to-cyan-900/10 animate-meshSlow" />
            </div>

            {/* Retro Sun (smaller, top right) */}
            <div className="absolute top-16 right-16">
                <div className="relative w-32 h-32">
                    {/* Outer glow */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-b from-orange-500/30 via-fuchsia-500/20 to-purple-500/10 blur-2xl animate-pulse" />
                    {/* Sun circle with scan lines */}
                    <div className="absolute inset-4 rounded-full bg-gradient-to-b from-orange-400 via-fuchsia-500 to-purple-600 overflow-hidden opacity-80">
                        <div className="absolute inset-0" style={{
                            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.4) 3px, rgba(0,0,0,0.4) 6px)',
                        }} />
                    </div>
                </div>
            </div>

            {/* Cyber Grid overlay (from E) */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                    backgroundImage: `
                        linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '60px 60px',
                }} />
            </div>

            {/* Scan line overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
            }} />

            {/* Horizontal scan beam */}
            <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent animate-scanBeam" />

            {/* Corner chrome accents */}
            <div className="absolute top-0 left-0 w-24 h-24">
                <div className="absolute top-4 left-4 w-16 h-[1px] bg-gradient-to-r from-cyan-400/50 to-transparent" />
                <div className="absolute top-4 left-4 w-[1px] h-16 bg-gradient-to-b from-cyan-400/50 to-transparent" />
            </div>
            <div className="absolute bottom-0 right-0 w-24 h-24">
                <div className="absolute bottom-4 right-4 w-16 h-[1px] bg-gradient-to-l from-fuchsia-400/50 to-transparent" />
                <div className="absolute bottom-4 right-4 w-[1px] h-16 bg-gradient-to-t from-fuchsia-400/50 to-transparent" />
            </div>
        </div>
    );
}

// ===========================================
// HUD CORNER COMPONENT (from E)
// ===========================================
function HUDCorner({ position, color = 'cyan' }: { position: 'tl' | 'tr' | 'bl' | 'br'; color?: 'cyan' | 'fuchsia' | 'gold' }) {
    const positions = {
        tl: 'top-0 left-0 border-t-2 border-l-2',
        tr: 'top-0 right-0 border-t-2 border-r-2',
        bl: 'bottom-0 left-0 border-b-2 border-l-2',
        br: 'bottom-0 right-0 border-b-2 border-r-2',
    };
    const colors = {
        cyan: 'border-cyan-400/50',
        fuchsia: 'border-fuchsia-400/50',
        gold: 'border-amber-400/50',
    };

    return <div className={`absolute w-4 h-4 ${positions[position]} ${colors[color]}`} />;
}

// ===========================================
// GLITCH CHROME TEXT (Combined G + E)
// ===========================================
function GlitchChromeText({ children, variant = 'chrome', size = 'base', className = '' }: {
    children: string;
    variant?: 'chrome' | 'gold' | 'neon-cyan' | 'neon-pink';
    size?: 'sm' | 'base' | 'lg' | 'xl' | '2xl';
    className?: string;
}) {
    const [isGlitching, setIsGlitching] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsGlitching(true);
            setTimeout(() => setIsGlitching(false), 200);
        }, 5000 + Math.random() * 3000);
        return () => clearInterval(interval);
    }, []);

    const variants = {
        chrome: 'bg-gradient-to-b from-white via-slate-300 to-slate-500 bg-clip-text text-transparent',
        gold: 'bg-gradient-to-b from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent',
        'neon-cyan': 'text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]',
        'neon-pink': 'text-fuchsia-400 drop-shadow-[0_0_10px_rgba(232,121,249,0.8)]',
    };

    const sizes = {
        sm: 'text-sm',
        base: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
        '2xl': 'text-2xl',
    };

    return (
        <span className={`relative inline-block font-bold ${variants[variant]} ${sizes[size]} ${className}`}>
            <span className="relative z-10">{children}</span>
            {isGlitching && (
                <>
                    <span className="absolute top-0 left-0 -ml-0.5 text-cyan-400 opacity-70 animate-glitch1" aria-hidden>{children}</span>
                    <span className="absolute top-0 left-0 ml-0.5 text-pink-400 opacity-70 animate-glitch2" aria-hidden>{children}</span>
                </>
            )}
        </span>
    );
}

// ===========================================
// GLASS HUD CARD (Combined)
// ===========================================
function GlassHUDCard({ children, variant = 'default', className = '' }: {
    children: React.ReactNode;
    variant?: 'default' | 'priority' | 'gold';
    className?: string;
}) {
    const borderColors = {
        default: 'border-cyan-500/30',
        priority: 'border-fuchsia-500/40',
        gold: 'border-amber-400/40',
    };

    return (
        <div className={`relative ${className}`}>
            {/* Glass panel */}
            <div className={`
                relative rounded-xl overflow-hidden
                bg-black/40 backdrop-blur-xl
                border ${borderColors[variant]}
                shadow-[0_0_30px_rgba(0,0,0,0.5)]
            `}>
                {/* HUD Corners */}
                <HUDCorner position="tl" color={variant === 'priority' ? 'fuchsia' : variant === 'gold' ? 'gold' : 'cyan'} />
                <HUDCorner position="tr" color={variant === 'priority' ? 'fuchsia' : variant === 'gold' ? 'gold' : 'cyan'} />
                <HUDCorner position="bl" color={variant === 'priority' ? 'fuchsia' : variant === 'gold' ? 'gold' : 'cyan'} />
                <HUDCorner position="br" color={variant === 'priority' ? 'fuchsia' : variant === 'gold' ? 'gold' : 'cyan'} />

                {/* Holographic shine */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 pointer-events-none" />

                {/* Scan effect */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent animate-scanDown" />
                </div>

                {children}
            </div>
        </div>
    );
}

// ===========================================
// TERMINAL BUTTON (Combined style)
// ===========================================
function TerminalButton({ children, color = 'cyan', icon, onClick, className = '' }: {
    children: React.ReactNode;
    color?: 'cyan' | 'pink' | 'gold' | 'green';
    icon?: string;
    onClick?: () => void;
    className?: string;
}) {
    const colors = {
        cyan: 'from-cyan-500 to-blue-600 shadow-cyan-500/30 hover:shadow-cyan-500/50',
        pink: 'from-fuchsia-500 to-purple-600 shadow-fuchsia-500/30 hover:shadow-fuchsia-500/50',
        gold: 'from-amber-500 to-orange-600 shadow-amber-500/30 hover:shadow-amber-500/50',
        green: 'from-emerald-500 to-green-600 shadow-emerald-500/30 hover:shadow-emerald-500/50',
    };

    return (
        <button
            onClick={onClick}
            className={`
                relative overflow-hidden px-6 py-3 rounded-lg
                bg-gradient-to-r ${colors[color]}
                text-white font-bold uppercase tracking-wider text-sm
                shadow-lg hover:shadow-xl transition-all duration-300
                hover:scale-[1.02] active:scale-95
                border border-white/20
                ${className}
            `}
        >
            <div className="absolute inset-0 bg-white/20 animate-neonPulse" />
            <span className="relative flex items-center justify-center gap-2 font-mono">
                {icon && <span className="material-symbols-outlined">{icon}</span>}
                {children}
            </span>
        </button>
    );
}

// ===========================================
// MISSION CARD (Combined style)
// ===========================================
function MissionCard({ booking, index }: { booking: typeof mockBookings[0]; index: number }) {
    const [isScanning, setIsScanning] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsScanning(false), 1500 + index * 300);
        return () => clearTimeout(timer);
    }, [index]);

    const isPriority = booking.priority === 'high';

    return (
        <div className="animate-slideIn" style={{ animationDelay: `${index * 150}ms` }}>
            <GlassHUDCard variant={isPriority ? 'priority' : 'default'}>
                {/* Scanning overlay */}
                {isScanning && (
                    <div className="absolute inset-0 z-20 pointer-events-none rounded-xl overflow-hidden">
                        <div className="absolute inset-0 bg-cyan-500/10" />
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scanHorizontal" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-cyan-400 font-mono text-sm animate-pulse">[SCANNING...]</span>
                        </div>
                    </div>
                )}

                {/* Priority Banner */}
                {isPriority && (
                    <div className="px-4 py-2 bg-gradient-to-r from-fuchsia-500/20 via-rose-500/20 to-fuchsia-500/20 border-b border-fuchsia-500/30">
                        <div className="flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-amber-400 text-sm animate-pulse">bolt</span>
                            <GlitchChromeText variant="gold" size="sm">PRIORITY MISSION</GlitchChromeText>
                            <span className="material-symbols-outlined text-amber-400 text-sm animate-pulse">bolt</span>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className={`px-5 py-3 border-b ${isPriority ? 'border-fuchsia-500/20' : 'border-cyan-500/20'} flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-cyan-400 text-sm">[{booking.id}]</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-mono uppercase ${
                            booking.status === 'driver_assigned'
                                ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300'
                                : 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300'
                        }`}>
                            {booking.status === 'driver_assigned' ? 'ASSIGNED' : 'EN_ROUTE'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-amber-400/70 font-mono text-sm">
                        <span className="material-symbols-outlined text-base">schedule</span>
                        {booking.pickupTime}
                    </div>
                </div>

                <div className="p-5">
                    {/* Customer Info */}
                    <div className="flex items-center gap-4 mb-5">
                        <div className="relative">
                            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 border border-cyan-500/30 flex items-center justify-center">
                                <span className="text-cyan-400 text-xl font-bold">{booking.firstName.charAt(0)}</span>
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-black flex items-center justify-center">
                                <span className="text-[8px] text-white">✓</span>
                            </div>
                        </div>
                        <div className="flex-1">
                            <p className="text-white font-bold">{booking.firstName} {booking.lastName}</p>
                            <p className="text-cyan-400/50 font-mono text-sm">{booking.phone}</p>
                        </div>
                        <div className="flex gap-2">
                            <a href={`tel:${booking.phone}`} className="w-11 h-11 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/30 transition-all">
                                <span className="material-symbols-outlined text-xl">call</span>
                            </a>
                        </div>
                    </div>

                    {/* Terminal Route Display */}
                    <div className="bg-black/50 rounded-lg p-4 mb-5 border border-cyan-500/20 font-mono text-sm">
                        <div className="flex items-center gap-2 text-cyan-400/40 mb-3">
                            <span className="material-symbols-outlined text-sm">terminal</span>
                            ROUTE_DATA
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <span className="text-emerald-400">[ORIGIN]</span>
                                <div className="flex-1">
                                    <p className="text-white">{booking.pickupLocation}</p>
                                    <p className="text-cyan-400/30 text-xs">{booking.coordinates.pickup}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-cyan-400/20 px-2">
                                <span>├──</span>
                                <span className="animate-pulse text-amber-400">●</span>
                                <span className="text-amber-400/60">{booking.distance}km | {booking.duration}min</span>
                                <span className="animate-pulse text-amber-400">●</span>
                                <span>──┤</span>
                            </div>

                            <div className="flex items-start gap-3">
                                <span className="text-fuchsia-400">[DEST.]</span>
                                <div className="flex-1">
                                    <p className="text-white">{booking.dropoffLocation}</p>
                                    <p className="text-cyan-400/30 text-xs">{booking.coordinates.dropoff}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        {[
                            { label: 'DISTANCE', value: booking.distance, unit: 'km', color: 'cyan' },
                            { label: 'ETA', value: booking.duration, unit: 'min', color: 'amber' },
                            { label: 'FARE', value: `฿${booking.totalCost.toLocaleString()}`, unit: '', color: 'emerald' },
                        ].map((stat) => (
                            <div key={stat.label} className={`relative border border-${stat.color}-400/20 bg-black/30 rounded-lg p-3`}>
                                <HUDCorner position="tl" color="cyan" />
                                <HUDCorner position="br" color="cyan" />
                                <p className="text-white/30 text-xs uppercase tracking-wider mb-1 font-mono">{stat.label}</p>
                                <p className={`text-lg font-bold font-mono text-${stat.color}-400`}>
                                    {stat.value}<span className="text-xs ml-1 opacity-60">{stat.unit}</span>
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button className="flex-1 py-3 rounded-lg bg-white/5 border border-white/10 text-white/40 font-bold uppercase tracking-wider text-sm font-mono hover:bg-white/10 hover:text-white/60 transition-all">
                            [ DECLINE ]
                        </button>
                        <TerminalButton color={isPriority ? 'gold' : 'cyan'} icon="play_arrow" className="flex-[2]">
                            {booking.status === 'driver_assigned' ? '[ START ]' : '[ NAVIGATE ]'}
                        </TerminalButton>
                    </div>
                </div>
            </GlassHUDCard>
        </div>
    );
}

// ===========================================
// SYSTEM LOG (from E)
// ===========================================
function SystemLog() {
    const logs = [
        { type: 'INFO', color: 'text-emerald-400', message: 'System initialized' },
        { type: 'SYNC', color: 'text-cyan-400', message: 'Real-time connection active' },
        { type: 'ALERT', color: 'text-amber-400', message: '2 new missions queued' },
    ];

    return (
        <GlassHUDCard className="mt-6">
            <div className="p-4 font-mono text-xs">
                <div className="flex items-center gap-2 text-cyan-400/50 mb-3">
                    <span className="material-symbols-outlined text-sm">terminal</span>
                    SYSTEM_LOG
                </div>
                <div className="space-y-1 text-white/40">
                    {logs.map((log, i) => (
                        <p key={i}><span className={log.color}>[{log.type}]</span> {log.message}</p>
                    ))}
                    <p className="animate-pulse"><span className="text-white">{'>'}</span> Awaiting input..._</p>
                </div>
            </div>
        </GlassHUDCard>
    );
}

// ===========================================
// MAIN COMPONENT
// ===========================================
export default function PrototypeH() {
    const [isOnline, setIsOnline] = useState(true);
    const [time, setTime] = useState('');

    useEffect(() => {
        const updateTime = () => {
            setTime(new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }));
        };
        updateTime();
        const timer = setInterval(updateTime, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="min-h-screen text-white relative overflow-hidden">
            {/* Background layers */}
            <SynthwaveBackground />
            <NeonCarsCanvas />

            {/* Content */}
            <div className="relative z-10 min-h-screen pb-32">
                {/* Top HUD Bar */}
                <div className="sticky top-0 z-20 backdrop-blur-xl bg-black/40 border-b border-cyan-500/20">
                    <div className="px-5 py-3">
                        <div className="flex items-center justify-between font-mono text-sm">
                            <Link href="/driver" className="text-cyan-400/70 hover:text-cyan-400 transition-colors flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">arrow_back</span>
                                <span>EXIT</span>
                            </Link>

                            <div className="flex items-center gap-3">
                                <span className="px-3 py-1 bg-gradient-to-r from-fuchsia-500/20 to-cyan-500/20 border border-fuchsia-500/30 rounded text-xs">
                                    <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-400 bg-clip-text text-transparent font-bold">
                                        PROTOTYPE H
                                    </span>
                                </span>
                            </div>

                            <div className="flex items-center gap-3 text-cyan-400/50">
                                <span className="animate-pulse text-emerald-400">●</span>
                                <span>{time}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-5">
                    {/* Driver HUD Panel (Glass) */}
                    <GlassHUDCard variant="gold" className="mb-6">
                        <div className="p-5">
                            <div className="flex items-center gap-5">
                                {/* Avatar */}
                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/30 to-fuchsia-500/30 rounded-xl blur-lg animate-pulse" />
                                    <div className="relative w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 border-2 border-cyan-500/50 flex items-center justify-center text-cyan-400 text-2xl font-bold">
                                        S
                                    </div>
                                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-black flex items-center justify-center ${isOnline ? 'bg-emerald-500' : 'bg-slate-500'}`}>
                                        <span className="text-[10px]">{isOnline ? '✓' : '−'}</span>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="flex-1">
                                    <p className="text-cyan-400/50 text-xs font-mono uppercase tracking-widest mb-1">DRIVER_ID: DRV-0847</p>
                                    <h1 className="text-xl font-bold">
                                        <GlitchChromeText variant="chrome">SOMCHAI J.</GlitchChromeText>
                                    </h1>
                                    <p className="text-white/30 text-sm font-mono">Toyota Camry • กข-1234</p>
                                </div>

                                {/* Status Toggle */}
                                <button
                                    onClick={() => setIsOnline(!isOnline)}
                                    className={`
                                        px-5 py-2 rounded-lg font-bold uppercase tracking-wider text-sm font-mono
                                        border transition-all duration-300
                                        ${isOnline
                                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-500/20'
                                            : 'bg-white/5 border-white/20 text-white/40'
                                        }
                                    `}
                                >
                                    {isOnline ? '● ONLINE' : '○ OFFLINE'}
                                </button>
                            </div>

                            {/* Stats Bar */}
                            <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-cyan-500/20">
                                {[
                                    { label: 'MISSIONS', value: '2', icon: 'assignment', color: 'text-cyan-400' },
                                    { label: 'COMPLETED', value: '147', icon: 'check_circle', color: 'text-emerald-400' },
                                    { label: 'EARNINGS', value: '฿8.7K', icon: 'payments', color: 'text-amber-400' },
                                    { label: 'RATING', value: '4.9', icon: 'star', color: 'text-fuchsia-400' },
                                ].map((stat) => (
                                    <div key={stat.label} className="text-center">
                                        <span className={`material-symbols-outlined ${stat.color} mb-1`}>{stat.icon}</span>
                                        <p className="text-lg font-bold font-mono text-white">{stat.value}</p>
                                        <p className="text-white/30 text-xs uppercase tracking-wider">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </GlassHUDCard>

                    {/* Section Header */}
                    <div className="flex items-center gap-4 mb-5">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-cyan-400">radar</span>
                            <span className="font-mono text-cyan-400 uppercase tracking-widest text-sm">Active Missions</span>
                        </div>
                        <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/50 to-transparent" />
                        <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded font-mono text-cyan-400 text-xs">
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
                    <SystemLog />
                </div>

                {/* Bottom Navigation */}
                <div className="fixed bottom-0 left-0 right-0 p-4 z-20">
                    <div className="relative">
                        <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/10 via-fuchsia-500/10 to-cyan-500/10 rounded-2xl blur-xl" />
                        <div className="relative bg-black/80 backdrop-blur-xl rounded-xl border border-cyan-500/30 p-2 flex justify-around">
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
                </div>
            </div>

            {/* Custom Animations */}
            <style jsx>{`
                @keyframes meshSlow {
                    0%, 100% { transform: translate(0, 0) rotate(0deg); }
                    50% { transform: translate(-2%, 2%) rotate(0.5deg); }
                }
                @keyframes scanBeam {
                    0% { top: -2px; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                @keyframes scanDown {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(2000%); }
                }
                @keyframes scanHorizontal {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
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
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-meshSlow { animation: meshSlow 20s ease-in-out infinite; }
                .animate-scanBeam { animation: scanBeam 8s linear infinite; }
                .animate-scanDown { animation: scanDown 4s linear infinite; }
                .animate-scanHorizontal { animation: scanHorizontal 1.5s ease-in-out infinite; }
                .animate-glitch1 { animation: glitch1 0.3s ease-in-out infinite; }
                .animate-glitch2 { animation: glitch2 0.3s ease-in-out infinite 0.15s; }
                .animate-neonPulse { animation: neonPulse 2s ease-in-out infinite; }
                .animate-slideIn { animation: slideIn 0.5s ease-out forwards; opacity: 0; }
            `}</style>
        </div>
    );
}
