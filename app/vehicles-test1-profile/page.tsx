'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { FirestoreService } from '@/lib/firebase/firestore';
import { StorageService } from '@/lib/firebase/storage';
import { updateProfile } from 'firebase/auth';
import type { SavedLocation, UserVoucher } from '@/lib/types';

interface ProfileNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: any;
  read?: boolean;
  isRead?: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut, loading: authLoading } = useAuth();
  const { language, setLanguage } = useLanguage();

  // ========== BACKEND STATE (from Production /profile) ==========
  const [notifications, setNotifications] = useState(true);
  const [stats, setStats] = useState({ totalBookings: 0, totalSpent: 0, completedTrips: 0 });
  const [memberSince, setMemberSince] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Production profile data states
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [userNotifications, setUserNotifications] = useState<ProfileNotification[]>([]);
  const [vouchers, setVouchers] = useState<UserVoucher[]>([]);
  const [preferences, setPreferences] = useState<any>({});

  // UI states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ displayName: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Location modal
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocation, setNewLocation] = useState<{ name: string; address: string; type: SavedLocation['type'] }>({ name: '', address: '', type: 'home' });

  // Voucher modal
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  // ========== BACKEND SUBSCRIPTIONS (from Production /profile) ==========
  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    // Calculate member since
    if (user.metadata?.creationTime) {
      const createdDate = new Date(user.metadata.creationTime);
      const now = new Date();
      const years = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
      setMemberSince(years < 1 ? (language === 'th' ? 'ใหม่' : 'New') : `${years}`);
    }

    const unsubscribers: (() => void)[] = [];

    // 1. Subscribe to bookings for stats (comprehensive query - matches by userId, email, or phone)
    unsubscribers.push(
      FirestoreService.subscribeToUserBookingsComprehensive(
        user.uid,
        user.email || null,
        user.phoneNumber || null,
        (bookings) => {
          const completedBookings = bookings.filter((b: any) => b.status === 'completed');
          const totalSpent = completedBookings.reduce((sum: number, b: any) => sum + (b.totalCost || b.totalPrice || 0), 0);

          setStats({
            totalBookings: bookings.length,
            completedTrips: completedBookings.length,
            totalSpent: totalSpent,
          });
          setIsLoading(false);
        }
      )
    );

    // 2. Subscribe to saved locations (from Production)
    unsubscribers.push(
      FirestoreService.subscribeToUserSavedLocations(user.uid, setSavedLocations)
    );

    // 3. Subscribe to notifications (from Production)
    unsubscribers.push(
      FirestoreService.subscribeToUserNotifications(user.uid, (data) => setUserNotifications(data as ProfileNotification[]))
    );

    // 4. Subscribe to vouchers (from Production)
    unsubscribers.push(
      FirestoreService.subscribeToUserVouchers(user.uid, (data) => {
        const active = data.filter((v: any) => {
          if (v.used) return false;
          if (v.expiresAt) {
            const exp = v.expiresAt.toDate ? v.expiresAt.toDate() : new Date(v.expiresAt);
            if (exp < new Date()) return false;
          }
          return true;
        });
        setVouchers(active);
      })
    );

    // 5. Get user preferences (from Production)
    FirestoreService.getUserPreferences(user.uid).then(setPreferences);

    return () => unsubscribers.forEach(u => u());
  }, [user, language]);

  // Init profile form (from Production)
  useEffect(() => {
    if (user) {
      setProfileForm({
        displayName: user.displayName || '',
        phone: preferences.phone || ''
      });
    }
  }, [user, preferences]);

  // ========== HANDLERS (from Production /profile) ==========

  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingPhoto(true);
    try {
      const url = await StorageService.uploadProfileImage(file, user.uid);
      await updateProfile(user, { photoURL: url });
      window.location.reload();
    } catch (err) {
      alert(language === 'th' ? 'ไม่สามารถอัปโหลดรูปได้' : 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle save profile
  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (profileForm.displayName !== user.displayName) {
        await updateProfile(user, { displayName: profileForm.displayName });
      }
      await FirestoreService.updateUserPreferences(user.uid, { phone: profileForm.phone });
      setIsEditingProfile(false);
      window.location.reload();
    } catch (err) {
      alert(language === 'th' ? 'ไม่สามารถบันทึกได้' : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Handle add location
  const handleAddLocation = async () => {
    if (!user || !newLocation.name || !newLocation.address) return;
    try {
      await FirestoreService.addUserSavedLocation(user.uid, newLocation);
      setShowAddLocation(false);
      setNewLocation({ name: '', address: '', type: 'home' });
    } catch (err) {
      alert(language === 'th' ? 'ไม่สามารถเพิ่มสถานที่ได้' : 'Failed to add location');
    }
  };

  // Handle delete location
  const handleDeleteLocation = async (id: string) => {
    if (!user || !confirm(language === 'th' ? 'ลบสถานที่นี้?' : 'Delete this location?')) return;
    await FirestoreService.deleteUserSavedLocation(user.uid, id);
  };

  // Handle mark all notifications as read
  const handleMarkAllRead = async () => {
    if (!user) return;
    await FirestoreService.markAllNotificationsAsRead(user.uid);
  };

  // Handle redeem voucher
  const handleRedeemVoucher = async () => {
    if (!user || !promoCode) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const result = await FirestoreService.validateVoucher(promoCode);
      if (!result.valid || !result.voucher) {
        setPromoError(result.error || (language === 'th' ? 'รหัสไม่ถูกต้อง' : 'Invalid code'));
        return;
      }
      const voucher = result.voucher;
      await FirestoreService.assignVoucherToUser(user.uid, {
        code: voucher.code,
        discount: (voucher as any).discount || `${voucher.discountValue}${voucher.discountType === 'percentage' ? '%' : '฿'}`,
        discountType: voucher.discountType,
        discountValue: voucher.discountValue,
        description: (voucher as any).description || '',
        expiresAt: (voucher.expiresAt as any)?.toDate?.() || new Date(voucher.expiresAt as any),
        minPurchase: voucher.minPurchase
      });
      setPromoCode('');
      setShowVoucherModal(false);
    } catch (err: any) {
      setPromoError(err.message || (language === 'th' ? 'เกิดข้อผิดพลาด' : 'An error occurred'));
    } finally {
      setPromoLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  // Handle back
  const handleBack = () => {
    router.back();
  };

  // Navigate to pages
  const navigateTo = (path: string) => {
    router.push(path);
  };

  // ========== HELPER FUNCTIONS ==========

  // Get user initials
  const getInitials = () => {
    if (user?.displayName) {
      return user.displayName.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return '?';
  };

  // Get display name
  const getDisplayName = () => {
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split('@')[0];
    return language === 'th' ? 'ผู้ใช้' : 'User';
  };

  // Get location icon
  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'home': return '🏠';
      case 'work': return '🏢';
      case 'airport': return '✈️';
      default: return '📍';
    }
  };

  // Unread notifications count
  const unreadCount = userNotifications.filter(n => !n.read && !n.isRead).length;

  // Menu items
  const menuItems = [
    {
      id: 'trips',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: language === 'th' ? 'ประวัติการเดินทาง' : 'Trip History',
      desc: language === 'th' ? 'ดูรายการเดินทางทั้งหมด' : 'View all trips',
      badge: stats.totalBookings > 0 ? String(stats.totalBookings) : undefined,
      path: '/vehicles-test1-history',
    },
    {
      id: 'payment',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      label: language === 'th' ? 'วิธีชำระเงิน' : 'Payment Methods',
      desc: language === 'th' ? 'บัตรเครดิต, PromptPay' : 'Credit card, PromptPay',
      path: '/payment',
    },
    {
      id: 'vouchers',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      label: language === 'th' ? 'โค้ดส่วนลด' : 'Promo Codes',
      desc: `${vouchers.length} ${language === 'th' ? 'คูปอง' : 'coupons'}`,
      badge: vouchers.length > 0 ? String(vouchers.length) : undefined,
      badgeColor: 'bg-orange-500',
      action: () => setShowVoucherModal(true),
    },
    {
      id: 'favorites',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      label: language === 'th' ? 'สถานที่โปรด' : 'Saved Places',
      desc: `${savedLocations.length} ${language === 'th' ? 'สถานที่' : 'places'}`,
      badge: savedLocations.length > 0 ? String(savedLocations.length) : undefined,
      action: () => setShowAddLocation(true),
    },
  ];

  const settingsItems = [
    {
      id: 'notifications',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      label: language === 'th' ? 'การแจ้งเตือน' : 'Notifications',
      toggle: true,
      enabled: true,
      badge: unreadCount > 0 ? String(unreadCount) : undefined,
    },
    {
      id: 'language',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
      ),
      label: language === 'th' ? 'ภาษา' : 'Language',
      value: language === 'th' ? 'ไทย' : 'English',
    },
    {
      id: 'privacy',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      label: language === 'th' ? 'ความเป็นส่วนตัว' : 'Privacy',
    },
    {
      id: 'help',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: language === 'th' ? 'ช่วยเหลือ' : 'Help',
    },
  ];

  // ========== UI RENDERING ==========

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
          <header className="sticky top-0 z-40 bg-white">
            <div className="px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 flex items-center">
              <button
                onClick={handleBack}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 active:scale-95 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="ml-4 text-lg font-bold text-gray-900">
                {language === 'th' ? 'โปรไฟล์' : 'Profile'}
              </h1>
            </div>
          </header>
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {language === 'th' ? 'ยังไม่ได้เข้าสู่ระบบ' : 'Not logged in'}
            </h2>
            <p className="text-gray-500 text-center mb-8">
              {language === 'th' ? 'กรุณาเข้าสู่ระบบเพื่อดูโปรไฟล์ของคุณ' : 'Please log in to view your profile'}
            </p>
            <button
              onClick={() => router.push('/login')}
              className="w-full max-w-xs h-14 rounded-2xl bg-gray-900 text-white font-bold text-lg hover:bg-gray-800 active:scale-[0.98] transition-all"
            >
              {language === 'th' ? 'เข้าสู่ระบบ' : 'Log In'}
            </button>
            <button
              onClick={() => router.push('/register')}
              className="w-full max-w-xs h-14 rounded-2xl border-2 border-gray-300 text-gray-700 font-bold text-lg mt-3 hover:bg-gray-50 active:scale-[0.98] transition-all"
            >
              {language === 'th' ? 'สมัครสมาชิก' : 'Sign Up'}
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
        <header className="sticky top-0 z-40 bg-white">
          <div className="px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 active:scale-95 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-gray-900">
              {language === 'th' ? 'โปรไฟล์' : 'Profile'}
            </h1>
            <button
              onClick={() => setIsEditingProfile(true)}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 active:scale-95 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </header>

        {/* ===== SCROLLABLE CONTENT ===== */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-4 pb-8">

            {/* ----- Profile Card ----- */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 mb-6 relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
              </div>

              <div className="relative">
                {/* Avatar & Info */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Profile"
                        className="w-20 h-20 rounded-2xl object-cover shadow-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                        {getInitials()}
                      </div>
                    )}
                    <label htmlFor="profilePhotoUpload" className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:bg-gray-100 transition-colors">
                      {uploadingPhoto ? (
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                      <input
                        type="file"
                        id="profilePhotoUpload"
                        name="profilePhotoUpload"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                        disabled={uploadingPhoto}
                      />
                    </label>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-white truncate">{getDisplayName()}</h2>
                    <p className="text-gray-400 text-sm truncate">{user.email}</p>
                    {(user.phoneNumber || preferences.phone) && (
                      <p className="text-gray-400 text-sm">{user.phoneNumber || preferences.phone}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/10 rounded-2xl p-3 text-center">
                    <p className="text-2xl font-bold text-white">{stats.completedTrips}</p>
                    <p className="text-xs text-gray-400">{language === 'th' ? 'เที่ยว' : 'Trips'}</p>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-3 text-center">
                    <p className="text-2xl font-bold text-white flex items-center justify-center gap-1">
                      4.9
                      <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </p>
                    <p className="text-xs text-gray-400">{language === 'th' ? 'คะแนน' : 'Rating'}</p>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-3 text-center">
                    <p className="text-2xl font-bold text-white">{memberSince || '-'}</p>
                    <p className="text-xs text-gray-400">{language === 'th' ? 'ปี' : 'Years'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ----- Quick Actions (Saved Places) ----- */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {savedLocations.slice(0, 3).map((loc, i) => (
                <button
                  key={loc.id}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md active:scale-95 transition-all"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                    loc.type === 'home' ? 'bg-blue-50 text-blue-600' :
                    loc.type === 'work' ? 'bg-purple-50 text-purple-600' :
                    loc.type === 'airport' ? 'bg-orange-50 text-orange-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {getLocationIcon(loc.type)}
                  </div>
                  <span className="text-xs font-medium text-gray-700 truncate w-full text-center">{loc.name}</span>
                </button>
              ))}
              <button
                onClick={() => setShowAddLocation(true)}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md active:scale-95 transition-all"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-gray-100 text-gray-600">
                  ➕
                </div>
                <span className="text-xs font-medium text-gray-700">{language === 'th' ? 'เพิ่ม' : 'Add'}</span>
              </button>
            </div>

            {/* ----- Menu Section ----- */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">
                {language === 'th' ? 'บัญชีของฉัน' : 'My Account'}
              </h3>
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {menuItems.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => item.action ? item.action() : item.path && navigateTo(item.path)}
                    className={`w-full flex items-center gap-4 p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors ${
                      index !== menuItems.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">
                      {item.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                    {item.badge && (
                      <span className={`px-2 py-1 rounded-full text-xs font-bold text-white ${item.badgeColor || 'bg-blue-500'}`}>
                        {item.badge}
                      </span>
                    )}
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            {/* ----- Settings Section ----- */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">
                {language === 'th' ? 'ตั้งค่า' : 'Settings'}
              </h3>
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {settingsItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 p-4 ${
                      index !== settingsItems.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 relative">
                      {item.icon}
                      {item.badge && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{item.label}</p>
                    </div>
                    {item.toggle ? (
                      <button
                        onClick={() => setNotifications(!notifications)}
                        className={`w-12 h-7 rounded-full transition-colors ${
                          notifications ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform mx-1 ${
                          notifications ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    ) : item.value ? (
                      <div className="flex bg-gray-100 rounded-lg p-0.5">
                        <button
                          onClick={() => setLanguage('th')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${language === 'th' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
                        >
                          TH
                        </button>
                        <button
                          onClick={() => setLanguage('en')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${language === 'en' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
                        >
                          EN
                        </button>
                      </div>
                    ) : (
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ----- Logout Button ----- */}
            <button
              onClick={handleLogout}
              className="w-full p-4 rounded-2xl border-2 border-red-200 bg-red-50 text-red-600 font-semibold flex items-center justify-center gap-2 hover:bg-red-100 active:scale-[0.98] transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {language === 'th' ? 'ออกจากระบบ' : 'Log Out'}
            </button>

            {/* ----- App Version ----- */}
            <p className="text-center text-gray-400 text-xs mt-6 pb-20">
              TukTik v1.0.0 • Made with ❤️ in Thailand
            </p>

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
              ), label: language === 'th' ? 'ประวัติ' : 'History', active: false },
              { id: 'promo', path: '/vehicles-test1-dashboard', icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              ), label: language === 'th' ? 'โปรโมชั่น' : 'Promo', active: false },
              { id: 'profile', path: '/vehicles-test1-profile', icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              ), label: language === 'th' ? 'โปรไฟล์' : 'Profile', active: true },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => navigateTo(item.path)}
                className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${
                  item.active
                    ? 'text-blue-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {item.icon}
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* ===== MODALS ===== */}

        {/* Edit Profile Modal */}
        {isEditingProfile && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
            <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl p-5">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                {language === 'th' ? 'แก้ไขโปรไฟล์' : 'Edit Profile'}
              </h3>
              <div className="space-y-3">
                <div>
                  <label htmlFor="editDisplayName" className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'th' ? 'ชื่อ' : 'Name'}
                  </label>
                  <input
                    type="text"
                    id="editDisplayName"
                    name="editDisplayName"
                    autoComplete="name"
                    value={profileForm.displayName}
                    onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500"
                    placeholder={language === 'th' ? 'ชื่อของคุณ' : 'Your name'}
                  />
                </div>
                <div>
                  <label htmlFor="editPhone" className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'th' ? 'เบอร์โทร' : 'Phone'}
                  </label>
                  <input
                    type="tel"
                    id="editPhone"
                    name="editPhone"
                    autoComplete="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500"
                    placeholder="0xx-xxx-xxxx"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium"
                  >
                    {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-50"
                  >
                    {saving ? (language === 'th' ? 'กำลังบันทึก...' : 'Saving...') : (language === 'th' ? 'บันทึก' : 'Save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Location Modal */}
        {showAddLocation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
            <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl p-5">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                {language === 'th' ? 'เพิ่มสถานที่' : 'Add Location'}
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  id="newLocationName"
                  name="newLocationName"
                  autoComplete="off"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500"
                  placeholder={language === 'th' ? 'ชื่อสถานที่ (เช่น บ้าน)' : 'Location name (e.g., Home)'}
                />
                <input
                  type="text"
                  id="newLocationAddress"
                  name="newLocationAddress"
                  autoComplete="street-address"
                  value={newLocation.address}
                  onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500"
                  placeholder={language === 'th' ? 'ที่อยู่' : 'Address'}
                />
                <div className="flex gap-2">
                  {(['home', 'work', 'airport', 'other'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setNewLocation({ ...newLocation, type })}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium ${
                        newLocation.type === type
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {type === 'home' ? (language === 'th' ? 'บ้าน' : 'Home') :
                       type === 'work' ? (language === 'th' ? 'ที่ทำงาน' : 'Work') :
                       type === 'airport' ? (language === 'th' ? 'สนามบิน' : 'Airport') :
                       (language === 'th' ? 'อื่นๆ' : 'Other')}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowAddLocation(false)}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium"
                  >
                    {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleAddLocation}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium"
                  >
                    {language === 'th' ? 'เพิ่ม' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Voucher Modal */}
        {showVoucherModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl p-5">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                {language === 'th' ? 'ใส่รหัสคูปอง' : 'Enter Promo Code'}
              </h3>
              <input
                type="text"
                id="voucherPromoCode"
                name="voucherPromoCode"
                autoComplete="off"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-center text-lg font-mono outline-none mb-2"
                placeholder="XXXXX"
              />
              {promoError && <p className="text-red-500 text-sm mb-2">{promoError}</p>}

              {/* Show existing vouchers */}
              {vouchers.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-2">{language === 'th' ? 'คูปองของคุณ:' : 'Your vouchers:'}</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {vouchers.map(v => (
                      <div key={v.id} className="flex items-center justify-between p-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                        <div>
                          <p className="font-bold text-amber-700 text-sm">{v.discount}</p>
                          <p className="text-xs text-gray-500">{v.code}</p>
                        </div>
                        <span className="text-amber-500">🎟️</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => { setShowVoucherModal(false); setPromoError(''); }}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium"
                >
                  {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  onClick={handleRedeemVoucher}
                  disabled={promoLoading || !promoCode}
                  className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl font-medium disabled:opacity-50"
                >
                  {promoLoading ? (language === 'th' ? 'กำลังตรวจสอบ...' : 'Checking...') : (language === 'th' ? 'ใช้คูปอง' : 'Apply')}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
