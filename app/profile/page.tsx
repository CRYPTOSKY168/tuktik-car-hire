'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { FirestoreService } from '@/lib/firebase/firestore';
import { StorageService } from '@/lib/firebase/storage';
import { updateProfile } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  const { user, loading, signOut } = useAuth();
  const { language, setLanguage } = useLanguage();
  const router = useRouter();

  // Data states
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [notifications, setNotifications] = useState<ProfileNotification[]>([]);
  const [vouchers, setVouchers] = useState<UserVoucher[]>([]);
  const [preferences, setPreferences] = useState<any>({});

  // UI states
  const [activeSection, setActiveSection] = useState<string | null>(null);
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

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  // Fetch data
  useEffect(() => {
    if (!user) return;

    const unsubscribers: (() => void)[] = [];

    unsubscribers.push(
      FirestoreService.subscribeToUserSavedLocations(user.uid, setSavedLocations)
    );
    unsubscribers.push(
      FirestoreService.subscribeToUserNotifications(user.uid, (data) => setNotifications(data as ProfileNotification[]))
    );
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

    FirestoreService.getUserPreferences(user.uid).then(setPreferences);

    return () => unsubscribers.forEach(u => u());
  }, [user]);

  // Init profile form
  useEffect(() => {
    if (user) {
      setProfileForm({
        displayName: user.displayName || '',
        phone: preferences.phone || ''
      });
    }
  }, [user, preferences]);

  // Handlers
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingPhoto(true);
    try {
      const url = await StorageService.uploadProfileImage(file, user.uid);
      await updateProfile(user, { photoURL: url });
      window.location.reload();
    } catch (err) {
      alert('ไม่สามารถอัปโหลดรูปได้');
    } finally {
      setUploadingPhoto(false);
    }
  };

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
      alert('ไม่สามารถบันทึกได้');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLocation = async () => {
    if (!user || !newLocation.name || !newLocation.address) return;
    try {
      await FirestoreService.addUserSavedLocation(user.uid, newLocation);
      setShowAddLocation(false);
      setNewLocation({ name: '', address: '', type: 'home' });
    } catch (err) {
      alert('ไม่สามารถเพิ่มสถานที่ได้');
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!user || !confirm('ลบสถานที่นี้?')) return;
    await FirestoreService.deleteUserSavedLocation(user.uid, id);
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await FirestoreService.markAllNotificationsAsRead(user.uid);
  };

  const handleRedeemVoucher = async () => {
    if (!user || !promoCode) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const result = await FirestoreService.validateVoucher(promoCode);
      if (!result.valid || !result.voucher) {
        setPromoError(result.error || 'รหัสไม่ถูกต้อง');
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
      setPromoError(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setPromoLoading(false);
    }
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'home': return 'home';
      case 'work': return 'work';
      case 'airport': return 'flight';
      default: return 'location_on';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
              <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">arrow_back</span>
            </button>
            <h1 className="text-lg font-bold text-gray-800 dark:text-white">โปรไฟล์</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
          <div className="px-4 pb-4 -mt-10">
            <div className="relative w-20 h-20 mb-3">
              <div className="w-full h-full rounded-2xl bg-white dark:bg-gray-700 p-1 shadow-lg">
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    user.displayName?.charAt(0) || user.email?.charAt(0).toUpperCase()
                  )}
                </div>
              </div>
              <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer shadow-lg">
                <span className="material-symbols-outlined text-white text-sm">photo_camera</span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
              </label>
            </div>

            {isEditingProfile ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={profileForm.displayName}
                  onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-blue-500"
                  placeholder="ชื่อ"
                />
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:border-blue-500"
                  placeholder="เบอร์โทร"
                />
                <div className="flex gap-2">
                  <button onClick={() => setIsEditingProfile(false)} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-medium text-sm">
                    ยกเลิก
                  </button>
                  <button onClick={handleSaveProfile} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-medium text-sm">
                    {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-gray-800 dark:text-white text-lg">{user.displayName || 'สมาชิก'}</h2>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    {preferences.phone && <p className="text-sm text-gray-500">{preferences.phone}</p>}
                  </div>
                  <button onClick={() => setIsEditingProfile(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">
                    <span className="material-symbols-outlined text-gray-400">edit</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Menu Items */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm divide-y divide-gray-100 dark:divide-gray-700">

          {/* Saved Locations */}
          <div>
            <button
              onClick={() => setActiveSection(activeSection === 'locations' ? null : 'locations')}
              className="w-full flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-600">bookmark</span>
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-800 dark:text-white">สถานที่บันทึกไว้</p>
                  <p className="text-xs text-gray-500">{savedLocations.length} สถานที่</p>
                </div>
              </div>
              <span className={`material-symbols-outlined text-gray-400 transition-transform ${activeSection === 'locations' ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>
            {activeSection === 'locations' && (
              <div className="px-4 pb-4 space-y-2">
                {savedLocations.map(loc => (
                  <div key={loc.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <span className="material-symbols-outlined text-gray-500">{getLocationIcon(loc.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 dark:text-white text-sm">{loc.name}</p>
                      <p className="text-xs text-gray-500 truncate">{loc.address}</p>
                    </div>
                    <button onClick={() => handleDeleteLocation(loc.id)} className="p-1 text-red-500">
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                ))}
                <button onClick={() => setShowAddLocation(true)} className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600">
                  <span className="material-symbols-outlined text-lg">add</span>
                  เพิ่มสถานที่
                </button>
              </div>
            )}
          </div>

          {/* Vouchers */}
          <div>
            <button
              onClick={() => setActiveSection(activeSection === 'vouchers' ? null : 'vouchers')}
              className="w-full flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-600">confirmation_number</span>
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-800 dark:text-white">คูปองของฉัน</p>
                  <p className="text-xs text-gray-500">{vouchers.length} ใบ</p>
                </div>
              </div>
              <span className={`material-symbols-outlined text-gray-400 transition-transform ${activeSection === 'vouchers' ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>
            {activeSection === 'vouchers' && (
              <div className="px-4 pb-4 space-y-2">
                {vouchers.length > 0 ? vouchers.map(v => (
                  <div key={v.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                    <div>
                      <p className="font-bold text-amber-700 dark:text-amber-400">{v.discount}</p>
                      <p className="text-xs text-gray-500">รหัส: {v.code}</p>
                    </div>
                    <span className="material-symbols-outlined text-amber-500">redeem</span>
                  </div>
                )) : (
                  <p className="text-center text-sm text-gray-500 py-4">ยังไม่มีคูปอง</p>
                )}
                <button onClick={() => setShowVoucherModal(true)} className="w-full flex items-center justify-center gap-2 p-3 bg-amber-500 text-white rounded-xl font-medium">
                  <span className="material-symbols-outlined text-lg">add</span>
                  ใส่รหัสคูปอง
                </button>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div>
            <button
              onClick={() => setActiveSection(activeSection === 'notifications' ? null : 'notifications')}
              className="w-full flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center relative">
                  <span className="material-symbols-outlined text-purple-600">notifications</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-800 dark:text-white">การแจ้งเตือน</p>
                  <p className="text-xs text-gray-500">{unreadCount > 0 ? `${unreadCount} ยังไม่อ่าน` : 'อ่านแล้วทั้งหมด'}</p>
                </div>
              </div>
              <span className={`material-symbols-outlined text-gray-400 transition-transform ${activeSection === 'notifications' ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>
            {activeSection === 'notifications' && (
              <div className="px-4 pb-4 space-y-2">
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-sm text-blue-600 font-medium mb-2">
                    อ่านทั้งหมด
                  </button>
                )}
                {notifications.length > 0 ? notifications.slice(0, 5).map(n => (
                  <div key={n.id} className={`p-3 rounded-xl ${n.read ? 'bg-gray-50 dark:bg-gray-700' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                    <p className="font-medium text-gray-800 dark:text-white text-sm">{n.title}</p>
                    <p className="text-xs text-gray-500">{n.message}</p>
                  </div>
                )) : (
                  <p className="text-center text-sm text-gray-500 py-4">ไม่มีการแจ้งเตือน</p>
                )}
              </div>
            )}
          </div>

          {/* Language */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600">translate</span>
              </div>
              <p className="font-medium text-gray-800 dark:text-white">ภาษา</p>
            </div>
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
              <button
                onClick={() => setLanguage('th')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${language === 'th' ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500'}`}
              >
                TH
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${language === 'en' ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500'}`}
              >
                EN
              </button>
            </div>
          </div>
        </div>

        {/* Help & Logout */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm divide-y divide-gray-100 dark:divide-gray-700">
          <Link href="/contact" className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-cyan-600">help</span>
            </div>
            <p className="font-medium text-gray-800 dark:text-white">ช่วยเหลือ</p>
            <span className="material-symbols-outlined text-gray-400 ml-auto">chevron_right</span>
          </Link>
          <button onClick={() => signOut()} className="w-full flex items-center gap-3 p-4">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-red-600">logout</span>
            </div>
            <p className="font-medium text-red-600">ออกจากระบบ</p>
          </button>
        </div>

        {/* App Version */}
        <p className="text-center text-xs text-gray-400 pt-4">TukTik v1.0.0</p>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-around py-2">
          <Link href="/dashboard" className="flex flex-col items-center gap-0.5 px-6 py-2 text-gray-400">
            <span className="material-symbols-outlined text-xl">home</span>
            <span className="text-[10px] font-medium">หน้าหลัก</span>
          </Link>
          <Link href="/vehicles" className="flex flex-col items-center gap-0.5 px-6 py-2 -mt-6">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/40">
              <span className="material-symbols-outlined text-white text-2xl">add</span>
            </div>
          </Link>
          <button className="flex flex-col items-center gap-0.5 px-6 py-2 text-blue-600">
            <span className="material-symbols-outlined text-xl">person</span>
            <span className="text-[10px] font-medium">โปรไฟล์</span>
          </button>
        </div>
      </div>

      {/* Add Location Modal */}
      {showAddLocation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white dark:bg-gray-800 w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl p-5">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">เพิ่มสถานที่</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newLocation.name}
                onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none"
                placeholder="ชื่อสถานที่ (เช่น บ้าน)"
              />
              <input
                type="text"
                value={newLocation.address}
                onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none"
                placeholder="ที่อยู่"
              />
              <div className="flex gap-2">
                {(['home', 'work', 'airport', 'other'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setNewLocation({ ...newLocation, type })}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium ${newLocation.type === type ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                  >
                    {type === 'home' ? 'บ้าน' : type === 'work' ? 'ที่ทำงาน' : type === 'airport' ? 'สนามบิน' : 'อื่นๆ'}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAddLocation(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-medium">
                  ยกเลิก
                </button>
                <button onClick={handleAddLocation} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium">
                  เพิ่ม
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voucher Modal */}
      {showVoucherModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-5">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">ใส่รหัสคูปอง</h3>
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-center text-lg font-mono outline-none mb-2"
              placeholder="XXXXX"
            />
            {promoError && <p className="text-red-500 text-sm mb-2">{promoError}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setShowVoucherModal(false); setPromoError(''); }} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-medium">
                ยกเลิก
              </button>
              <button onClick={handleRedeemVoucher} disabled={promoLoading || !promoCode} className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl font-medium disabled:opacity-50">
                {promoLoading ? 'กำลังตรวจสอบ...' : 'ใช้คูปอง'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
