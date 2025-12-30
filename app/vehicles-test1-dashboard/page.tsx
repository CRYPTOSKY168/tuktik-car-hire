'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { FirestoreService } from '@/lib/firebase/firestore';

const ACTIVE_STATUSES = ['pending', 'confirmed', 'driver_assigned', 'driver_en_route', 'in_progress', 'awaiting_payment'];

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const { formatPrice } = useCurrency();

  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Real-time subscription
  // Uses comprehensive query that matches by userId, email, OR phone (same as admin page)
  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    const unsub = FirestoreService.subscribeToUserBookingsComprehensive(
      user.uid,
      user.email || null,
      user.phoneNumber || null,
      (data) => {
        const sorted = data.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setBookings(sorted);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  // Computed values
  const activeBooking = useMemo(() => {
    return bookings.find(b => ACTIVE_STATUSES.includes(b.status)) || null;
  }, [bookings]);

  const recentBookings = useMemo(() => {
    return bookings.filter(b => !ACTIVE_STATUSES.includes(b.status)).slice(0, 3);
  }, [bookings]);

  const stats = useMemo(() => {
    const completed = bookings.filter(b => b.status === 'completed');
    const totalSpent = completed.reduce((acc, b) => acc + (b.totalCost || 0), 0);
    return {
      trips: completed.length,
      points: Math.floor(totalSpent / 100),
    };
  }, [bookings]);

  // Get greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return language === 'th' ? 'สวัสดีตอนเช้า' : 'Good Morning';
    if (hour < 17) return language === 'th' ? 'สวัสดีตอนบ่าย' : 'Good Afternoon';
    return language === 'th' ? 'สวัสดีตอนเย็น' : 'Good Evening';
  };

  // Get display name
  const getDisplayName = () => {
    if (user?.displayName) return user.displayName.split(' ')[0];
    if (user?.email) return user.email.split('@')[0];
    return language === 'th' ? 'คุณ' : 'User';
  };

  // Get status config
  const getStatusConfig = (status: string) => {
    const config: Record<string, { label: string; color: string; bg: string; icon: string }> = {
      awaiting_payment: { label: language === 'th' ? 'รอชำระเงิน' : 'Awaiting Payment', color: 'text-amber-600', bg: 'bg-amber-50', icon: 'payments' },
      pending: { label: language === 'th' ? 'รอยืนยัน' : 'Pending', color: 'text-blue-600', bg: 'bg-blue-50', icon: 'schedule' },
      confirmed: { label: language === 'th' ? 'ยืนยันแล้ว' : 'Confirmed', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: 'check_circle' },
      driver_assigned: { label: language === 'th' ? 'มีคนขับแล้ว' : 'Driver Assigned', color: 'text-purple-600', bg: 'bg-purple-50', icon: 'person_check' },
      driver_en_route: { label: language === 'th' ? 'คนขับกำลังมา' : 'Driver Coming', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: 'directions_car' },
      in_progress: { label: language === 'th' ? 'กำลังเดินทาง' : 'In Progress', color: 'text-cyan-600', bg: 'bg-cyan-50', icon: 'route' },
      completed: { label: language === 'th' ? 'สำเร็จ' : 'Completed', color: 'text-green-600', bg: 'bg-green-50', icon: 'task_alt' },
      cancelled: { label: language === 'th' ? 'ยกเลิก' : 'Cancelled', color: 'text-red-600', bg: 'bg-red-50', icon: 'cancel' },
    };
    return config[status] || { label: status, color: 'text-gray-600', bg: 'bg-gray-50', icon: 'help' };
  };

  // Format date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const navigateTo = (path: string) => router.push(path);

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

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gray-100">
        <div className="max-w-[430px] mx-auto bg-white min-h-screen min-h-[100dvh] flex flex-col relative shadow-2xl">
          <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
            <div className="px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3">
              <h1 className="text-xl font-bold text-gray-900">TukTik</h1>
              <p className="text-gray-500 text-sm">{language === 'th' ? 'บริการรับส่งสนามบิน' : 'Airport Transfer'}</p>
            </div>
          </header>
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {language === 'th' ? 'ยังไม่ได้เข้าสู่ระบบ' : 'Not logged in'}
            </h2>
            <p className="text-gray-500 text-center mb-8">
              {language === 'th' ? 'กรุณาเข้าสู่ระบบเพื่อใช้งาน' : 'Please log in to continue'}
            </p>
            <button
              onClick={() => navigateTo('/login')}
              className="w-full max-w-xs h-14 rounded-2xl bg-gray-900 text-white font-bold text-lg hover:bg-gray-800 active:scale-[0.98] transition-all"
            >
              {language === 'th' ? 'เข้าสู่ระบบ' : 'Log In'}
            </button>
            <button
              onClick={() => navigateTo('/register')}
              className="w-full max-w-xs h-14 rounded-2xl border-2 border-gray-300 text-gray-700 font-bold text-lg mt-3 hover:bg-gray-50 active:scale-[0.98] transition-all"
            >
              {language === 'th' ? 'สมัครสมาชิก' : 'Sign Up'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = activeBooking ? getStatusConfig(activeBooking.status) : null;

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gray-100">
      <div className="max-w-[430px] mx-auto bg-white min-h-screen min-h-[100dvh] flex flex-col relative shadow-2xl">

        {/* ===== HEADER ===== */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
          <div className="px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{getGreeting()}</p>
                <h1 className="text-xl font-bold text-gray-900">{getDisplayName()}</h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateTo('/vehicles-test1-profile')}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 active:scale-95 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ===== CONTENT ===== */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-4 py-4 pb-24">

            {/* ----- Active Booking Card ----- */}
            {activeBooking ? (
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-5 mb-4 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                </div>

                <div className="relative">
                  {/* Status & ID */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`px-3 py-1.5 rounded-full ${statusConfig?.bg} flex items-center gap-2`}>
                      <span className={`material-symbols-outlined text-sm ${statusConfig?.color}`}>{statusConfig?.icon}</span>
                      <span className={`text-sm font-semibold ${statusConfig?.color}`}>{statusConfig?.label}</span>
                    </div>
                    <span className="text-gray-400 text-xs">#{activeBooking.id?.slice(-6).toUpperCase()}</span>
                  </div>

                  {/* Route */}
                  <div className="mb-4">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-green-400" />
                        <div className="w-0.5 h-10 bg-gray-600 my-1" />
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                      </div>
                      <div className="flex-1 space-y-4">
                        <div>
                          <p className="text-gray-400 text-xs">{language === 'th' ? 'จุดรับ' : 'Pickup'}</p>
                          <p className="text-white font-medium">{activeBooking.pickupLocation}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">{language === 'th' ? 'จุดส่ง' : 'Drop-off'}</p>
                          <p className="text-white font-medium">{activeBooking.dropoffLocation}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Date & Price */}
                  <div className="flex items-center justify-between py-3 border-t border-gray-700">
                    <div className="flex items-center gap-2 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm">{formatDate(activeBooking.pickupDate)} • {activeBooking.pickupTime}</span>
                    </div>
                    <p className="text-white font-bold text-lg">{formatPrice(activeBooking.totalCost || 0)}</p>
                  </div>

                  {/* Driver Info */}
                  {activeBooking.driver?.name && (
                    <div className="py-3 border-t border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gray-700 flex items-center justify-center text-white font-bold text-lg">
                          {activeBooking.driver.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-semibold">{activeBooking.driver.name}</p>
                          <p className="text-gray-400 text-sm">
                            {activeBooking.driver.vehicleModel && `${activeBooking.driver.vehicleModel} • `}
                            {activeBooking.driver.vehiclePlate}
                          </p>
                        </div>
                        {activeBooking.driver.phone && (
                          <a
                            href={`tel:${activeBooking.driver.phone}`}
                            className="w-11 h-11 rounded-xl bg-green-500 flex items-center justify-center text-white hover:bg-green-600 active:scale-95 transition-all"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </a>
                        )}
                      </div>
                      {/* Phone Number Display */}
                      {activeBooking.driver.phone && (
                        <div className="mt-2 flex items-center gap-2 text-gray-400 text-sm">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{activeBooking.driver.phone}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    onClick={() => activeBooking.status === 'awaiting_payment'
                      ? navigateTo(`/payment?bookingId=${activeBooking.id}`)
                      : navigateTo(`/confirmation?bookingId=${activeBooking.id}`)
                    }
                    className="w-full mt-3 py-3.5 rounded-xl bg-white text-gray-900 font-bold hover:bg-gray-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    {activeBooking.status === 'awaiting_payment' ? (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        {language === 'th' ? 'ชำระเงินเลย' : 'Pay Now'}
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {language === 'th' ? 'ดูรายละเอียด' : 'View Details'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Book Now Card */
              <button
                onClick={() => navigateTo('/vehicles-test1')}
                className="w-full bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 mb-4 relative overflow-hidden text-left group"
              >
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                </div>
                <div className="relative flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold text-lg group-hover:text-gray-200 transition-colors">
                      {language === 'th' ? 'จองรถรับส่ง' : 'Book a Ride'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {language === 'th' ? 'สนามบิน • โรงแรม • ที่พัก' : 'Airport • Hotel • Anywhere'}
                    </p>
                  </div>
                  <svg className="w-6 h-6 text-gray-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            )}

            {/* ----- Quick Stats ----- */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.trips}</p>
                    <p className="text-gray-500 text-xs">{language === 'th' ? 'เที่ยวสำเร็จ' : 'Trips'}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.points}</p>
                    <p className="text-gray-500 text-xs">{language === 'th' ? 'คะแนน' : 'Points'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ----- Quick Actions ----- */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { icon: 'history', label: language === 'th' ? 'ประวัติ' : 'History', path: '/vehicles-test1-history' },
                { icon: 'local_offer', label: language === 'th' ? 'โปรโมชั่น' : 'Promo', path: '/' },
                { icon: 'favorite', label: language === 'th' ? 'โปรด' : 'Saved', path: '/' },
                { icon: 'support_agent', label: language === 'th' ? 'ช่วยเหลือ' : 'Help', path: '/contact' },
              ].map((item) => (
                <button
                  key={item.icon}
                  onClick={() => navigateTo(item.path)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-gray-600">{item.icon}</span>
                  </div>
                  <span className="text-xs text-gray-600 font-medium">{item.label}</span>
                </button>
              ))}
            </div>

            {/* ----- Recent Trips ----- */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">{language === 'th' ? 'การเดินทางล่าสุด' : 'Recent Trips'}</h2>
                {recentBookings.length > 0 && (
                  <button
                    onClick={() => navigateTo('/vehicles-test1-history')}
                    className="text-sm text-blue-600 font-medium hover:text-blue-700"
                  >
                    {language === 'th' ? 'ดูทั้งหมด' : 'View All'}
                  </button>
                )}
              </div>

              {recentBookings.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {recentBookings.map((booking) => {
                    const config = getStatusConfig(booking.status);
                    return (
                      <button
                        key={booking.id}
                        onClick={() => navigateTo(`/confirmation?bookingId=${booking.id}`)}
                        className="w-full text-left p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center`}>
                            <span className={`material-symbols-outlined text-lg ${config.color}`}>{config.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-900 font-medium text-sm truncate">
                              {booking.pickupLocation}
                            </p>
                            <p className="text-gray-500 text-xs mt-0.5">{formatDate(booking.pickupDate)}</p>
                          </div>
                          <p className="text-gray-900 font-bold">{formatPrice(booking.totalCost || 0)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">{language === 'th' ? 'ยังไม่มีประวัติการเดินทาง' : 'No trip history'}</p>
                </div>
              )}
            </div>

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
              ), label: language === 'th' ? 'หน้าหลัก' : 'Home', active: true },
              { id: 'history', path: '/vehicles-test1-history', icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ), label: language === 'th' ? 'ประวัติ' : 'History', active: false },
              { id: 'promo', path: '/', icon: (
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
                  item.active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
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
