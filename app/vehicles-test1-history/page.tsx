'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { FirestoreService } from '@/lib/firebase/firestore';

interface Trip {
  id: string;
  date: string;
  time: string;
  pickup: string;
  dropoff: string;
  vehicle: string;
  price: number;
  status: 'pending' | 'confirmed' | 'driver_assigned' | 'driver_en_route' | 'in_progress' | 'completed' | 'cancelled';
  driver?: {
    name: string;
    rating: number;
    plate: string;
    phone?: string;
  };
  rating?: number;
  cancelReason?: string;
  createdAt?: any;
}

export default function HistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const { formatPrice } = useCurrency();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);

  // Real-time subscription to user bookings
  // Uses comprehensive query that matches by userId, email, OR phone (same as admin page)
  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    // Subscribe to real-time updates using comprehensive query
    // This matches bookings the same way admin customers page does
    const unsubscribe = FirestoreService.subscribeToUserBookingsComprehensive(
      user.uid,
      user.email || null,
      user.phoneNumber || null,
      (bookings) => {
      // Transform bookings to trips format
      const transformedTrips: Trip[] = bookings.map((booking: any) => {
        // Parse date - prefer pickupDate/pickupTime for display
        let dateStr = '';
        let timeStr = '';
        if (booking.pickupDate) {
          // Format pickup date nicely
          const dateParts = booking.pickupDate.split('-');
          if (dateParts.length === 3) {
            const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
            dateStr = date.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
              day: 'numeric',
              month: 'short',
              year: language === 'th' ? '2-digit' : 'numeric',
            });
          } else {
            dateStr = booking.pickupDate;
          }
          timeStr = booking.pickupTime || '';
        } else if (booking.createdAt) {
          const date = booking.createdAt.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt);
          dateStr = date.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
            day: 'numeric',
            month: 'short',
            year: language === 'th' ? '2-digit' : 'numeric',
          });
          timeStr = date.toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
          });
        }

        return {
          id: booking.id,
          date: dateStr,
          time: timeStr,
          pickup: booking.pickupLocation || booking.pickup || '-',
          dropoff: booking.dropoffLocation || booking.dropoff || '-',
          vehicle: booking.vehicleName || booking.vehicle?.name || '-',
          price: booking.totalCost || booking.totalPrice || booking.price || 0,
          status: booking.status || 'pending',
          driver: booking.driver ? {
            name: booking.driver.name || booking.driver.firstName || '-',
            rating: booking.driver.rating || 4.8,
            plate: booking.driver.vehiclePlate || booking.driver.licensePlate || booking.driver.plate || '-',
            phone: booking.driver.phone,
          } : undefined,
          rating: booking.rating,
          cancelReason: booking.cancelReason || booking.cancellationReason,
          createdAt: booking.createdAt,
        };
      });

      // Sort by createdAt (newest first)
      transformedTrips.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          const dateA = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        }
        return 0;
      });

      setTrips(transformedTrips);
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [user, language]);

  // Filters
  const filters = [
    { id: 'all', label: language === 'th' ? 'ทั้งหมด' : 'All' },
    { id: 'completed', label: language === 'th' ? 'สำเร็จ' : 'Completed' },
    { id: 'cancelled', label: language === 'th' ? 'ยกเลิก' : 'Cancelled' },
  ];

  const filteredTrips = trips.filter((trip) => {
    if (activeFilter === 'all') return true;
    return trip.status === activeFilter;
  });

  const stats = {
    total: trips.length,
    completed: trips.filter((t) => t.status === 'completed').length,
    cancelled: trips.filter((t) => t.status === 'cancelled').length,
    totalSpent: trips.filter((t) => t.status === 'completed').reduce((sum, t) => sum + t.price, 0),
  };

  // Handle navigation
  const handleBack = () => router.back();
  const navigateTo = (path: string) => router.push(path);

  // Get status display
  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      pending: { label: language === 'th' ? 'รอยืนยัน' : 'Pending', color: 'bg-yellow-100 text-yellow-700' },
      confirmed: { label: language === 'th' ? 'ยืนยันแล้ว' : 'Confirmed', color: 'bg-blue-100 text-blue-700' },
      driver_assigned: { label: language === 'th' ? 'มีคนขับแล้ว' : 'Driver Assigned', color: 'bg-blue-100 text-blue-700' },
      driver_en_route: { label: language === 'th' ? 'คนขับกำลังมา' : 'Driver Coming', color: 'bg-purple-100 text-purple-700' },
      in_progress: { label: language === 'th' ? 'กำลังเดินทาง' : 'In Progress', color: 'bg-purple-100 text-purple-700' },
      completed: { label: language === 'th' ? 'สำเร็จ' : 'Completed', color: 'bg-green-100 text-green-700' },
      cancelled: { label: language === 'th' ? 'ยกเลิก' : 'Cancelled', color: 'bg-red-100 text-red-700' },
    };
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
  };

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gray-100">
        <div className="max-w-[430px] mx-auto bg-white min-h-screen min-h-[100dvh] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">{language === 'th' ? 'กำลังโหลด...' : 'Loading...'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Not logged in state
  if (!user) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gray-100">
        <div className="max-w-[430px] mx-auto bg-white min-h-screen min-h-[100dvh] flex flex-col relative shadow-2xl">
          <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
            <div className="px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBack}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 active:scale-95 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-lg font-bold text-gray-900">
                  {language === 'th' ? 'ประวัติการเดินทาง' : 'Trip History'}
                </h1>
              </div>
            </div>
          </header>
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {language === 'th' ? 'ยังไม่ได้เข้าสู่ระบบ' : 'Not logged in'}
            </h2>
            <p className="text-gray-500 text-center mb-8">
              {language === 'th' ? 'กรุณาเข้าสู่ระบบเพื่อดูประวัติการเดินทาง' : 'Please log in to view trip history'}
            </p>
            <button
              onClick={() => router.push('/login')}
              className="w-full max-w-xs h-14 rounded-2xl bg-gray-900 text-white font-bold text-lg hover:bg-gray-800 active:scale-[0.98] transition-all"
            >
              {language === 'th' ? 'เข้าสู่ระบบ' : 'Log In'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gray-100">
      <div className="max-w-[430px] mx-auto bg-white min-h-screen min-h-[100dvh] flex flex-col relative shadow-2xl">

        {/* ===== HEADER ===== */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
          <div className="px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 active:scale-95 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-lg font-bold text-gray-900">
                {language === 'th' ? 'ประวัติการเดินทาง' : 'Trip History'}
              </h1>
            </div>
          </div>
        </header>

        {/* ===== SCROLLABLE CONTENT ===== */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-4 py-4 pb-8">

            {/* ----- Stats Summary ----- */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 mb-6 relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              </div>

              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-gray-400 text-sm">
                      {language === 'th' ? 'ยอดใช้จ่ายทั้งหมด' : 'Total Spent'}
                    </p>
                    <p className="text-3xl font-bold text-white">{formatPrice(stats.totalSpent)}</p>
                  </div>
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                    <p className="text-xs text-gray-400">{language === 'th' ? 'ทั้งหมด' : 'Total'}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
                    <p className="text-xs text-gray-400">{language === 'th' ? 'สำเร็จ' : 'Completed'}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-red-400">{stats.cancelled}</p>
                    <p className="text-xs text-gray-400">{language === 'th' ? 'ยกเลิก' : 'Cancelled'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ----- Filter Tabs ----- */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                    activeFilter === filter.id
                      ? 'bg-gray-900 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                  {filter.id === 'all' && (
                    <span className="ml-1.5 px-1.5 py-0.5 bg-white/20 rounded text-xs">{stats.total}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ----- Trip List ----- */}
            <div className="space-y-3">
              {filteredTrips.map((trip) => {
                const statusInfo = getStatusDisplay(trip.status);

                return (
                  <div
                    key={trip.id}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-all"
                  >
                    {/* Main Content */}
                    <button
                      onClick={() => setExpandedTrip(expandedTrip === trip.id ? null : trip.id)}
                      className="w-full text-left p-4"
                    >
                      {/* Header Row */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">
                            {trip.vehicle}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">{formatPrice(trip.price)}</p>
                          <p className="text-xs text-gray-500">{trip.date}</p>
                        </div>
                      </div>

                      {/* Route */}
                      <div className="flex">
                        <div className="flex flex-col items-center mr-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                          <div className="w-0.5 h-8 bg-gray-200 my-1" />
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div>
                            <p className="text-xs text-gray-400">{trip.time}</p>
                            <p className="font-medium text-gray-900 text-sm">{trip.pickup}</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{trip.dropoff}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform ${
                              expandedTrip === trip.id ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {expandedTrip === trip.id && (
                      <div className="border-t border-gray-100 p-4 bg-gray-50">
                        {trip.status === 'completed' && trip.driver && (
                          <>
                            {/* Driver Info */}
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                  {trip.driver.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">{trip.driver.name}</p>
                                  <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                      </svg>
                                      {trip.driver.rating}
                                    </span>
                                    <span>•</span>
                                    <span>{trip.driver.plate}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Your Rating */}
                            {trip.rating && (
                              <div className="bg-white rounded-xl p-3 mb-4">
                                <p className="text-xs text-gray-500 mb-2">
                                  {language === 'th' ? 'คะแนนที่คุณให้' : 'Your Rating'}
                                </p>
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <svg
                                      key={star}
                                      className={`w-6 h-6 ${
                                        star <= trip.rating! ? 'text-yellow-400' : 'text-gray-200'
                                      }`}
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {trip.status === 'cancelled' && trip.cancelReason && (
                          <div className="bg-red-50 rounded-xl p-3 mb-4">
                            <p className="text-xs text-red-600 font-medium mb-1">
                              {language === 'th' ? 'เหตุผลที่ยกเลิก' : 'Cancellation Reason'}
                            </p>
                            <p className="text-sm text-red-700">{trip.cancelReason}</p>
                          </div>
                        )}

                        {/* Booking ID */}
                        <div className="bg-white rounded-xl p-3 mb-4">
                          <p className="text-xs text-gray-500 mb-1">Booking ID</p>
                          <p className="text-sm font-mono text-gray-700">{trip.id}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-100 active:scale-95 transition-all flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            {language === 'th' ? 'ใบเสร็จ' : 'Receipt'}
                          </button>
                          <button
                            onClick={() => navigateTo('/vehicles-test1')}
                            className="flex-1 py-3 rounded-xl bg-gray-900 text-white font-semibold text-sm shadow-lg hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {language === 'th' ? 'จองอีกครั้ง' : 'Book Again'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ----- Empty State ----- */}
            {filteredTrips.length === 0 && (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {language === 'th' ? 'ไม่พบประวัติ' : 'No History'}
                </h3>
                <p className="text-gray-500 text-sm mb-6">
                  {activeFilter === 'all'
                    ? (language === 'th' ? 'คุณยังไม่มีการจองใดๆ' : "You don't have any bookings yet")
                    : (language === 'th' ? 'ไม่มีรายการที่ตรงกับตัวกรอง' : 'No items match the filter')
                  }
                </p>
                {activeFilter === 'all' && (
                  <button
                    onClick={() => navigateTo('/vehicles-test1')}
                    className="px-6 py-3 rounded-xl bg-gray-900 text-white font-semibold text-sm shadow-lg hover:bg-gray-800 active:scale-95 transition-all"
                  >
                    {language === 'th' ? 'จองเลย' : 'Book Now'}
                  </button>
                )}
              </div>
            )}

          </div>
        </div>

        {/* ===== BOTTOM NAVIGATION ===== */}
        <nav className="sticky bottom-0 bg-white border-t border-gray-200 px-6 pb-[max(8px,env(safe-area-inset-bottom))] pt-2">
          <div className="flex items-center justify-around">
            {[
              { id: 'home', path: '/vehicles-test1-dashboard', icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              ), label: language === 'th' ? 'หน้าหลัก' : 'Home', active: false },
              { id: 'history', path: '/vehicles-test1-history', icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ), label: language === 'th' ? 'ประวัติ' : 'History', active: true },
              { id: 'voucher', path: '/vehicles-test1-dashboard', icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              ), label: language === 'th' ? 'โปรโมชั่น' : 'Promo', active: false },
              { id: 'profile', path: '/vehicles-test1-profile', icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              ), label: language === 'th' ? 'โปรไฟล์' : 'Profile', active: false },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => navigateTo(item.path)}
                className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${
                  item.active
                    ? 'text-blue-500'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {item.icon}
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

      </div>
    </div>
  );
}
