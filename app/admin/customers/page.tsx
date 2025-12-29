'use client';

import { useEffect, useState, useMemo } from 'react';
import { FirestoreService } from '@/lib/firebase/firestore';
import { useLanguage } from '@/lib/contexts/LanguageContext';

interface Customer {
    id: string; // Either Firestore user ID or booking email/phone as key
    email?: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    source: 'user' | 'booking' | 'merged'; // Where the data came from
    createdAt?: any;
    lastBookingAt?: any;
    provider?: string;
}

interface CustomerStats {
    totalBookings: number;
    totalSpent: number;
    completedTrips: number;
}

export default function AdminCustomersPage() {
    const { t, language } = useLanguage();
    const [users, setUsers] = useState<any[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'spent' | 'bookings' | 'date'>('date');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    useEffect(() => {
        setLoading(true);

        const unsubscribeUsers = FirestoreService.subscribeToAllUsers((data) => {
            setUsers(data);
        });

        const unsubscribeBookings = FirestoreService.subscribeToAllBookings((data) => {
            setBookings(data);
            setLoading(false);
        });

        return () => {
            unsubscribeUsers();
            unsubscribeBookings();
        };
    }, []);

    // Merge users and bookings to get complete customer list
    const { customers, customerStats } = useMemo(() => {
        const customerMap = new Map<string, Customer>();
        const statsMap: Record<string, CustomerStats> = {};

        // Step 1: Add all registered users
        users.forEach(user => {
            if (user.role === 'admin') return; // Skip admin users

            customerMap.set(user.id, {
                id: user.id,
                email: user.email,
                displayName: user.displayName,
                phone: user.phone,
                source: 'user',
                createdAt: user.createdAt,
                provider: user.provider,
            });

            statsMap[user.id] = { totalBookings: 0, totalSpent: 0, completedTrips: 0 };
        });

        // Step 2: Process bookings to enrich user data and find unregistered customers
        bookings.forEach(booking => {
            const userId = booking.userId;
            const bookingEmail = booking.email?.toLowerCase();
            const bookingPhone = booking.phone?.replace(/[^0-9+]/g, '');

            // Try to match with existing user
            let matchedId = userId;

            // If we have a userId and it exists in our map, update stats
            if (userId && customerMap.has(userId)) {
                const existing = customerMap.get(userId)!;

                // Enrich with booking data if missing
                if (!existing.displayName && (booking.firstName || booking.lastName)) {
                    existing.displayName = `${booking.firstName || ''} ${booking.lastName || ''}`.trim();
                }
                if (!existing.phone && bookingPhone) {
                    existing.phone = bookingPhone;
                }
                if (!existing.email && bookingEmail) {
                    existing.email = bookingEmail;
                }
                existing.firstName = existing.firstName || booking.firstName;
                existing.lastName = existing.lastName || booking.lastName;
                existing.lastBookingAt = booking.createdAt;
                existing.source = 'merged';

                customerMap.set(userId, existing);
            } else {
                // Try to find by email or phone
                let foundKey: string | null = null;

                customerMap.forEach((customer, key) => {
                    if (bookingEmail && customer.email?.toLowerCase() === bookingEmail) {
                        foundKey = key;
                    } else if (bookingPhone && customer.phone?.replace(/[^0-9+]/g, '') === bookingPhone) {
                        foundKey = key;
                    }
                });

                if (foundKey) {
                    matchedId = foundKey;
                    const existing = customerMap.get(foundKey)!;
                    if (!existing.displayName && (booking.firstName || booking.lastName)) {
                        existing.displayName = `${booking.firstName || ''} ${booking.lastName || ''}`.trim();
                    }
                    existing.lastBookingAt = booking.createdAt;
                    existing.source = 'merged';
                    customerMap.set(foundKey, existing);
                } else {
                    // Create new customer from booking (unregistered)
                    const newId = bookingEmail || bookingPhone || `booking-${booking.id}`;

                    if (!customerMap.has(newId)) {
                        customerMap.set(newId, {
                            id: newId,
                            email: bookingEmail,
                            displayName: `${booking.firstName || ''} ${booking.lastName || ''}`.trim() || undefined,
                            firstName: booking.firstName,
                            lastName: booking.lastName,
                            phone: bookingPhone,
                            source: 'booking',
                            createdAt: booking.createdAt,
                            lastBookingAt: booking.createdAt,
                        });
                        statsMap[newId] = { totalBookings: 0, totalSpent: 0, completedTrips: 0 };
                    }
                    matchedId = newId;
                }
            }

            // Update stats
            if (matchedId) {
                if (!statsMap[matchedId]) {
                    statsMap[matchedId] = { totalBookings: 0, totalSpent: 0, completedTrips: 0 };
                }
                statsMap[matchedId].totalBookings++;
                if (booking.status !== 'cancelled') {
                    statsMap[matchedId].totalSpent += Number(booking.totalCost) || 0;
                }
                if (booking.status === 'completed') {
                    statsMap[matchedId].completedTrips++;
                }
            }
        });

        return {
            customers: Array.from(customerMap.values()),
            customerStats: statsMap
        };
    }, [users, bookings]);

    // Get customer bookings
    const getCustomerBookings = (customer: Customer) => {
        return bookings
            .filter(b => {
                // Match by userId
                if (b.userId === customer.id) return true;
                // Match by email
                if (customer.email && b.email?.toLowerCase() === customer.email.toLowerCase()) return true;
                // Match by phone
                if (customer.phone && b.phone?.replace(/[^0-9+]/g, '') === customer.phone.replace(/[^0-9+]/g, '')) return true;
                return false;
            })
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    };

    // Filtered and sorted customers
    const filteredCustomers = useMemo(() => {
        let result = customers.filter(customer => {
            const searchLower = searchQuery.toLowerCase();
            const fullName = customer.displayName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
            return !searchQuery ||
                customer.email?.toLowerCase().includes(searchLower) ||
                fullName.toLowerCase().includes(searchLower) ||
                customer.phone?.includes(searchQuery);
        });

        result.sort((a, b) => {
            const statsA = customerStats[a.id] || { totalBookings: 0, totalSpent: 0 };
            const statsB = customerStats[b.id] || { totalBookings: 0, totalSpent: 0 };

            switch (sortBy) {
                case 'name':
                    const nameA = a.displayName || `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.email || '';
                    const nameB = b.displayName || `${b.firstName || ''} ${b.lastName || ''}`.trim() || b.email || '';
                    return nameA.localeCompare(nameB);
                case 'spent':
                    return statsB.totalSpent - statsA.totalSpent;
                case 'bookings':
                    return statsB.totalBookings - statsA.totalBookings;
                case 'date':
                default:
                    const dateA = a.lastBookingAt?.seconds || a.createdAt?.seconds || 0;
                    const dateB = b.lastBookingAt?.seconds || b.createdAt?.seconds || 0;
                    return dateB - dateA;
            }
        });

        return result;
    }, [customers, searchQuery, sortBy, customerStats]);

    // Overall Stats
    const overallStats = useMemo(() => {
        const totalCustomers = customers.length;
        const registeredCustomers = customers.filter(c => c.source === 'user' || c.source === 'merged').length;
        const totalRevenue = Object.values(customerStats).reduce((sum, s) => sum + s.totalSpent, 0);
        const totalTrips = Object.values(customerStats).reduce((sum, s) => sum + s.completedTrips, 0);

        return { totalCustomers, registeredCustomers, totalRevenue, totalTrips };
    }, [customers, customerStats]);

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
        return date.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short', year: '2-digit' });
    };

    const getStatusConfig = (status: string) => {
        const configs: Record<string, { bg: string; text: string; label: string }> = {
            pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'รอยืนยัน' },
            confirmed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'ยืนยันแล้ว' },
            driver_assigned: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'มอบหมายคนขับ' },
            driver_en_route: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'คนขับกำลังมา' },
            in_progress: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'กำลังเดินทาง' },
            completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'เสร็จสิ้น' },
            cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'ยกเลิก' },
            awaiting_payment: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'รอชำระเงิน' },
        };
        return configs[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
    };

    const getDisplayName = (customer: Customer) => {
        return customer.displayName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || t.admin.customers.noName;
    };

    const getSourceBadge = (source: string) => {
        switch (source) {
            case 'user':
                return <span className="px-2 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 rounded-full">{t.admin.customers.types.registered}</span>;
            case 'merged':
                return <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full">{t.admin.customers.types.verified}</span>;
            case 'booking':
                return <span className="px-2 py-0.5 text-[10px] font-bold bg-gray-100 text-gray-600 rounded-full">{t.admin.customers.types.guest}</span>;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-blue-200 rounded-full"></div>
                        <div className="w-12 h-12 border-4 border-blue-600 rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
                    </div>
                    <p className="text-gray-500 font-medium">{t.admin.common.loading}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">{t.admin.customers.title}</h1>
                    <p className="text-sm text-gray-500 mt-1">{t.admin.customers.subtitle}</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-600">group</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{overallStats.totalCustomers}</p>
                            <p className="text-xs text-gray-500">{t.admin.customers.stats.totalCustomers}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-green-600">verified_user</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">{overallStats.registeredCustomers}</p>
                            <p className="text-xs text-gray-500">{t.admin.customers.stats.members}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-emerald-600">payments</span>
                        </div>
                        <div>
                            <p className="text-xl font-bold text-emerald-600">฿{overallStats.totalRevenue.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">{t.admin.customers.stats.totalRevenue}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-purple-600">local_taxi</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-purple-600">{overallStats.totalTrips}</p>
                            <p className="text-xs text-gray-500">{t.admin.customers.stats.completedTrips}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <label htmlFor="customer-search" className="sr-only">{t.admin.customers.searchPlaceholder}</label>
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input
                            id="customer-search"
                            name="customerSearch"
                            type="text"
                            placeholder={t.admin.customers.searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoComplete="off"
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-2">
                        <label htmlFor="customer-sort" className="text-sm text-gray-500">Sort by:</label>
                        <select
                            id="customer-sort"
                            name="customerSort"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="date">Recent Activity</option>
                            <option value="name">Name</option>
                            <option value="spent">Most Spent</option>
                            <option value="bookings">Most Bookings</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Customer List */}
            {filteredCustomers.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center border border-gray-100 shadow-sm">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl text-gray-400">person_search</span>
                    </div>
                    <p className="text-gray-500 font-medium">ไม่พบลูกค้า</p>
                    <p className="text-sm text-gray-400 mt-1">
                        {searchQuery ? 'ลองปรับคำค้นหาของคุณ' : 'ลูกค้าจะปรากฏเมื่อจองหรือลงทะเบียน'}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Bookings</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Trips</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Spent</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Activity</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredCustomers.map((customer) => {
                                    const stats = customerStats[customer.id] || { totalBookings: 0, totalSpent: 0, completedTrips: 0 };
                                    const displayName = getDisplayName(customer);
                                    return (
                                        <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                                        {displayName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-medium text-gray-800">{displayName}</p>
                                                            {getSourceBadge(customer.source)}
                                                        </div>
                                                        <p className="text-xs text-gray-500">{customer.email || '-'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {customer.phone ? (
                                                    <a href={`tel:${customer.phone}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-xs">call</span>
                                                        {customer.phone}
                                                    </a>
                                                ) : (
                                                    <span className="text-sm text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-sm font-semibold text-gray-800">{stats.totalBookings}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-sm font-semibold text-emerald-600">{stats.completedTrips}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm font-bold text-gray-800">฿{stats.totalSpent.toLocaleString()}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-500">{formatDate(customer.lastBookingAt || customer.createdAt)}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => {
                                                        setSelectedCustomer(customer);
                                                        setShowDetailModal(true);
                                                    }}
                                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-blue-600"
                                                >
                                                    <span className="material-symbols-outlined">visibility</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden divide-y divide-gray-100">
                        {filteredCustomers.map((customer) => {
                            const stats = customerStats[customer.id] || { totalBookings: 0, totalSpent: 0, completedTrips: 0 };
                            const displayName = getDisplayName(customer);
                            return (
                                <div
                                    key={customer.id}
                                    className="p-4 hover:bg-gray-50 transition-colors"
                                    onClick={() => {
                                        setSelectedCustomer(customer);
                                        setShowDetailModal(true);
                                    }}
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                                            {displayName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-gray-800">{displayName}</p>
                                                {getSourceBadge(customer.source)}
                                            </div>
                                            <p className="text-sm text-gray-500">{customer.email || customer.phone || '-'}</p>
                                        </div>
                                        <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <div className="text-center">
                                            <p className="font-bold text-gray-800">{stats.totalBookings}</p>
                                            <p className="text-xs text-gray-500">Bookings</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="font-bold text-emerald-600">{stats.completedTrips}</p>
                                            <p className="text-xs text-gray-500">Trips</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="font-bold text-gray-800">฿{stats.totalSpent.toLocaleString()}</p>
                                            <p className="text-xs text-gray-500">Spent</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Customer Detail Modal */}
            {showDetailModal && selectedCustomer && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xl">
                                    {getDisplayName(selectedCustomer).charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl font-bold text-white">{getDisplayName(selectedCustomer)}</h2>
                                        {getSourceBadge(selectedCustomer.source)}
                                    </div>
                                    <p className="text-blue-100 text-sm">{selectedCustomer.email || selectedCustomer.phone || 'No contact info'}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-gray-50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-gray-800">{(customerStats[selectedCustomer.id] || { totalBookings: 0 }).totalBookings}</p>
                                    <p className="text-xs text-gray-500">Total Bookings</p>
                                </div>
                                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-emerald-600">{(customerStats[selectedCustomer.id] || { completedTrips: 0 }).completedTrips}</p>
                                    <p className="text-xs text-gray-500">Completed Trips</p>
                                </div>
                                <div className="bg-blue-50 rounded-xl p-4 text-center">
                                    <p className="text-xl font-bold text-blue-600">฿{((customerStats[selectedCustomer.id] || { totalSpent: 0 }).totalSpent).toLocaleString()}</p>
                                    <p className="text-xs text-gray-500">Total Spent</p>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact Information</h3>
                                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-gray-400">person</span>
                                        <span className="text-sm text-gray-700">{getDisplayName(selectedCustomer)}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-gray-400">email</span>
                                        <span className="text-sm text-gray-700">{selectedCustomer.email || 'Not provided'}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-gray-400">call</span>
                                        {selectedCustomer.phone ? (
                                            <a href={`tel:${selectedCustomer.phone}`} className="text-sm text-blue-600 hover:underline">
                                                {selectedCustomer.phone}
                                            </a>
                                        ) : (
                                            <span className="text-sm text-gray-400">Not provided</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-gray-400">calendar_today</span>
                                        <span className="text-sm text-gray-700">
                                            {selectedCustomer.source === 'booking' ? 'First booking' : 'Joined'}: {formatDate(selectedCustomer.createdAt)}
                                        </span>
                                    </div>
                                    {selectedCustomer.provider && (
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-gray-400">login</span>
                                            <span className="text-sm text-gray-700 capitalize">Registered via {selectedCustomer.provider}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Booking History */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Booking History</h3>
                                {getCustomerBookings(selectedCustomer).length === 0 ? (
                                    <div className="bg-gray-50 rounded-xl p-8 text-center">
                                        <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">inbox</span>
                                        <p className="text-gray-500">No bookings yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-64 overflow-y-auto">
                                        {getCustomerBookings(selectedCustomer).map((booking) => {
                                            const statusConfig = getStatusConfig(booking.status);
                                            return (
                                                <div key={booking.id} className="bg-gray-50 rounded-xl p-4">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div>
                                                            <span className="font-mono text-xs text-gray-500">#{booking.id.slice(0, 8).toUpperCase()}</span>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusConfig.bg} ${statusConfig.text}`}>
                                                                    {statusConfig.label}
                                                                </span>
                                                                <span className="text-xs text-gray-500">{formatDate(booking.createdAt)}</span>
                                                            </div>
                                                        </div>
                                                        <span className="font-bold text-gray-800">฿{booking.totalCost?.toLocaleString()}</span>
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        <div className="flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-xs text-emerald-500">trip_origin</span>
                                                            <span className="truncate">{booking.pickupLocation}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-xs text-red-500">location_on</span>
                                                            <span className="truncate">{booking.dropoffLocation}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
