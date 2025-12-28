'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { FirestoreService } from '@/lib/firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Status config
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string; step: number }> = {
  awaiting_payment: { label: 'รอชำระเงิน', color: 'text-amber-600', bg: 'bg-amber-500', icon: 'hourglass_empty', step: 0 },
  pending: { label: 'รอยืนยัน', color: 'text-amber-600', bg: 'bg-amber-500', icon: 'schedule', step: 1 },
  confirmed: { label: 'ยืนยันแล้ว', color: 'text-blue-600', bg: 'bg-blue-500', icon: 'check_circle', step: 2 },
  driver_assigned: { label: 'มอบหมายคนขับแล้ว', color: 'text-purple-600', bg: 'bg-purple-500', icon: 'person_check', step: 3 },
  driver_en_route: { label: 'คนขับกำลังมารับ', color: 'text-indigo-600', bg: 'bg-indigo-500', icon: 'directions_car', step: 4 },
  in_progress: { label: 'กำลังเดินทาง', color: 'text-cyan-600', bg: 'bg-cyan-500', icon: 'route', step: 5 },
  completed: { label: 'เสร็จสิ้น', color: 'text-emerald-600', bg: 'bg-emerald-500', icon: 'task_alt', step: 6 },
  cancelled: { label: 'ยกเลิกแล้ว', color: 'text-red-600', bg: 'bg-red-500', icon: 'cancel', step: -1 },
};

const ACTIVE_STATUSES = ['pending', 'confirmed', 'driver_assigned', 'driver_en_route', 'in_progress', 'awaiting_payment'];

