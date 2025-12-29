'use client';

import { useEffect, useState, useMemo } from 'react';
import { FirestoreService } from '@/lib/firebase/firestore';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { getTimestampSeconds } from '@/lib/constants';
import Link from 'next/link';

// Mini Sparkline Chart Component
function SparklineChart({ data, color, height = 40 }: { data: number[], color: string, height?: number }) {
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;

    const points = data.map((value, index) => {
        const x = (index / (data.length - 1)) * 100;
        const y = height - ((value - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width="100%" height={height} className="overflow-visible">
            <defs>
                <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
            />
            <polygon
                fill={`url(#gradient-${color})`}
                points={`0,${height} ${points} 100,${height}`}
            />
        </svg>
    );
}

// Progress Ring Component
function ProgressRing({ progress, size = 60, strokeWidth = 6, color = '#3B82F6' }: { progress: number, size?: number, strokeWidth?: number, color?: string }) {
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
                stroke="#E5E7EB"
                strokeWidth={strokeWidth}
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-500"
            />
        </svg>
    );
}

export default function AdminDashboardPage() {
    const { t, language } = useLanguage();
    const [stats, setStats] = useState({
        totalBookings: 0,
        totalRevenue: 0,
        pendingBookings: 0,
        activeVehicles: 0,
        confirmedBookings: 0,
        completedBookings: 0
    });
    const [recentBookings, setRecentBookings] = useState<any[]>([]);
    const [allBookings, setAllBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Generate sparkline data from bookings
    const revenueChartData = useMemo(() => {
        if (allBookings.length === 0) return [0, 0, 0, 0, 0, 0, 0];

        const last7Days = Array(7).fill(0);
        const now = new Date();

        allBookings.forEach(booking => {
            if (booking.createdAt?.seconds && booking.status !== 'cancelled') {
                const bookingDate = new Date(booking.createdAt.seconds * 1000);
                const daysDiff = Math.floor((now.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24));
                if (daysDiff >= 0 && daysDiff < 7) {
                    last7Days[6 - daysDiff] += Number(booking.totalCost) || 0;
                }
            }
        });

        return last7Days;
    }, [allBookings]);

    const bookingsChartData = useMemo(() => {
        if (allBookings.length === 0) return [0, 0, 0, 0, 0, 0, 0];

        const last7Days = Array(7).fill(0);
        const now = new Date();

        allBookings.forEach(booking => {
            if (booking.createdAt?.seconds) {
                const bookingDate = new Date(booking.createdAt.seconds * 1000);
                const daysDiff = Math.floor((now.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24));
                if (daysDiff >= 0 && daysDiff < 7) {
                    last7Days[6 - daysDiff]++;
                }
            }
        });

        return last7Days;
    }, [allBookings]);

    useEffect(() => {
        let unsubscribeBookings = () => { };

        const fetchData = async () => {
            try {
                const allVehicles = await FirestoreService.getVehicles();

                unsubscribeBookings = FirestoreService.subscribeToAllBookings((bookings) => {
                    const totalBookings = bookings.length;
                    const totalRevenue = bookings.reduce((sum, b) => {
                        if (b.status !== 'cancelled') {
                            return sum + (Number(b.totalCost) || 0);
                        }
                        return sum;
                    }, 0);
                    const pendingBookings = bookings.filter(b => b.status === 'pending').length;
                    const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
                    const completedBookings = bookings.filter(b => b.status === 'completed').length;

                    setStats({
                        totalBookings,
                        totalRevenue,
                        pendingBookings,
                        activeVehicles: allVehicles.length,
                        confirmedBookings,
                        completedBookings
                    });

                    setAllBookings(bookings);
                    const sorted = [...bookings].sort((a, b) => getTimestampSeconds(b.createdAt) - getTimestampSeconds(a.createdAt));
                    setRecentBookings(sorted.slice(0, 6));
                    setLoading(false);
                });

            } catch (error) {
                console.error("Failed to load admin stats", error);
                setLoading(false);
            }
        };

        fetchData();
        return () => unsubscribeBookings();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-blue-200 rounded-full"></div>
                        <div className="w-12 h-12 border-4 border-blue-600 rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
                    </div>
                    <p className="text-gray-500 font-medium">{t.common.loading}</p>
                </div>
            </div>
        );
    }

    const completionRate = stats.totalBookings > 0
        ? Math.round((stats.completedBookings / stats.totalBookings) * 100)
        : 0;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">{t.admin.title}</h1>
                    <p className="text-sm text-gray-500 mt-1">{t.admin.dashboard.subtitle}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                        <span className="material-symbols-outlined text-lg">download</span>
                        {t.admin.dashboard.export}
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-sm font-medium text-white hover:shadow-lg hover:shadow-blue-500/30 transition-all">
                        <span className="material-symbols-outlined text-lg">add</span>
                        {t.admin.dashboard.newBooking}
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Revenue */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <span className="material-symbols-outlined text-white">account_balance_wallet</span>
                        </div>
                        <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            <span className="material-symbols-outlined text-sm">trending_up</span>
                            +12.5%
                        </span>
                    </div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{t.admin.dashboard.stats.totalRevenue}</p>
                    <p className="text-2xl font-bold text-gray-800">฿{stats.totalRevenue.toLocaleString()}</p>
                    <div className="mt-3 h-10">
                        <SparklineChart data={revenueChartData} color="#3B82F6" />
                    </div>
                </div>

                {/* Total Bookings */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                            <span className="material-symbols-outlined text-white">confirmation_number</span>
                        </div>
                        <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            <span className="material-symbols-outlined text-sm">trending_up</span>
                            +8.2%
                        </span>
                    </div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{t.admin.dashboard.stats.totalBookings}</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.totalBookings}</p>
                    <div className="mt-3 h-10">
                        <SparklineChart data={bookingsChartData} color="#10B981" />
                    </div>
                </div>

                {/* Pending Bookings */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                            <span className="material-symbols-outlined text-white">pending_actions</span>
                        </div>
                        {stats.pendingBookings > 0 && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-full animate-pulse">
                                <span className="material-symbols-outlined text-sm">priority_high</span>
                                {t.admin.dashboard.stats.needsAction}
                            </span>
                        )}
                    </div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{t.admin.dashboard.stats.pending}</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.pendingBookings}</p>
                    <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                                style={{ width: `${stats.totalBookings > 0 ? (stats.pendingBookings / stats.totalBookings) * 100 : 0}%` }}
                            ></div>
                        </div>
                        <span className="text-xs text-gray-500">{stats.totalBookings > 0 ? Math.round((stats.pendingBookings / stats.totalBookings) * 100) : 0}%</span>
                    </div>
                </div>

                {/* Active Vehicles */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                            <span className="material-symbols-outlined text-white">directions_car</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {t.admin.dashboard.stats.fleet}
                        </span>
                    </div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{t.admin.dashboard.stats.totalVehicles}</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.activeVehicles}</p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                        <span className="material-symbols-outlined text-sm text-green-500">check_circle</span>
                        {t.admin.dashboard.stats.allVehiclesReady}
                    </div>
                </div>
            </div>

            {/* Charts & Analytics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Revenue Overview Chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-semibold text-gray-800">{t.admin.dashboard.charts.revenueOverview}</h3>
                            <p className="text-sm text-gray-500">{t.admin.dashboard.charts.last7DaysPerformance}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg">7D</button>
                            <button className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg">30D</button>
                            <button className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg">90D</button>
                        </div>
                    </div>

                    {/* Chart Area */}
                    <div className="h-48 flex items-end justify-between gap-2 px-4">
                        {revenueChartData.map((value, index) => {
                            const maxValue = Math.max(...revenueChartData, 1);
                            const heightPercent = (value / maxValue) * 100;
                            const days = t.admin.dashboard.charts.days;
                            return (
                                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                                    <div className="w-full relative group">
                                        <div
                                            className="w-full bg-gradient-to-t from-blue-500 to-indigo-500 rounded-t-lg transition-all duration-300 hover:from-blue-600 hover:to-indigo-600 cursor-pointer"
                                            style={{ height: `${Math.max(heightPercent, 8)}%`, minHeight: '12px' }}
                                        ></div>
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                            ฿{value.toLocaleString()}
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-400">{days[index]}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Booking Stats Ring */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-gray-800">{t.admin.dashboard.charts.successRate}</h3>
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                            <span className="material-symbols-outlined text-lg">more_horiz</span>
                        </button>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="relative">
                            <ProgressRing progress={completionRate} size={140} strokeWidth={12} color="#3B82F6" />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-bold text-gray-800">{completionRate}%</span>
                                <span className="text-xs text-gray-500">{t.admin.dashboard.charts.completed}</span>
                            </div>
                        </div>

                        <div className="mt-6 w-full space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                    <span className="text-sm text-gray-600">{t.admin.dashboard.charts.completed}</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-800">{stats.completedBookings}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    <span className="text-sm text-gray-600">{t.admin.dashboard.charts.confirmed}</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-800">{stats.confirmedBookings}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                    <span className="text-sm text-gray-600">{t.admin.dashboard.stats.pending}</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-800">{stats.pendingBookings}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Bookings Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="font-semibold text-gray-800">{t.admin.dashboard.recentBookings.title}</h3>
                        <p className="text-sm text-gray-500">{t.admin.dashboard.recentBookings.subtitle}</p>
                    </div>
                    <Link
                        href="/admin/bookings"
                        className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                        {t.admin.dashboard.recentBookings.viewAll}
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </Link>
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/80">
                            <tr>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.admin.dashboard.recentBookings.table.customer}</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.admin.dashboard.recentBookings.table.vehicle}</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.admin.dashboard.recentBookings.table.date}</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.admin.dashboard.recentBookings.table.amount}</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.admin.dashboard.recentBookings.table.status}</th>
                                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.admin.dashboard.recentBookings.table.action}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {recentBookings.map((b) => (
                                <tr key={b.id} className="hover:bg-blue-50/50 transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm">
                                                {(b.firstName || 'G').charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800">{b.firstName || 'Guest'} {b.lastName}</p>
                                                <p className="text-xs text-gray-500">{b.email || 'No email'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <p className="text-gray-800">{b.vehicle?.name || 'Unknown'}</p>
                                        <p className="text-xs text-gray-500">{b.vehicle?.type || 'Vehicle'}</p>
                                    </td>
                                    <td className="px-5 py-4">
                                        <p className="text-gray-800">
                                            {b.createdAt?.seconds
                                                ? new Date(b.createdAt.seconds * 1000).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { month: 'short', day: 'numeric' })
                                                : 'N/A'
                                            }
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {b.createdAt?.seconds
                                                ? new Date(b.createdAt.seconds * 1000).toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit' })
                                                : ''
                                            }
                                        </p>
                                    </td>
                                    <td className="px-5 py-4">
                                        <p className="font-semibold text-gray-800">฿{b.totalCost?.toLocaleString()}</p>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`
                                            inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
                                            ${b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                              b.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                              b.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                              b.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                              'bg-gray-100 text-gray-600'
                                            }
                                        `}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                b.status === 'confirmed' ? 'bg-green-500' :
                                                b.status === 'pending' ? 'bg-amber-500' :
                                                b.status === 'completed' ? 'bg-blue-500' :
                                                b.status === 'cancelled' ? 'bg-red-500' :
                                                'bg-gray-500'
                                            }`}></span>
                                            {b.status?.charAt(0).toUpperCase() + b.status?.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <button className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                                            <span className="material-symbols-outlined text-lg">more_vert</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-gray-100">
                    {recentBookings.map((b) => (
                        <div key={b.id} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold">
                                        {(b.firstName || 'G').charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-800">{b.firstName || 'Guest'} {b.lastName}</p>
                                        <p className="text-xs text-gray-500">{b.vehicle?.name || 'Unknown Vehicle'}</p>
                                    </div>
                                </div>
                                <span className={`
                                    px-2 py-1 rounded-full text-xs font-semibold
                                    ${b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                      b.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                      b.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                      'bg-gray-100 text-gray-600'
                                    }
                                `}>
                                    {b.status}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">
                                    {b.createdAt?.seconds
                                        ? new Date(b.createdAt.seconds * 1000).toLocaleDateString()
                                        : 'N/A'
                                    }
                                </span>
                                <span className="font-semibold text-gray-800">฿{b.totalCost?.toLocaleString()}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {recentBookings.length === 0 && (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl text-gray-400">inbox</span>
                        </div>
                        <p className="text-gray-500">{t.admin.dashboard.recentBookings.noBookings}</p>
                        <p className="text-sm text-gray-400 mt-1">{t.admin.dashboard.recentBookings.noBookingsDesc}</p>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Link href="/admin/bookings" className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all group">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                        <span className="material-symbols-outlined text-blue-600">receipt_long</span>
                    </div>
                    <p className="font-medium text-gray-800">{t.admin.dashboard.quickActions.manageBookings}</p>
                    <p className="text-xs text-gray-500 mt-1">{t.admin.dashboard.quickActions.viewAndUpdate}</p>
                </Link>

                <Link href="/admin/vehicles" className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-green-200 transition-all group">
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-green-100 transition-colors">
                        <span className="material-symbols-outlined text-green-600">directions_car</span>
                    </div>
                    <p className="font-medium text-gray-800">{t.admin.dashboard.quickActions.manageVehicles}</p>
                    <p className="text-xs text-gray-500 mt-1">{t.admin.dashboard.quickActions.addOrEdit}</p>
                </Link>

                <Link href="/admin/locations" className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-purple-200 transition-all group">
                    <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-purple-100 transition-colors">
                        <span className="material-symbols-outlined text-purple-600">location_on</span>
                    </div>
                    <p className="font-medium text-gray-800">{t.admin.dashboard.quickActions.locations}</p>
                    <p className="text-xs text-gray-500 mt-1">{t.admin.dashboard.quickActions.manageServiceAreas}</p>
                </Link>

                <Link href="/admin/routes" className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-amber-200 transition-all group">
                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-amber-100 transition-colors">
                        <span className="material-symbols-outlined text-amber-600">route</span>
                    </div>
                    <p className="font-medium text-gray-800">{t.admin.dashboard.quickActions.routePricing}</p>
                    <p className="text-xs text-gray-500 mt-1">{t.admin.dashboard.quickActions.setPricesByRoute}</p>
                </Link>
            </div>
        </div>
    );
}