// Confetti Component
const Confetti = () => {
  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
  const confettiPieces = Array.from({ length: 150 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 3,
    duration: 3 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 8 + Math.random() * 8,
    rotation: Math.random() * 360,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-confetti"
          style={{
            left: `${piece.left}%`,
            top: '-20px',
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: piece.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            transform: `rotate(${piece.rotation}deg)`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg) scale(0.5);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </div>
  );
};

// Celebration Modal
const CelebrationModal = ({ booking, onClose }: { booking: any; onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-celebration-pop">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 px-6 py-10 text-center relative overflow-hidden">
          {/* Animated circles */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full animate-pulse"></div>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full animate-pulse delay-150"></div>
            <div className="absolute top-1/2 left-1/4 w-20 h-20 bg-white/5 rounded-full animate-bounce"></div>
          </div>

          {/* Success Icon with animation */}
          <div className="relative">
            <div className="w-24 h-24 bg-white rounded-full mx-auto flex items-center justify-center shadow-xl animate-bounce-gentle">
              <span className="material-symbols-outlined text-emerald-500 text-5xl">verified</span>
            </div>
            {/* Sparkles */}
            <div className="absolute -top-2 -right-4 text-yellow-300 animate-ping">
              <span className="material-symbols-outlined text-2xl">star</span>
            </div>
            <div className="absolute -bottom-2 -left-4 text-yellow-300 animate-ping delay-300">
              <span className="material-symbols-outlined text-xl">star</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mt-6 animate-fade-in">ถึงจุดหมายแล้ว!</h2>
          <p className="text-emerald-100 mt-2">ขอบคุณที่ใช้บริการ TukTik</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Trip Summary */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-sm">trip_origin</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-300 flex-1">{booking?.pickupLocation}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-sm">location_on</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-300 flex-1">{booking?.dropoffLocation}</span>
            </div>
          </div>

          {/* Points Earned */}
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 mb-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-white text-2xl">toll</span>
            </div>
            <div>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">คุณได้รับคะแนน</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">+{Math.floor((booking?.totalCost || 0) / 100)} Points</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02] transition-all"
            >
              เยี่ยมเลย!
            </button>
            <Link
              href={`/confirmation?bookingId=${booking?.id}`}
              className="px-4 py-3.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center"
            >
              <span className="material-symbols-outlined text-lg">receipt_long</span>
            </Link>
          </div>
        </div>

        <style jsx>{`
          @keyframes celebration-pop {
            0% { transform: scale(0.5) translateY(50px); opacity: 0; }
            50% { transform: scale(1.05) translateY(-10px); }
            100% { transform: scale(1) translateY(0); opacity: 1; }
          }
          @keyframes bounce-gentle {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-celebration-pop {
            animation: celebration-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }
          .animate-bounce-gentle {
            animation: bounce-gentle 2s ease-in-out infinite;
          }
          .animate-fade-in {
            animation: fade-in 0.5s ease-out 0.3s both;
          }
          .delay-150 {
            animation-delay: 150ms;
          }
          .delay-300 {
            animation-delay: 300ms;
          }
        `}</style>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'bookings' | 'profile'>('home');

  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationBooking, setCelebrationBooking] = useState<any>(null);
  const previousBookingsRef = useRef<any[]>([]);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  // Fetch bookings
  useEffect(() => {
    if (!user) return;
    const unsub = FirestoreService.subscribeToUserBookings(user.uid, (data) => {
      const sorted = data.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setBookings(sorted);
      setFetching(false);
    });
    return () => unsub();
  }, [user]);

  // Detect when a booking changes to completed - show celebration!
  useEffect(() => {
    if (bookings.length === 0 || previousBookingsRef.current.length === 0) {
      previousBookingsRef.current = bookings;
      return;
    }

    // Check if any booking just changed to completed
    for (const booking of bookings) {
      const prevBooking = previousBookingsRef.current.find(b => b.id === booking.id);
      if (prevBooking && prevBooking.status !== 'completed' && booking.status === 'completed') {
        // Found a booking that just completed!
        setCelebrationBooking(booking);
        setShowCelebration(true);

        // Auto-hide after 10 seconds
        setTimeout(() => {
          setShowCelebration(false);
          setCelebrationBooking(null);
        }, 10000);
        break;
      }
    }

    previousBookingsRef.current = bookings;
  }, [bookings]);

  // Computed values
  const activeBooking = useMemo(() => {
    return bookings.find(b => ACTIVE_STATUSES.includes(b.status)) || null;
  }, [bookings]);

  const recentBookings = useMemo(() => {
    return bookings.filter(b => !ACTIVE_STATUSES.includes(b.status)).slice(0, 5);
  }, [bookings]);

  const stats = useMemo(() => {
    const completed = bookings.filter(b => b.status === 'completed');
    const totalSpent = completed.reduce((acc, b) => acc + (b.totalCost || 0), 0);
    return {
      trips: completed.length,
      spent: totalSpent,
      points: Math.floor(totalSpent / 100),
    };
  }, [bookings]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'สวัสดีตอนเช้า';
    if (hour < 17) return 'สวัสดีตอนบ่าย';
    return 'สวัสดีตอนเย็น';
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const config = activeBooking ? (STATUS_CONFIG[activeBooking.status] || STATUS_CONFIG.pending) : null;

  return (
    <>
      {/* Celebration Effects */}
      {showCelebration && <Confetti />}
      {showCelebration && celebrationBooking && (
        <CelebrationModal
          booking={celebrationBooking}
          onClose={() => {
            setShowCelebration(false);
            setCelebrationBooking(null);
          }}
        />
      )}

      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{getGreeting()}</p>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                {user.displayName || 'สมาชิก'}
              </h1>
            </div>
            <Link href="/vehicles" className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/30">
              <span className="material-symbols-outlined">add</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* Active Booking Card */}
        {activeBooking ? (
          <div className={`${config?.bg} rounded-2xl overflow-hidden shadow-lg`}>
            <div className="p-4 text-white">
              {/* Status */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined">{config?.icon}</span>
                  <span className="font-semibold">{config?.label}</span>
                </div>
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                  #{activeBooking.id?.slice(-6).toUpperCase()}
                </span>
              </div>

              {/* Route */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                  <p className="font-medium">{activeBooking.pickupLocation}</p>
                </div>
                <div className="ml-1 w-0.5 h-4 bg-white/40"></div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-white/60"></div>
                  <p className="text-white/80">{activeBooking.dropoffLocation}</p>
                </div>
              </div>

              {/* Date & Vehicle */}
              <div className="flex items-center justify-between text-sm mb-4">
                <div className="flex items-center gap-1 text-white/80">
                  <span className="material-symbols-outlined text-base">event</span>
                  {activeBooking.pickupDate && new Date(activeBooking.pickupDate).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}
                  <span className="mx-1">•</span>
                  {activeBooking.pickupTime}
                </div>
                <div className="font-bold">฿{activeBooking.totalCost?.toLocaleString()}</div>
              </div>

              {/* Mini Timeline */}
              <div className="flex items-center gap-1 mb-4">
                {[1, 2, 3, 4, 5, 6].map(step => (
                  <div key={step} className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/20">
                    <div className={`h-full ${step <= (config?.step || 0) ? 'bg-white' : ''}`}></div>
                  </div>
                ))}
              </div>

              {/* Driver Info (if assigned) */}
              {activeBooking.driver?.name && (
                <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl mb-4">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-sm">
                    {activeBooking.driver.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{activeBooking.driver.name}</p>
                    <p className="text-xs text-white/70">
                      {activeBooking.driver.vehicleModel && `${activeBooking.driver.vehicleModel} • `}
                      {activeBooking.driver.vehiclePlate || activeBooking.driver.phone}
                    </p>
                  </div>
                  {activeBooking.driver.phone && (
                    <a href={`tel:${activeBooking.driver.phone}`} className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                      <span className="material-symbols-outlined text-lg">call</span>
                    </a>
                  )}
                </div>
              )}

              {/* Actions */}
              {activeBooking.status === 'awaiting_payment' ? (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/payment?bookingId=${activeBooking.id}`}
                    className="py-2.5 bg-white text-amber-600 font-semibold rounded-xl text-center text-sm flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-base">payment</span>
                    ชำระเงินเลย
                  </Link>
                  <Link
                    href={`/confirmation?bookingId=${activeBooking.id}`}
                    className="py-2.5 bg-white/20 font-semibold rounded-xl text-center text-sm"
                  >
                    ดูรายละเอียด
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/confirmation?bookingId=${activeBooking.id}`}
                    className="py-2.5 bg-white text-gray-800 font-semibold rounded-xl text-center text-sm"
                  >
                    ดูรายละเอียด
                  </Link>
                  <a
                    href={activeBooking.driver?.phone ? `tel:${activeBooking.driver.phone}` : '/contact'}
                    className="py-2.5 bg-white/20 font-semibold rounded-xl text-center text-sm flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-base">
                      {activeBooking.driver?.phone ? 'call' : 'support_agent'}
                    </span>
                    {activeBooking.driver?.phone ? 'โทรคนขับ' : 'ติดต่อเรา'}
                  </a>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Empty State - No Active Booking */
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white text-center shadow-xl shadow-blue-500/20">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl">directions_car</span>
            </div>
            <h2 className="text-xl font-bold mb-2">พร้อมเดินทางหรือยัง?</h2>
            <p className="text-blue-100 text-sm mb-4">จองรถรับส่งสนามบินง่ายๆ ไม่ต้องรอ</p>
            <Link
              href="/vehicles"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 font-bold rounded-xl shadow-lg"
            >
              <span className="material-symbols-outlined">add</span>
              จองรถเลย
            </Link>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.trips}</p>
            <p className="text-xs text-gray-500">เที่ยว</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-blue-600">฿{(stats.spent / 1000).toFixed(1)}K</p>
            <p className="text-xs text-gray-500">ใช้ไปแล้ว</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-amber-500">{stats.points}</p>
            <p className="text-xs text-gray-500">คะแนน</p>
          </div>
        </div>

        {/* Book New Button (if has active) */}
        {activeBooking && (
          <Link
            href="/vehicles"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 font-semibold hover:border-blue-300 hover:text-blue-600 transition-colors"
          >
            <span className="material-symbols-outlined">add</span>
            จองรถใหม่
          </Link>
        )}

        {/* Recent Bookings */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-bold text-gray-800 dark:text-white">ประวัติการจอง</h2>
            {bookings.length > 5 && (
              <button
                onClick={() => setActiveTab('bookings')}
                className="text-sm text-blue-600 font-medium"
              >
                ดูทั้งหมด
              </button>
            )}
          </div>

          {fetching ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            </div>
          ) : recentBookings.length > 0 ? (
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {recentBookings.map((booking) => {
                const bConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
                return (
                  <Link
                    key={booking.id}
                    href={`/confirmation?bookingId=${booking.id}`}
                    className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className={`w-10 h-10 ${bConfig.bg} rounded-xl flex items-center justify-center text-white`}>
                      <span className="material-symbols-outlined text-lg">{bConfig.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 dark:text-white text-sm truncate">
                        {booking.pickupLocation} → {booking.dropoffLocation}
                      </p>
                      <p className="text-xs text-gray-500">
                        {booking.pickupDate && new Date(booking.pickupDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                        <span className="mx-1">•</span>
                        {bConfig.label}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-800 dark:text-white">฿{booking.totalCost?.toLocaleString()}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-gray-400">receipt_long</span>
              </div>
              <p className="text-gray-500 text-sm">ยังไม่มีประวัติการจอง</p>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href="https://line.me/R/ti/p/@tuktik"
            target="_blank"
            className="flex items-center gap-3 p-4 bg-[#06C755] rounded-xl text-white"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
            </svg>
            <div>
              <p className="font-semibold text-sm">LINE</p>
              <p className="text-xs text-white/80">ติดต่อเรา</p>
            </div>
          </a>
          <Link
            href="/contact"
            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm"
          >
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600">help</span>
            </div>
            <div>
              <p className="font-semibold text-gray-800 dark:text-white text-sm">ช่วยเหลือ</p>
              <p className="text-xs text-gray-500">FAQ & Support</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-around py-2">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-0.5 px-6 py-2 rounded-xl transition-colors ${activeTab === 'home' ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <span className="material-symbols-outlined text-xl">home</span>
            <span className="text-[10px] font-medium">หน้าหลัก</span>
          </button>
          <Link
            href="/vehicles"
            className="flex flex-col items-center gap-0.5 px-6 py-2 -mt-6"
          >
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/40">
              <span className="material-symbols-outlined text-white text-2xl">add</span>
            </div>
          </Link>
          <Link
            href="/profile"
            className="flex flex-col items-center gap-0.5 px-6 py-2 rounded-xl text-gray-400"
          >
            <span className="material-symbols-outlined text-xl">person</span>
            <span className="text-[10px] font-medium">โปรไฟล์</span>
          </Link>
        </div>
      </div>
    </main>
    </>
  );
}
